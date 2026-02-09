import { getApp, getApps, initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const baseSettings: Parameters<typeof initializeFirestore>[1] = {
  experimentalForceLongPolling: true,
};

let firestoreSettings = baseSettings;

try {
  const tabManagerFactory = persistentMultipleTabManager ?? persistentSingleTabManager;
  if (typeof persistentLocalCache === "function" && typeof tabManagerFactory === "function") {
    firestoreSettings = {
      ...baseSettings,
      localCache: persistentLocalCache({
        tabManager: tabManagerFactory(),
      }),
    };
  }
} catch (err) {
  if (__DEV__) {
    console.log("Firestore persistent cache unavailable:", err);
  }
}

export const db = initializeFirestore(app, firestoreSettings);

// Auth init disabled for now to avoid early crashes during app bootstrap.
export const auth = null;

if (__DEV__) {
  // @ts-ignore
  console.log("Firebase projectId:", (app.options as any)?.projectId);
}
