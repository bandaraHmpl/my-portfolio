// js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwTMbg2FNb_CIslswZNUcdj4FMslkhW6Q",
  authDomain: "my-portfolio-99d2d.firebaseapp.com",
  projectId: "my-portfolio-99d2d",
  storageBucket: "my-portfolio-99d2d.firebasestorage.app",
  messagingSenderId: "411844648997",
  appId: "1:411844648997:web:0e216d75660c5d1df65fcc",
  measurementId: "G-1TRL7DTL94"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);