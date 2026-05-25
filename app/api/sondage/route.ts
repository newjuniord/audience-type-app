import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const DEFAULT_SURVEYS = [
    {
        id: "sondaj_ai_kreyasyon",
        title: "AI ak Kreyasyon Kontni",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
        questions: [
            {
                id: "ai_level",
                text: "Ki nivo ou nan itilize Entèlijans Atifisyèl (IA) ?",
                type: "select",
                options: [
                    "Mwen se yon debutan nèt (Mwen pa konn anyen)",
                    "Mwen gen kèk konesans de baz (Mwen itilize ChatGPT pafwa)",
                    "Mwen itilize l souvan nan travay mwen ak nan pwojè m yo",
                    "Mwen se yon ekspè nan kreye sistèm ak modèl IA"
                ]
            },
            {
                id: "goal",
                text: "Ki pi gwo objektif ou genyen kounye a ?",
                type: "select",
                options: [
                    "Aprann kreye kontni ak IA pou m bati yon odyans",
                    "Otomatize travay mwen ak biznis mwen",
                    "Jwenn nouvo opòtinite travay kòm kreyatè kontni oswa devlopè",
                    "Kreye yon nouvo biznis sou entènèt soti nan zewo"
                ]
            },
            {
                id: "time_commitment",
                text: "Konbyen tan ou ka konsakre pou aprann chak semèn ?",
                type: "select",
                options: [
                    "Mwens pase 2 èdtan pa semèn",
                    "Ant 2 a 5 èdtan pa semèn",
                    "Plis pase 5 èdtan pa semèn",
                    "Mwen ka travay chak jou (Mwen lib)"
                ]
            },
            {
                id: "referral",
                text: "Ki kote ou te tande pale de DJR Akademi pou premye fwa ?",
                type: "select",
                options: [
                    "Sou TikTok / Instagram",
                    "Sou YouTube",
                    "Via yon zanmi ki te rekòmande m li",
                    "Lòt kote"
                ]
            },
            {
                id: "feedback",
                text: "Èske gen yon kòmantè, sijesyon oswa yon sijè espesifik ou ta renmen nou trete nan akademi an ? (Opsyonèl)",
                type: "text",
                placeholder: "Ekri sijesyon pa w la la..."
            }
        ]
    },
    {
        id: "sondaj_storytelling_kominikasyon",
        title: "Storytelling ak Kominikasyon",
        image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=600&auto=format&fit=crop",
        questions: [
            {
                id: "stage_fear",
                text: "Èske w konn gen strès lè w ap pale an piblik ?",
                type: "select",
                options: [
                    "Wi, mwen toujou pè anpil",
                    "Pafwa, depann de kantite moun yo",
                    "Non, mwen trè konfidan"
                ]
            },
            {
                id: "improvement_area",
                text: "Ki sa w ta renmen amelyore plis nan kominikasyon w ?",
                type: "select",
                options: [
                    "Vwa m ak ton mwen pou m pi kaptivan",
                    "Fason pou m konstri yon istwa (Storytelling)",
                    "Fason pou m konvenk ak vann lide m yo",
                    "Kominikasyon kòporèl (body language)"
                ]
            },
            {
                id: "experience",
                text: "Èske w te janm pran yon fòmasyon sou pale an piblik deja ?",
                type: "select",
                options: [
                    "Wi, mwen te fè sa deja",
                    "Non, se t ap premye fwa m"
                ]
            }
        ]
    }
];

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        const adminDb = getAdminDb();
        const collectionRef = adminDb.collection("sondages");
        
        let snapshot = await collectionRef.orderBy("createdAt", "desc").get();

        const surveys = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            let completed = false;

            if (userId && userId !== "anonymous") {
                const responseDoc = await collectionRef
                    .doc(doc.id)
                    .collection("responses")
                    .doc(userId)
                    .get();
                completed = responseDoc.exists;
            }

            surveys.push({
                id: doc.id,
                title: data.title,
                image: data.image,
                questions: data.questions || [],
                completed
            });
        }

        return NextResponse.json(surveys);
    } catch (error: any) {
        console.error("🔥 [SONDAGE GET ERROR]:", error);
        return NextResponse.json({ error: "Gen yon erè ki fèt sou sèvè a." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sondageId, userId, answers } = body;

        if (!sondageId || !answers || typeof answers !== "object") {
            return NextResponse.json({ error: "Done sondaj yo obligatwa." }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const collectionRef = adminDb.collection("sondages");

        // Verifye si sondaj la egziste
        const surveyDoc = await collectionRef.doc(sondageId).get();
        if (!surveyDoc.exists) {
            return NextResponse.json({ error: "Sondaj sa a pa egziste." }, { status: 404 });
        }

        // Si se yon itilizatè konekte, verifye si li pa ranpli l deja nan Firestore
        if (userId && userId !== "anonymous") {
            const responseDoc = await collectionRef
                .doc(sondageId)
                .collection("responses")
                .doc(userId)
                .get();

            if (responseDoc.exists) {
                return NextResponse.json({ error: "Ou ranpli sondaj sa a deja." }, { status: 400 });
            }
        }

        const finalUserId = userId || "anonymous";

        // Sove nan sous-kolèksyon responses de sondaj la
        const docRef = collectionRef
            .doc(sondageId)
            .collection("responses");

        if (finalUserId === "anonymous") {
            await docRef.add({
                userId: finalUserId,
                answers,
                createdAt: Timestamp.now(),
            });
        } else {
            await docRef.doc(finalUserId).set({
                userId: finalUserId,
                answers,
                createdAt: Timestamp.now(),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("🔥 [SONDAGE API ERROR]:", error);
        return NextResponse.json({ error: "Gen yon erè ki fèt sou sèvè a." }, { status: 500 });
    }
}
