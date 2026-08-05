import { db } from "./firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    increment,
} from "firebase/firestore";

// Firestore rejects undefined values — strip them recursively
function stripUndefined<T extends object>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [
                k,
                v && typeof v === "object" && !Array.isArray(v) ? stripUndefined(v as object) : v,
            ])
    ) as T;
}

export interface SurveyQuestion {
    id: string;
    text: string;
    type: "radio" | "checkbox" | "text";
    options?: string[]; // for radio/checkbox
    required: boolean;
}

export interface Survey {
    id?: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt?: string;
    isActive: boolean;
    collectEmail: boolean;
    collectPhone: boolean;
    questions: SurveyQuestion[];
    responseCount: number;
}

export interface SurveyResponse {
    id: string;
    submittedAt: string;
    email?: string;
    phone?: string;
    answers: Record<string, string | string[]>; // questionId -> answer(s)
}

const COLLECTION = "surveys";
const RESPONSES_SUBCOLLECTION = "responses";

// ─── ADMIN ───────────────────────────────────────────────────────────────────

export async function getSurveys(): Promise<Survey[]> {
    try {
        const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Survey));
    } catch (error) {
        console.error("getSurveys error:", error);
        return [];
    }
}

export async function getSurveyById(id: string): Promise<Survey | null> {
    try {
        const ref = doc(db, COLLECTION, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as Survey;
    } catch (error) {
        console.error("getSurveyById error:", error);
        return null;
    }
}

export async function createSurvey(data: Omit<Survey, "id" | "responseCount">): Promise<string> {
    try {
        const ref = await addDoc(collection(db, COLLECTION), {
            ...data,
            responseCount: 0,
            createdAt: new Date().toISOString(),
        });
        return ref.id;
    } catch (error) {
        console.error("createSurvey error:", error);
        throw error;
    }
}

export async function updateSurvey(id: string, data: Partial<Survey>): Promise<void> {
    try {
        const ref = doc(db, COLLECTION, id);
        await updateDoc(ref, stripUndefined({ ...data, updatedAt: new Date().toISOString() }));
    } catch (error) {
        console.error("updateSurvey error:", error);
        throw error;
    }
}

export async function deleteSurvey(id: string): Promise<void> {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
        console.error("deleteSurvey error:", error);
        throw error;
    }
}

export async function getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    try {
        const subcolRef = collection(db, COLLECTION, surveyId, RESPONSES_SUBCOLLECTION);
        const q = query(subcolRef, orderBy("submittedAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyResponse));
    } catch (error) {
        console.error("getSurveyResponses error:", error);
        return [];
    }
}

// ─── PUBLIC (submit response) ─────────────────────────────────────────────────

export async function submitSurveyResponse(
    surveyId: string,
    response: Omit<SurveyResponse, "id" | "submittedAt">
): Promise<void> {
    try {
        const surveyRef = doc(db, COLLECTION, surveyId);
        const responsesCol = collection(db, COLLECTION, surveyId, RESPONSES_SUBCOLLECTION);
        
        const newResponseData = stripUndefined({
            submittedAt: new Date().toISOString(),
            answers: response.answers,
            ...(response.email ? { email: response.email } : {}),
            ...(response.phone ? { phone: response.phone } : {}),
        });

        // 1. Add response to subcollection
        await addDoc(responsesCol, newResponseData);

        // 2. Increment response count on parent survey doc
        await updateDoc(surveyRef, {
            responseCount: increment(1),
        });
    } catch (error) {
        console.error("submitSurveyResponse error:", error);
        throw error;
    }
}
