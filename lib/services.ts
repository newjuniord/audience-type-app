import { Service } from "./types";
import { db } from "./firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

export async function getServices(): Promise<Service[]> {
    const servicesRef = collection(db, "services");
    const snapshot = await getDocs(servicesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
}

export async function getService(serviceId: string): Promise<Service | null> {
    const docRef = doc(db, "services", serviceId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Service;
    }
    return null;
}

export const getServiceById = getService;

export async function addService(serviceData: Partial<Service>): Promise<string> {
    const newServiceRef = doc(collection(db, "services"));
    const id = newServiceRef.id;
    const newService: Service = {
        id,
        title: serviceData.title || "",
        description: serviceData.description || "",
        price: serviceData.price || "$0",
        priceHTG: serviceData.priceHTG || 0,
        active: serviceData.active ?? true,
        status: serviceData.status || "published",
        imageUrl: serviceData.imageUrl || "",
        includedItems: serviceData.includedItems || [],
        availability: serviceData.availability || {
            monday: { enabled: true, startTime: "09:00", endTime: "17:00" }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    await setDoc(newServiceRef, newService);
    return id;
}

export async function updateService(serviceId: string, serviceData: Partial<Service>): Promise<void> {
    const docRef = doc(db, "services", serviceId);
    await updateDoc(docRef, { 
        ...serviceData, 
        updatedAt: new Date().toISOString() 
    });
}

export async function deleteService(serviceId: string): Promise<void> {
    const docRef = doc(db, "services", serviceId);
    await deleteDoc(docRef);
}
