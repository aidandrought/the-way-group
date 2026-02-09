// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAXYU8fx-DB5YESvLmFhJfWeP--2SGaCBQ",
  authDomain: "the-way-group.firebaseapp.com",
  projectId: "the-way-group",
  storageBucket: "the-way-group.firebasestorage.app",
  messagingSenderId: "636688260207",
  appId: "1:636688260207:web:9d8435d97732b36f6c019a",
  measurementId: "G-1JLS9V8J3T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);