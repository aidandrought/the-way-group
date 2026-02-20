import { getApp, getApps, initializeApp } from "firebase/app";
import {
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAXYU8fx-DB5YESvLmFhJfWeP--2SGaCBQ",
  authDomain: "the-way-group.firebaseapp.com",
  projectId: "the-way-group",
  storageBucket: "the-way-group.firebasestorage.app",
  messagingSenderId: "636688260207",
  appId: "1:636688260207:web:9d8435d97732b36f6c019a",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const baseSettings: Parameters<typeof initializeFirestore>[1] = {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache(),
};
export const db = initializeFirestore(app, baseSettings);

// Auth init disabled for now to avoid early crashes during app bootstrap.
export const auth = null;

if (__DEV__) {
  // @ts-ignore
  console.log("Firebase projectId:", (app.options as any)?.projectId);
}
