// firebase.js
// შეავსე შენი Firebase პროექტის მონაცემებით
// https://console.firebase.google.com -> Project Settings -> Your apps -> Web app

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAwqcn2aVx2ykfqN2zpZwgZRACpAzRY3t4",
  authDomain: "truck-manager-52915.firebaseapp.com",
  projectId: "truck-manager-52915",
  storageBucket: "truck-manager-52915.firebasestorage.app",
  messagingSenderId: "705975781896",
  appId: "1:705975781896:web:9685a43b5133f298521fbd",
  measurementId: "G-GHYCPYEV0W"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
