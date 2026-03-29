import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebaseConfig";
import type { RestaurantId } from "../constants/restaurants";
import { getTableNumbersForRestaurant } from "../constants/tableLayouts";
import type { AppState, Check, RestaurantChecklistItem, RestaurantNote, Table, StatusColor, TeamAssignment, TeamAssignmentShift } from "../types";
const DEVICE_ID_KEY = "deviceId:v1";
export const NOTE_EXPIRY_MS = 20 * 60 * 60 * 1000;
const DEFAULT_CHECKS: Check[] = Array.from({ length: 100 }, (_, index) => {
  const checkNumber = index + 1;
  return {
    id: `check-${checkNumber}`,
    checkNumber,
    tableId: null,
    updatedAt: null,
    updatedByDeviceId: "local",
  };
});

const buildDefaultTables = (restaurantId: RestaurantId): Table[] =>
  getTableNumbersForRestaurant(restaurantId).map((tableNumber) => ({
    id: `table-${tableNumber}`,
    tableNumber,
  }));

const ensureExpectedTables = (restaurantId: RestaurantId, tables: Table[]): Table[] => {
  const byNumber = new Map<number, Table>();
  tables.forEach((table) => {
    if (!byNumber.has(table.tableNumber)) {
      byNumber.set(table.tableNumber, table);
    }
  });

  getTableNumbersForRestaurant(restaurantId).forEach((tableNumber) => {
    if (!byNumber.has(tableNumber)) {
      byNumber.set(tableNumber, {
        id: `table-${tableNumber}`,
        tableNumber,
      });
    }
  });

  return [...byNumber.values()].sort((a, b) => a.tableNumber - b.tableNumber);
};

type AppContextType = {
  state: AppState;
  loading: boolean;
  error: string | null;
  checksLoaded: boolean;
  tablesLoaded: boolean;
  seeding: boolean;
  restaurantId: RestaurantId;
  seedFirestore: () => Promise<void>;
  assignCheckToTable: (checkId: string, tableId: string) => Promise<void>;
  clearCheck: (checkId: string) => Promise<void>;
  clearTable: (tableId: string) => Promise<void>;
  assignMultipleChecksToTable: (checkIds: string[], tableId: string) => Promise<void>;
  clearAllAssignments: () => Promise<void>;
  pendingRecall: { label: string } | null;
  recallLastClear: () => Promise<void>;
  dismissRecall: () => void;
  setCheckColor: (checkId: string, color: StatusColor) => Promise<void>;
  setTableColor: (tableId: string, color: StatusColor) => Promise<void>;
  createNote: (
    text: string,
    parentId?: string | null,
    subject?: string | null,
    options?: { kind?: "note" | "checklist"; checklistItems?: RestaurantChecklistItem[] }
  ) => Promise<void>;
  updateNote: (
    noteId: string,
    text: string,
    subject?: string | null,
    options?: { kind?: "note" | "checklist"; checklistItems?: RestaurantChecklistItem[] }
  ) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  deleteAllNotes: () => Promise<void>;
  toggleNotePinned: (noteId: string) => Promise<void>;
  toggleNoteChecklistItem: (noteId: string, itemId: string) => Promise<void>;
  createTeamAssignment: (assignment: {
    shift: TeamAssignmentShift;
    role: string;
    teamMember: string;
    inTime: string;
    outTime: string;
    assignedTableIds?: string[];
  }) => Promise<void>;
  updateTeamAssignment: (assignmentId: string, updates: {
    shift: TeamAssignmentShift;
    role: string;
    teamMember: string;
    inTime: string;
    outTime: string;
    assignedTableIds?: string[];
  }) => Promise<void>;
  deleteTeamAssignment: (assignmentId: string) => Promise<void>;
  setSelectedCheck: (check: Check | null) => void;
  setSelectedTable: (table: Table | null) => void;
};

const AppContext = createContext<AppContextType | null>(null);

