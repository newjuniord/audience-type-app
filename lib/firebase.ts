import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// REPLACE THIS OBJECT WITH YOUR FIREBASE CONFIG FROM THE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyDEXwnF2AtQtJ3LXVaSAkaXgwCF__ieKw4",
    authDomain: "audience-type.firebaseapp.com",
    projectId: "audience-type",
    storageBucket: "audience-type.firebasestorage.app",
    messagingSenderId: "598058051445",
    appId: "1:598058051445:web:9e368f7ab54e23ccf1553c",
    measurementId: "G-4XD71CSZM0"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
