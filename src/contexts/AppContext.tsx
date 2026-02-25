import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebaseConfig";
import type { RestaurantId } from "../constants/restaurants";
import { getTableNumbersForRestaurant } from "../constants/tableLayouts";
import type { AppState, Check, Table, StatusColor } from "../types";
const DEVICE_ID_KEY = "deviceId:v1";
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
        const raw = await AsyncStorage.getItem(cacheKey);
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
    });
    AsyncStorage.setItem(cacheKey, payload).catch((err) => {
      console.warn("cache write failed", err);
    });
  }, [state.checks, state.tables, hydrated, cacheKey]);

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
    setCheckColor,
    setTableColor,
    setSelectedCheck,
    setSelectedTable,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