type RecallState =
  | {
      kind: "clear-table";
      label: string;
      table: Table;
      checks: Check[];
      remainingAssignmentActions: number;
    }
  | {
      kind: "clear-all";
      label: string;
      tables: Table[];
      checks: Check[];
      remainingAssignmentActions: number;
    };

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}

const getCollectionRef = (restaurantId: RestaurantId, collectionName: "checks" | "tables") => {
  // Keep Mill Creek on the current top-level collections to preserve existing production data.
  if (restaurantId === "mill-creek") return collection(db, collectionName);
  return collection(db, "restaurants", restaurantId, collectionName);
};

const getDocRef = (
  restaurantId: RestaurantId,
  collectionName: "checks" | "tables",
  id: string
) => {
  if (restaurantId === "mill-creek") return doc(db, collectionName, id);
  return doc(db, "restaurants", restaurantId, collectionName, id);
};

const getNotesCollectionRef = (restaurantId: RestaurantId) =>
  collection(db, "restaurants", restaurantId, "notes");

const getNoteDocRef = (restaurantId: RestaurantId, id: string) =>
  doc(db, "restaurants", restaurantId, "notes", id);

const getTeamAssignmentsCollectionRef = (restaurantId: RestaurantId) =>
  collection(db, "restaurants", restaurantId, "teamAssignments");

const getTeamAssignmentDocRef = (restaurantId: RestaurantId, id: string) =>
  doc(db, "restaurants", restaurantId, "teamAssignments", id);

const isPermissionDeniedError = (err: unknown) =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code?: string }).code === "permission-denied";

