import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

async function verifyAdmin(req: Request) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
    }
    const idToken = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminUid = decodedToken.uid;
    
    const adminDoc = await adminDb.collection("users").doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role?.trim().toLowerCase() !== "admin") {
        throw new Error("Forbidden");
    }
    return adminDb;
}

export async function GET(req: Request) {
    try {
        const adminDb = await verifyAdmin(req);
        const snapshot = await adminDb.collection("sondages").orderBy("createdAt", "desc").get();
        const surveys = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Get all responses for this survey
            const responsesSnapshot = await adminDb.collection("sondages").doc(doc.id).collection("responses").get();
            const responses = responsesSnapshot.docs.map(rDoc => ({
                id: rDoc.id,
                ...rDoc.data()
            }));
            
            surveys.push({
                id: doc.id,
                title: data.title,
                image: data.image,
                questions: data.questions || [],
                responsesCount: responses.length,
                responses
            });
        }
        
        return NextResponse.json(surveys);
    } catch (error: any) {
        console.error("Admin Survey GET error:", error);
        const status = error.message === "Unauthorized" ? 401 : error.message === "Forbidden" ? 403 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}

export async function POST(req: Request) {
    try {
        const adminDb = await verifyAdmin(req);
        const { title, image, questions } = await req.json();
        
        if (!title || !image || !questions || !Array.isArray(questions)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        
        const newSurveyRef = adminDb.collection("sondages").doc();
        await newSurveyRef.set({
            title,
            image,
            questions,
            createdAt: Timestamp.now()
        });
        
        return NextResponse.json({ success: true, id: newSurveyRef.id });
    } catch (error: any) {
        console.error("Admin Survey POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const adminDb = await verifyAdmin(req);
        const { id, title, image, questions } = await req.json();
        
        if (!id || !title || !image || !questions || !Array.isArray(questions)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        
        await adminDb.collection("sondages").doc(id).update({
            title,
            image,
            questions
        });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Admin Survey PUT error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const adminDb = await verifyAdmin(req);
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        
        if (!id) {
            return NextResponse.json({ error: "Missing survey id" }, { status: 400 });
        }
        
        await adminDb.collection("sondages").doc(id).delete();
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Admin Survey DELETE error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
