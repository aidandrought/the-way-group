import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebaseConfig";
import type { AppState, Check, Table, StatusColor } from "../types";

const TABLE_NUMBERS = [
  1, 2, 3, 4, 5, 6, 10, 11, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34,
  40, 41, 43, 44, 50, 51, 53, 54, 60, 61, 62, 63, 64, 70, 71, 72, 73, 74, 75, 76, 77, 78,
];
const CACHE_KEY = "appState:v1";
const DEVICE_ID_KEY = "deviceId:v1";
const DEFAULT_TABLES: Table[] = TABLE_NUMBERS.map((tableNumber) => ({
  id: `table-${tableNumber}`,
  tableNumber,
}));
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

type AppContextType = {
  state: AppState;
  loading: boolean;
  error: string | null;
  checksLoaded: boolean;
  tablesLoaded: boolean;
  seeding: boolean;
  seedFirestore: () => Promise<void>;
  assignCheckToTable: (checkId: string, tableId: string) => Promise<void>;
  clearCheck: (checkId: string) => Promise<void>;
  clearTable: (tableId: string) => Promise<void>;
  assignMultipleChecksToTable: (checkIds: string[], tableId: string) => Promise<void>;
  clearAllAssignments: () => Promise<void>;
  setCheckColor: (checkId: string, color: StatusColor) => Promise<void>;
  setTableColor: (tableId: string, color: StatusColor) => Promise<void>;
  setSelectedCheck: (check: Check | null) => void;
  setSelectedTable: (table: Table | null) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    checks: DEFAULT_CHECKS,
    tables: DEFAULT_TABLES,
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

  useEffect(() => {
    let mounted = true;

    const loadCachedState = async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as Partial<AppState> | null;
        if (!parsed) return;
        setState(prev => ({
          ...prev,
          checks: parsed.checks ?? prev.checks,
          tables: parsed.tables ?? prev.tables,
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
  }, []);

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

    const checksQuery = query(collection(db, "checks"), orderBy("checkNumber", "asc"));
    const tablesQuery = query(collection(db, "tables"), orderBy("tableNumber", "asc"));

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
        setState(prev => ({ ...prev, tables }));
        setTablesLoaded(true);
      },
      (err) => {
        console.error("tables snapshot error", err);
        setError(`tables: ${err.message}`);
        setTablesLoaded(true);
      }
    );

    return () => {
      unsubChecks();
      unsubTables();
    };
  }, []);

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

    if (state.tables.length === 0 && state.checks.length === 0) {
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
    });
    AsyncStorage.setItem(CACHE_KEY, payload).catch((err) => {
      console.warn("cache write failed", err);
    });
  }, [state.checks, state.tables, hydrated]);

  async function seedFirestore() {
    const batch = writeBatch(db);

    for (const n of TABLE_NUMBERS) {
      batch.set(doc(db, "tables", `table-${n}`), { tableNumber: n }, { merge: true });
    }

    for (let i = 1; i <= 100; i++) {
      batch.set(doc(db, "checks", `check-${i}`), { checkNumber: i }, { merge: true });
    }

    await batch.commit();
  }

  async function assignCheckToTable(checkId: string, tableId: string) {
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
      doc(db, "checks", checkId),
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
      doc(db, "checks", checkId),
      { tableId: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
      { merge: true }
    );
    await batch.commit();
  }

  async function assignMultipleChecksToTable(checkIds: string[], tableId: string) {
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
        doc(db, "checks", checkId),
        { tableId, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
        { merge: true }
      );
    });
    await batch.commit();
  }

  async function clearTable(tableId: string) {
    setState(prev => ({
      ...prev,
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
          doc(db, "checks", check.id),
          { tableId: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
          { merge: true }
        );
      });
    await batch.commit();
  }

  async function clearAllAssignments() {
    setState(prev => ({
      ...prev,
      checks: prev.checks.map(check => ({ ...check, tableId: null, color: undefined })),
      tables: prev.tables.map(table => ({ ...table, color: undefined })),
    }));

    const batch = writeBatch(db);
    state.checks.forEach(check => {
      batch.set(
        doc(db, "checks", check.id),
        { tableId: null, color: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
        { merge: true }
      );
    });
    state.tables.forEach(table => {
      batch.set(
        doc(db, "tables", table.id),
        { color: null, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
        { merge: true }
      );
    });
    await batch.commit();
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
      doc(db, "checks", checkId),
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
      doc(db, "tables", tableId),
      { color, updatedAt: serverTimestamp(), updatedByDeviceId: deviceId },
      { merge: true }
    );
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
    seedFirestore,
    assignCheckToTable,
    clearCheck,
    clearTable,
    assignMultipleChecksToTable,
    clearAllAssignments,
    setCheckColor,
    setTableColor,
    setSelectedCheck,
    setSelectedTable,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