export function AppProvider({
  children,
  restaurantId,
}: {
  children: React.ReactNode;
  restaurantId: RestaurantId;
}) {
  const cacheKey = `appState:${restaurantId}:v1`;
  const [state, setState] = useState<AppState>({
    checks: DEFAULT_CHECKS,
    tables: buildDefaultTables(restaurantId),
    notes: [],
    teamAssignments: [],
    selectedCheck: null,
    selectedTable: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checksLoaded, setChecksLoaded] = useState(false);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [didAutoSeed, setDidAutoSeed] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("unknown");
  const [pendingRecall, setPendingRecall] = useState<RecallState | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCachedState = async () => {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as Partial<AppState> | null;
        if (!parsed) return;
        setState(prev => ({
          ...prev,
          checks: parsed.checks ?? prev.checks,
          tables: parsed.tables ? ensureExpectedTables(restaurantId, parsed.tables) : prev.tables,
          notes: parsed.notes ?? prev.notes,
          teamAssignments: parsed.teamAssignments ?? prev.teamAssignments,
        }));
      } catch (err) {
        console.warn("cache read failed", err);
      } finally {
        if (mounted) setHydrated(true);
      }
    };

    loadCachedState();

    return () => {
      mounted = false;
    };
  }, [cacheKey]);

  useEffect(() => {
    let mounted = true;

    const loadDeviceId = async () => {
      try {
        let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
          id = `device-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
          await AsyncStorage.setItem(DEVICE_ID_KEY, id);
        }
        if (mounted) setDeviceId(id);
      } catch (err) {
        if (mounted) setDeviceId("unknown");
      }
    };

    loadDeviceId();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const checksQuery = query(getCollectionRef(restaurantId, "checks"), orderBy("checkNumber", "asc"));
    const tablesQuery = query(getCollectionRef(restaurantId, "tables"), orderBy("tableNumber", "asc"));
    const notesQuery = query(getNotesCollectionRef(restaurantId), orderBy("createdAtMs", "desc"));
    const teamAssignmentsQuery = query(getTeamAssignmentsCollectionRef(restaurantId), orderBy("createdAtMs", "asc"));

    const unsubChecks = onSnapshot(
      checksQuery,
      (snapshot) => {
        const checks: Check[] = snapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as any),
        }));
        setState(prev => ({ ...prev, checks }));
        setChecksLoaded(true);
      },
      (err) => {
        console.error("checks snapshot error", err);
        setError(`checks: ${err.message}`);
        setChecksLoaded(true);
      }
    );

    const unsubTables = onSnapshot(
      tablesQuery,
      (snapshot) => {
        const tables: Table[] = snapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as any),
        }));
        setState(prev => ({ ...prev, tables: ensureExpectedTables(restaurantId, tables) }));
        setTablesLoaded(true);
      },
      (err) => {
        console.error("tables snapshot error", err);
        setError(`tables: ${err.message}`);
        setTablesLoaded(true);
      }
    );

    const unsubNotes = onSnapshot(
      notesQuery,
      (snapshot) => {
        const notes: RestaurantNote[] = snapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as any),
        }));
        setState(prev => ({ ...prev, notes }));
      },
      (err) => {
        if (isPermissionDeniedError(err)) {
          setState(prev => ({ ...prev, notes: [] }));
          return;
        }
        console.error("notes snapshot error", err);
      }
    );

    const unsubTeamAssignments = onSnapshot(
      teamAssignmentsQuery,
      (snapshot) => {
        const teamAssignments: TeamAssignment[] = snapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as any),
        }));
        setState(prev => ({ ...prev, teamAssignments }));
      },
      (err) => {
        if (isPermissionDeniedError(err)) {
          setState(prev => ({ ...prev, teamAssignments: [] }));
          return;
        }
        console.error("team assignments snapshot error", err);
      }
    );

    return () => {
      unsubChecks();
      unsubTables();
      unsubNotes();
      unsubTeamAssignments();
    };
  }, [restaurantId]);

  useEffect(() => {
    if (error) {
      setLoading(false);
      return;
    }

    setLoading(!(checksLoaded && tablesLoaded));
  }, [checksLoaded, tablesLoaded, error]);

  useEffect(() => {
    if (!checksLoaded || !tablesLoaded) return;
    if (didAutoSeed) return;

    const expectedTableNumbers = getTableNumbersForRestaurant(restaurantId);
    const existingTableNumbers = new Set(state.tables.map(table => table.tableNumber));
    const hasMissingTables = expectedTableNumbers.some(tableNumber => !existingTableNumbers.has(tableNumber));
    const hasMissingChecks = state.checks.length < 100;

    if ((state.tables.length === 0 && state.checks.length === 0) || hasMissingTables || hasMissingChecks) {
      setDidAutoSeed(true);
      setSeeding(true);
      seedFirestore()
        .catch((e) => setError(`seed failed: ${e.message ?? e}`))
        .finally(() => setSeeding(false));
      return;
    }

    setDidAutoSeed(true);
  }, [checksLoaded, tablesLoaded, state.tables.length, state.checks.length, didAutoSeed]);

  useEffect(() => {
    if (!hydrated) return;
    const payload = JSON.stringify({
      checks: state.checks,
      tables: state.tables,
      notes: state.notes,
      teamAssignments: state.teamAssignments,
    });
    AsyncStorage.setItem(cacheKey, payload).catch((err) => {
      console.warn("cache write failed", err);
    });
  }, [state.checks, state.tables, state.notes, state.teamAssignments, hydrated, cacheKey]);

  async function seedFirestore() {
    const batch = writeBatch(db);

    for (const n of getTableNumbersForRestaurant(restaurantId)) {
      batch.set(getDocRef(restaurantId, "tables", `table-${n}`), { tableNumber: n }, { merge: true });
    }

    for (let i = 1; i <= 100; i++) {
      batch.set(getDocRef(restaurantId, "checks", `check-${i}`), { checkNumber: i }, { merge: true });
    }

    await batch.commit();
  }

  async function assignCheckToTable(checkId: string, tableId: string) {
    setPendingRecall(prev =>
      prev
        ? prev.remainingAssignmentActions <= 1
          ? null
          : { ...prev, remainingAssignmentActions: prev.remainingAssignmentActions - 1 }
        : prev
    );

    setState(prev => ({
      ...prev,
      checks: prev.checks.map(check =>
        check.id === checkId
          ? { ...check, tableId }
          : check
      ),
    }));

    const batch = writeBatch(db);
    batch.set(
      getDocRef(restaurantId, "checks", checkId),
      { tableId, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
      { merge: true }
    );
    await batch.commit();
  }

  async function clearCheck(checkId: string) {
    setState(prev => ({
      ...prev,
      checks: prev.checks.map(check =>
        check.id === checkId
          ? { ...check, tableId: null }
          : check
      ),
    }));

    const batch = writeBatch(db);
    batch.set(
      getDocRef(restaurantId, "checks", checkId),
      { tableId: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
      { merge: true }
    );
    await batch.commit();
  }

  async function assignMultipleChecksToTable(checkIds: string[], tableId: string) {
    setPendingRecall(prev =>
      prev
        ? prev.remainingAssignmentActions <= 1
          ? null
          : { ...prev, remainingAssignmentActions: prev.remainingAssignmentActions - 1 }
        : prev
    );

    const idSet = new Set(checkIds);
    setState(prev => ({
      ...prev,
      checks: prev.checks.map(check =>
        idSet.has(check.id)
          ? { ...check, tableId }
          : check
      ),
    }));

    const batch = writeBatch(db);
    checkIds.forEach(checkId => {
      batch.set(
        getDocRef(restaurantId, "checks", checkId),
        { tableId, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
        { merge: true }
      );
    });
    await batch.commit();
  }

  async function clearTable(tableId: string) {
    const targetTable = state.tables.find(table => table.id === tableId);
    const affectedChecks = state.checks.filter(check => check.tableId === tableId);
    if (targetTable) {
      setPendingRecall({
        kind: "clear-table",
        label: `Cleared ${targetTable.tableNumber === 11 && restaurantId === "mill-creek" ? "Patio" : `table ${targetTable.tableNumber}`}`,
        table: { ...targetTable },
        checks: affectedChecks.map(check => ({ ...check })),
        remainingAssignmentActions: 3,
      });
    }

    setState(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.id === tableId
          ? { ...table, color: undefined }
          : table
      ),
      checks: prev.checks.map(check =>
        check.tableId === tableId
          ? { ...check, tableId: null }
          : check
      ),
    }));

    const batch = writeBatch(db);
    state.checks
      .filter(check => check.tableId === tableId)
      .forEach(check => {
        batch.set(
          getDocRef(restaurantId, "checks", check.id),
          { tableId: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
          { merge: true }
        );
      });
    batch.set(
      getDocRef(restaurantId, "tables", tableId),
      { color: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
      { merge: true }
    );
    await batch.commit();
  }

  async function clearAllAssignments() {
    setPendingRecall({
      kind: "clear-all",
      label: "Cleared all assignments",
      tables: state.tables.map(table => ({ ...table })),
      checks: state.checks.map(check => ({ ...check })),
      remainingAssignmentActions: 3,
    });

    setState(prev => ({
      ...prev,
      checks: prev.checks.map(check => ({ ...check, tableId: null, color: undefined })),
      tables: prev.tables.map(table => ({ ...table, color: undefined })),
    }));

    const batch = writeBatch(db);
    state.checks.forEach(check => {
      batch.set(
        getDocRef(restaurantId, "checks", check.id),
        { tableId: null, color: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
        { merge: true }
      );
    });
    state.tables.forEach(table => {
      batch.set(
        getDocRef(restaurantId, "tables", table.id),
        { color: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
        { merge: true }
      );
    });
    await batch.commit();
  }

  async function recallLastClear() {
    if (!pendingRecall) return;

    if (pendingRecall.kind === "clear-table") {
      setState(prev => ({
        ...prev,
        tables: prev.tables.map(table =>
          table.id === pendingRecall.table.id
            ? { ...table, color: pendingRecall.table.color }
            : table
        ),
        checks: prev.checks.map(check => {
          const restored = pendingRecall.checks.find(savedCheck => savedCheck.id === check.id);
          return restored
            ? { ...check, tableId: restored.tableId, color: restored.color }
            : check;
        }),
      }));

      const batch = writeBatch(db);
      batch.set(
        getDocRef(restaurantId, "tables", pendingRecall.table.id),
        {
          color: pendingRecall.table.color ?? null,
          updatedAt: serverTimestamp(),
          updatedByDeviceId: deviceId,
        },
        { merge: true }
      );
      pendingRecall.checks.forEach(check => {
        batch.set(
          getDocRef(restaurantId, "checks", check.id),
          {
            tableId: check.tableId,
            color: check.color ?? null,
            updatedAt: serverTimestamp(),
            updatedByDeviceId: deviceId,
          },
          { merge: true }
        );
      });
      await batch.commit();
      setPendingRecall(null);
      return;
    }

    setState(prev => ({
      ...prev,
      tables: prev.tables.map(table => {
        const restored = pendingRecall.tables.find(savedTable => savedTable.id === table.id);
        return restored
          ? { ...table, color: restored.color }
          : table;
      }),
      checks: prev.checks.map(check => {
        const restored = pendingRecall.checks.find(savedCheck => savedCheck.id === check.id);
        return restored
          ? { ...check, tableId: restored.tableId, color: restored.color }
          : check;
      }),
    }));

    const batch = writeBatch(db);
    pendingRecall.tables.forEach(table => {
      batch.set(
        getDocRef(restaurantId, "tables", table.id),
        {
          color: table.color ?? null,
          updatedAt: serverTimestamp(),
          updatedByDeviceId: deviceId,
        },
        { merge: true }
      );
    });
    pendingRecall.checks.forEach(check => {
      batch.set(
        getDocRef(restaurantId, "checks", check.id),
        {
          tableId: check.tableId,
          color: check.color ?? null,
          updatedAt: serverTimestamp(),
          updatedByDeviceId: deviceId,
        },
        { merge: true }
      );
    });
    await batch.commit();
    setPendingRecall(null);
  }

  function dismissRecall() {
    setPendingRecall(null);
  }

  async function setCheckColor(checkId: string, color: StatusColor) {
    setState(prev => ({
      ...prev,
      checks: prev.checks.map(check =>
        check.id === checkId
          ? { ...check, color }
          : check
      ),
    }));

    const batch = writeBatch(db);
    batch.set(
      getDocRef(restaurantId, "checks", checkId),
      { color, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
      { merge: true }
    );
    await batch.commit();
  }

  async function setTableColor(tableId: string, color: StatusColor) {
    setState(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.id === tableId
          ? { ...table, color }
          : table
      ),
    }));

    const batch = writeBatch(db);
    batch.set(
      getDocRef(restaurantId, "tables", tableId),
      { color, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
      { merge: true }
    );
    await batch.commit();
  }

  async function createNote(
    text: string,
    parentId?: string | null,
    subject?: string | null,
    options?: { kind?: "note" | "checklist"; checklistItems?: RestaurantChecklistItem[] }
  ) {
    const trimmed = text.trim();
    const noteKind = options?.kind === "checklist" ? "checklist" : "note";
    const checklistItems = options?.checklistItems ?? [];
    if (!trimmed && checklistItems.length === 0) return;

    const now = Date.now();
    const noteId = `note-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const normalizedSubject = subject?.trim() ? subject.trim() : null;
    const nextNote: RestaurantNote = {
      id: noteId,
      text: trimmed,
      kind: noteKind,
      subject: normalizedSubject,
      parentId: parentId ?? null,
      pinned: false,
      checklistItems,
      createdAtMs: now,
      updatedAtMs: now,
      expiresAtMs: now + NOTE_EXPIRY_MS,
    };

    setState(prev => ({
      ...prev,
      notes: [nextNote, ...prev.notes],
    }));

    const batch = writeBatch(db);
    batch.set(
      getNoteDocRef(restaurantId, noteId),
      {
        ...nextNote,
        updatedAt: serverTimestamp(),
        updatedByDeviceId: deviceId,
      },
      { merge: true }
    );
    await batch.commit();
  }

  async function updateNote(
    noteId: string,
    text: string,
    subject?: string | null,
    options?: { kind?: "note" | "checklist"; checklistItems?: RestaurantChecklistItem[] }
  ) {
    const trimmed = text.trim();
    const noteKind = options?.kind === "checklist" ? "checklist" : "note";
    const checklistItems = options?.checklistItems ?? [];
    if (!trimmed && checklistItems.length === 0) return;

    const now = Date.now();
    const normalizedSubject = subject?.trim() ? subject.trim() : null;
    setState(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? {
              ...note,
              text: trimmed,
              kind: noteKind,
              subject: normalizedSubject,
              checklistItems,
              updatedAtMs: now,
              expiresAtMs: now + NOTE_EXPIRY_MS,
            }
          : note
      ),
    }));

    const batch = writeBatch(db);
    batch.set(
      getNoteDocRef(restaurantId, noteId),
      {
        text: trimmed,
        kind: noteKind,
        subject: normalizedSubject,
        checklistItems,
        updatedAtMs: now,
        expiresAtMs: now + NOTE_EXPIRY_MS,
        updatedAt: serverTimestamp(),
        updatedByDeviceId: deviceId,
      },
      { merge: true }
    );
    await batch.commit();
  }

  async function deleteNote(noteId: string) {
    const replyIds = state.notes.filter(note => note.parentId === noteId).map(note => note.id);
    const idsToDelete = new Set([noteId, ...replyIds]);

    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(note => !idsToDelete.has(note.id)),
    }));

    const batch = writeBatch(db);
    idsToDelete.forEach(id => {
      batch.delete(getNoteDocRef(restaurantId, id));
    });
    await batch.commit();
  }

  async function deleteAllNotes() {
    setState(prev => ({
      ...prev,
      notes: [],
    }));

    const batch = writeBatch(db);
    state.notes.forEach(note => {
      batch.delete(getNoteDocRef(restaurantId, note.id));
    });
    await batch.commit();
  }

  async function toggleNotePinned(noteId: string) {
    const targetNote = state.notes.find(note => note.id === noteId);
    if (!targetNote) return;

    const now = Date.now();
    const nextPinned = !targetNote.pinned;

    setState(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? { ...note, pinned: nextPinned, updatedAtMs: now, expiresAtMs: now + NOTE_EXPIRY_MS }
          : note
      ),
    }));

    const batch = writeBatch(db);
    batch.set(
      getNoteDocRef(restaurantId, noteId),
      {
        pinned: nextPinned,
        updatedAtMs: now,
        expiresAtMs: now + NOTE_EXPIRY_MS,
        updatedAt: serverTimestamp(),
        updatedByDeviceId: deviceId,
      },
      { merge: true }
    );
    await batch.commit();
  }

  async function toggleNoteChecklistItem(noteId: string, itemId: string) {
    const targetNote = state.notes.find(note => note.id === noteId);
    if (!targetNote?.checklistItems?.length) return;

    const now = Date.now();
    const nextItems = targetNote.checklistItems.map(item =>
      item.id === itemId
        ? {
            ...item,
            checked: !item.checked,
            checkedAtMs: item.checked ? null : now,
          }
        : item
    );

    setState(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? {
              ...note,
              checklistItems: nextItems,
              updatedAtMs: now,
              expiresAtMs: now + NOTE_EXPIRY_MS,
            }
          : note
      ),
    }));

    const batch = writeBatch(db);
    batch.set(
      getNoteDocRef(restaurantId, noteId),
      {
        checklistItems: nextItems,
        updatedAtMs: now,
        expiresAtMs: now + NOTE_EXPIRY_MS,
        updatedAt: serverTimestamp(),
        updatedByDeviceId: deviceId,
      },
      { merge: true }
    );
    await batch.commit();
  }

  async function createTeamAssignment(assignment: {
    shift: TeamAssignmentShift;
    role: string;
    teamMember: string;
    inTime: string;
    outTime: string;
    assignedTableIds?: string[];
  }) {
    const role = assignment.role.trim();
    const teamMember = assignment.teamMember.trim();
    const inTime = assignment.inTime.trim();
    const outTime = assignment.outTime.trim();
    if (!role || !teamMember || !inTime || !outTime) return;

    const now = Date.now();
    const assignmentId = `assignment-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const nextAssignment: TeamAssignment = {
      id: assignmentId,
      shift: assignment.shift,
      role,
      teamMember,
      inTime,
      outTime,
      assignedTableIds: assignment.assignedTableIds ?? [],
      createdAtMs: now,
      updatedAtMs: now,
    };

    setState(prev => ({
      ...prev,
      teamAssignments: [...prev.teamAssignments, nextAssignment],
    }));

    const batch = writeBatch(db);
    batch.set(
      getTeamAssignmentDocRef(restaurantId, assignmentId),
      {
        ...nextAssignment,
        updatedAt: serverTimestamp(),
        updatedByDeviceId: deviceId,
      },
      { merge: true }
    );
    await batch.commit();
  }

  async function updateTeamAssignment(assignmentId: string, updates: {
    shift: TeamAssignmentShift;
    role: string;
    teamMember: string;
    inTime: string;
    outTime: string;
    assignedTableIds?: string[];
  }) {
    const role = updates.role.trim();
    const teamMember = updates.teamMember.trim();
    const inTime = updates.inTime.trim();
    const outTime = updates.outTime.trim();
    if (!role || !teamMember || !inTime || !outTime) return;

    const now = Date.now();
    setState(prev => ({
      ...prev,
      teamAssignments: prev.teamAssignments.map(assignment =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              shift: updates.shift,
              role,
              teamMember,
              inTime,
              outTime,
              assignedTableIds: updates.assignedTableIds ?? [],
              updatedAtMs: now,
            }
          : assignment
      ),
    }));

    const batch = writeBatch(db);
    batch.set(
      getTeamAssignmentDocRef(restaurantId, assignmentId),
      {
        shift: updates.shift,
        role,
        teamMember,
        inTime,
        outTime,
        assignedTableIds: updates.assignedTableIds ?? [],
        updatedAtMs: now,
        updatedAt: serverTimestamp(),
        updatedByDeviceId: deviceId,
      },
      { merge: true }
    );
    await batch.commit();
  }

  async function deleteTeamAssignment(assignmentId: string) {
    setState(prev => ({
      ...prev,
      teamAssignments: prev.teamAssignments.filter(assignment => assignment.id !== assignmentId),
    }));

    const batch = writeBatch(db);
    batch.delete(getTeamAssignmentDocRef(restaurantId, assignmentId));
    await batch.commit();
  }

  const setSelectedCheck = (check: Check | null) => {
    setState(prev => ({ ...prev, selectedCheck: check }));
  };

  const setSelectedTable = (table: Table | null) => {
    setState(prev => ({ ...prev, selectedTable: table }));
  };

  const value: AppContextType = {
    state,
    loading,
    error,
    checksLoaded,
    tablesLoaded,
    seeding,
    restaurantId,
    seedFirestore,
    assignCheckToTable,
    clearCheck,
    clearTable,
    assignMultipleChecksToTable,
    clearAllAssignments,
    pendingRecall: pendingRecall ? { label: pendingRecall.label } : null,
    recallLastClear,
    dismissRecall,
    setCheckColor,
    setTableColor,
    createNote,
    updateNote,
    deleteNote,
    deleteAllNotes,
    toggleNotePinned,
    toggleNoteChecklistItem,
    createTeamAssignment,
    updateTeamAssignment,
    deleteTeamAssignment,
    setSelectedCheck,
    setSelectedTable,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
