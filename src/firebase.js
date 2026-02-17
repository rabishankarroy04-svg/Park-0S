import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCoa3w5mEIJF9c-Iv7oDlpfzK8ehY1c6rA",
  authDomain: "smartparking-d2b9f.firebaseapp.com",
  databaseURL: "https://smartparking-d2b9f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartparking-d2b9f",
  storageBucket: "smartparking-d2b9f.firebasestorage.app",
  messagingSenderId: "237978565830",
  appId: "1:237978565830:web:3649f743256788db646bc7"
};

import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
export default database;
