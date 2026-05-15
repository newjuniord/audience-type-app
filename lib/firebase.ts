import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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

// Enable Offline Persistence (Client-side only)
if (typeof window !== "undefined") {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled
            // in one tab at a a time.
            console.warn("Firestore Persistence: Multiple tabs open, persistence enabled in only one tab.");
        } else if (err.code === 'unimplemented-custom-browser') {
            // The current browser does not support all of the
            // features required to enable persistence
            console.warn("Firestore Persistence: The current browser does not support persistence.");
        }
    });
}

export { app, auth, db, storage, googleProvider };
