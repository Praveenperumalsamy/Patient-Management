// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDRM871Xy-Wy1kyA0-9uNoO9pf1gmfsrYM",
  authDomain: "clinic-1c454.firebaseapp.com",
  projectId: "clinic-1c454",
  storageBucket: "clinic-1c454.appspot.com",
  messagingSenderId: "215741970884",
  appId: "1:215741970884:web:a0fc9dc5c995d68acb4c91"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
