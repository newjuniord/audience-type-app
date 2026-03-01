"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    deleteDoc,
    doc,
    Timestamp
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface SupportMessage {
    id: string;
    fullName: string;
    email: string;
    subject: string;
    message: string;
    createdAt: any;
}

export default function AdminMessagesPage() {
    const { role, loading } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        if (!loading && role !== "admin") {
            router.push("/");
        }
    }, [role, loading, router]);

    useEffect(() => {
        if (role !== "admin") return;

        console.log("📡 [ADMIN MESSAGES] Starting listener for support_messages...");
        const q = query(collection(db, "support_messages"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log(`✅ [ADMIN MESSAGES] Received ${snapshot.size} messages.`);
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SupportMessage[];
            setMessages(msgs);
        }, (error) => {
            console.error("❌ [ADMIN MESSAGES] Snapshot error:", error);
        });

        return () => unsubscribe();
    }, [role]);

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer ce message ?")) return;
        try {
            await deleteDoc(doc(db, "support_messages", id));
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Erreur lors de la suppression.");
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const filteredMessages = messages.filter(m =>
        m.fullName?.toLowerCase().includes(filter.toLowerCase()) ||
        m.email?.toLowerCase().includes(filter.toLowerCase()) ||
        m.subject?.toLowerCase().includes(filter.toLowerCase())
    );

    if (loading || role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter italic">Messages Support</h1>
                    <p className="text-black/50 dark:text-white/50 text-sm mt-2">Gérez les demandes de contact reçues via le site.</p>
                </div>

                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black/40">search</span>
                    <input
                        type="text"
                        placeholder="Rechercher un message..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="h-12 pl-12 pr-6 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full outline-none focus:border-primary transition-all text-sm min-w-[300px]"
                    />
                </div>
            </div>

            {filteredMessages.length === 0 ? (
                <div className="text-center py-20 bg-black/5 dark:bg-white/5 border border-dashed border-black/10 rounded-3xl">
                    <span className="material-symbols-outlined text-4xl text-black/20 mb-4">mail_outline</span>
                    <p className="text-black/40 font-bold uppercase tracking-widest text-xs">Aucun message trouvé</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredMessages.map((msg) => (
                        <div key={msg.id} className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl p-8 hover:shadow-xl transition-all group">
                            <div className="flex flex-col md:flex-row justify-between gap-6 mb-6 pb-6 border-b border-black/5 dark:border-white/5">
                                <div className="flex gap-4">
                                    <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black uppercase tracking-tighter shrink-0">
                                        {msg.fullName?.charAt(0) || "U"}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg uppercase tracking-tighter leading-tight">{msg.fullName}</h3>
                                        <p className="text-xs font-bold text-primary dark:text-white/60">{msg.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-full opacity-60">
                                        {formatDate(msg.createdAt)}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="size-10 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Objet</p>
                                <h4 className="font-bold text-sm mb-4 leading-snug">{msg.subject}</h4>
                                <p className="text-black/70 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                                    {msg.message}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
