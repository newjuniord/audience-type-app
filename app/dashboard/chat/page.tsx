"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    doc,
    setDoc,
    addDoc,
    collection,
    query,
    orderBy,
    onSnapshot,
    Timestamp,
    getDocs,
    where
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: any;
}

export default function StudentChatPage() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [loadingAccess, setLoadingAccess] = useState(true);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Verify user purchase access (enrollments or bookings)
    useEffect(() => {
        if (!user) return;
        const uid = user.uid;

        async function checkAccess() {
            try {
                // Query enrollments
                const enrollmentsRef = collection(db, "enrollments");
                const qEnroll = query(enrollmentsRef, where("userId", "==", uid));
                const snapEnroll = await getDocs(qEnroll);

                // Query booking applications
                const bookingsRef = collection(db, "bookingApplications");
                const qBook = query(bookingsRef, where("usersId", "==", uid));
                const snapBook = await getDocs(qBook);

                // Access granted if has at least one enrollment or booking
                const totalAccessCount = snapEnroll.size + snapBook.size;
                setHasAccess(totalAccessCount > 0);
            } catch (err) {
                console.error("Error checking support chat access:", err);
                setHasAccess(false);
            } finally {
                setLoadingAccess(false);
            }
        }

        checkAccess();
    }, [user]);

    // 2. Load messages and clear unread indicator for student
    useEffect(() => {
        if (!user || !hasAccess) return;
        const uid = user.uid;

        const chatRef = doc(db, "chats", uid);
        const messagesRef = collection(db, "chats", uid, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        // Subscribe to messages
        const unsubMessages = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                msgs.push({
                    id: doc.id,
                    senderId: data.senderId,
                    senderName: data.senderName || "",
                    text: data.text || "",
                    createdAt: data.createdAt
                });
            });
            setMessages(msgs);
            
            // Auto scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        });

        // Set unreadByUser to false when viewing the chat
        setDoc(chatRef, { unreadByUser: false }, { merge: true }).catch((err) => {
            console.error("Error resetting unread count:", err);
        });

        return () => {
            unsubMessages();
        };
    }, [user, hasAccess]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !inputText.trim() || sending) return;

        setSending(true);
        const textToSend = inputText.trim();
        setInputText("");

        try {
            const uid = user.uid;
            const userName = userData?.displayName || user.displayName || "Etidyan";
            const userEmail = userData?.email || user.email || "";
            const userPhone = userData?.phone || user.phoneNumber || "";

            const chatRef = doc(db, "chats", uid);
            const messagesRef = collection(db, "chats", uid, "messages");

            const now = Timestamp.now();

            // 1. Add message doc
            await addDoc(messagesRef, {
                senderId: uid,
                senderName: userName,
                text: textToSend,
                createdAt: now
            });

            // 2. Update chat metadata
            await setDoc(chatRef, {
                userId: uid,
                userName,
                userEmail,
                userPhone,
                lastMessage: textToSend,
                lastMessageSenderId: uid,
                lastMessageAt: now,
                unreadByAdmin: true,
                unreadByUser: false
            }, { merge: true });

            // Auto scroll
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            console.error("Error sending support message:", err);
            setErrorMessage("Echèk nan voye mesaj la. Tanpri re-eseye.");
            setIsErrorModalOpen(true);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    if (loadingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (hasAccess === false) {
        return (
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-primary dark:text-white px-6 py-20 flex items-center justify-center">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center backdrop-blur-lg">
                    <span className="material-symbols-outlined text-6xl text-primary mb-4">lock</span>
                    <h3 className="text-xl font-bold mb-3">Sèvis Chat Sipo Bloke</h3>
                    <p className="text-sm opacity-75 mb-8">
                        Ou dwe genyen omwen yon kou oswa yon rezèvasyon konsiltasyon pou w ka kontakte ekip admin nan chat la.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link href="/products" className="h-12 w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-primary/25">
                            Gade kou ak pwodui yo
                        </Link>
                        <Link href="/consultation" className="h-12 w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all">
                            Pran yon randevou
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-[calc(100vh-80px)] w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-primary dark:text-white px-4 md:px-10 py-8">
            <div className="max-w-[800px] w-full mx-auto flex flex-col flex-1">
                
                {/* Header Info */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Asistans Teknik</h1>
                        <p className="text-xs text-white/50">Poze admin nenpòt kesyon sou kou ou yo.</p>
                    </div>
                    <Link href="/dashboard" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Retounen
                    </Link>
                </div>

                {/* Chat window */}
                <div className="bg-white dark:bg-[#121212]/80 border border-black/5 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[580px] md:h-[620px] backdrop-blur-md">
                    
                    {/* Active support details */}
                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/[0.02] flex items-center gap-3 shrink-0">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-lg">support_agent</span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#121212] animate-pulse"></div>
                        </div>
                        <div>
                            <div className="text-sm font-bold">Admin DJR Akademi</div>
                            <div className="text-[10px] text-green-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                                Enliy kounye a
                            </div>
                        </div>
                    </div>

                    {/* Messages list */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 select-text">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-6 py-10">
                                <span className="material-symbols-outlined text-5xl mb-3 animate-bounce">forum</span>
                                <p className="text-sm font-bold">Ekri premye mesaj ou a pou kòmanse diskisyon an.</p>
                                <p className="text-xs mt-1">Ekip admin la ap reponn ou trè vit.</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === user?.uid;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                        <div className={`px-4 py-2.5 text-sm max-w-[85%] md:max-w-[70%] shadow-md ${
                                            isMe 
                                                ? "bg-primary text-white rounded-2xl rounded-tr-none font-medium" 
                                                : "bg-[#1f1f1f] text-white/90 border border-white/5 rounded-2xl rounded-tl-none"
                                        }`}>
                                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                                        </div>
                                        <span className="text-[9px] opacity-40 mt-1 px-1">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Form Input */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/[0.01] flex items-center gap-3 shrink-0">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Ekri mesaj ou a la..."
                            className="flex-1 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || sending}
                            className={`h-11 px-5 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shrink-0 ${
                                (!inputText.trim() || sending) ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        >
                            <span className="hidden md:inline text-xs uppercase tracking-wider">Voye</span>
                            <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                    </form>
                </div>
            </div>

            <ConfirmModal
                isOpen={isErrorModalOpen}
                onClose={() => setIsErrorModalOpen(false)}
                title="Echèk"
                message={errorMessage}
                type="alert"
                isDanger={true}
            />
        </div>
    );
}
