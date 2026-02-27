import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// Cette route est destinée à être appelée par un CRON job (ex: Vercel Cron ou externe)
// Elle nettoie les commandes 'pending' trop vieilles.
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const cronKey = searchParams.get("key");
    const validSecret = process.env.CRON_SECRET;

    // Vérification de sécurité
    if (
        authHeader !== `Bearer ${validSecret}` &&
        cronKey !== validSecret
    ) {
        console.warn("⛔ [CRON] Tentative d'accès non autorisée.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("⏰ [CRON] Démarrage du nettoyage des commandes expirées...");

    try {
        const adminDb = getAdminDb();
        const ordersRef = adminDb.collection("orders");

        // Date actuelle moins 72 heures
        const expirationThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000);

        // Requête : status == 'pending' ET createdAt < threshold
        // Note: Firestore nécessite un index composite pour cette requête.
        // Si l'index manque, le serveur renverra une erreur avec un lien pour le créer.
        const snapshot = await ordersRef
            .where("status", "==", "pending")
            .where("paymentMethod", "==", "card") // On cible spécifiquement les paiements carte initiaux
            .where("createdAt", "<", expirationThreshold)
            .get();

        if (snapshot.empty) {
            console.log("✅ [CRON] Aucune commande expirée à traiter.");
            return NextResponse.json({ message: "No expired orders found", count: 0 });
        }

        console.log(`⚠️ [CRON] ${snapshot.size} commandes 'pending' trouvées qui sont expirées.`);

        // Batch update pour passer en 'failed'
        const batch = adminDb.batch();
        let counter = 0;

        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                status: "failed",
                failedReason: "expired_timeout",
                updatedAt: new Date()
            });
            counter++;
        });

        await batch.commit();

        console.log(`✅ [CRON] ${counter} commandes mises à jour en statut 'failed'.`);

        return NextResponse.json({
            message: "Expired orders processed successfully",
            processed: counter
        });

    } catch (error: any) {
        console.error("🔥 [CRON ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
