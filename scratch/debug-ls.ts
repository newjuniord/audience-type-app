import { getAdminDb } from "../lib/firebase-admin";

async function check() {
    try {
        const db = getAdminDb();
        const snapshot = await db.collection("orders")
            .where("provider", "==", "lemonsqueezy")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log("❌ Aucune commande Lemon Squeezy trouvée dans Firestore.");
            return;
        }

        const data = snapshot.docs[0].data();
        console.log("--- DERNIÈRE ERREUR LEMON SQUEEZY ---");
        console.log("ID Commande:", snapshot.docs[0].id);
        console.log("Status:", data.status);
        console.log("Raison de l'échec (JSON):", data.failedReason);
        console.log("--------------------------------------");
    } catch (e) {
        console.error("Erreur script:", e);
    }
}

check();
