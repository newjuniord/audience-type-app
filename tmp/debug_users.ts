import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDEXwnF2AtQtJ3LXVaSAkaXgwCF__ieKw4",
    authDomain: "audience-type.firebaseapp.com",
    projectId: "audience-type",
    storageBucket: "audience-type.firebasestorage.app",
    messagingSenderId: "598058051445",
    appId: "1:598058051445:web:9e368f7ab54e23ccf1553c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUsers() {
    console.log("Checking first 10 users in Firestore...");
    try {
        const q = query(collection(db, "users"), limit(10));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.log("No users found in collection 'users'.");
            return;
        }
        snapshot.forEach(doc => {
            console.log(`- ID: ${doc.id} | Data:`, JSON.stringify(doc.data()));
        });
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

checkUsers();
