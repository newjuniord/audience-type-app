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
    Timestamp
} from "firebase/firestore";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface ChatThread {
    id: string; // userId
    userId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    lastMessage: string;
    lastMessageSenderId: string;
    lastMessageAt: any;
    unreadByAdmin: boolean;
    unreadByUser: boolean;
}

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: any;
}

export default function AdminChatPage() {
    const { user, userData } = useAuth();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Fetch all chat threads in real-time
    useEffect(() => {
        const chatRef = collection(db, "chats");
        const q = query(chatRef, orderBy("lastMessageAt", "desc"));

        const unsub = onSnapshot(q, (snapshot) => {
            const list: ChatThread[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                list.push({
                    id: doc.id,
                    userId: data.userId || doc.id,
                    userName: data.userName || "Etidyan",
                    userEmail: data.userEmail || "",
                    userPhone: data.userPhone || "",
                    lastMessage: data.lastMessage || "",
                    lastMessageSenderId: data.lastMessageSenderId || "",
                    lastMessageAt: data.lastMessageAt,
                    unreadByAdmin: !!data.unreadByAdmin,
                    unreadByUser: !!data.unreadByUser
                });
            });
            setThreads(list);
        }, (err) => {
            console.error("Error loading chat threads:", err);
        });

        return () => unsub();
    }, []);

    // 2. Fetch messages for active thread
    useEffect(() => {
        if (!selectedThread) {
            setMessages([]);
            return;
        }

        const messagesRef = collection(db, "chats", selectedThread.id, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsub = onSnapshot(q, (snapshot) => {
            const list: Message[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                list.push({
                    id: doc.id,
                    senderId: data.senderId,
                    senderName: data.senderName || "",
                    text: data.text || "",
                    createdAt: data.createdAt
                });
            });
            setMessages(list);
            
            // Auto scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        });

        // Reset unread indicator when thread is opened
        const threadDocRef = doc(db, "chats", selectedThread.id);
        setDoc(threadDocRef, { unreadByAdmin: false }, { merge: true }).catch((err) => {
            console.error("Error updating unreadByAdmin status:", err);
        });

        return () => unsub();
    }, [selectedThread]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedThread || !inputText.trim() || sending) return;

        setSending(true);
        const textToSend = inputText.trim();
        setInputText("");

        try {
            const adminName = userData?.displayName || user?.displayName || "Admin";
            const messagesRef = collection(db, "chats", selectedThread.id, "messages");
            const chatRef = doc(db, "chats", selectedThread.id);

            const now = Timestamp.now();

            // 1. Add message to subcollection
            await addDoc(messagesRef, {
                senderId: "admin",
                senderName: adminName,
                text: textToSend,
                createdAt: now
            });

            // 2. Update chat thread metadata
            await setDoc(chatRef, {
                lastMessage: textToSend,
                lastMessageSenderId: "admin",
                lastMessageAt: now,
                unreadByAdmin: false,
                unreadByUser: true
            }, { merge: true });

            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            console.error("Error sending response message:", err);
            setErrorMessage("Erreur lors de l'envoi du message. Veuillez réessayer.");
            setIsErrorModalOpen(true);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + 
               date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const filteredThreads = threads.filter(t => 
        t.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Support Chat & Messenger</h1>
                <p className="text-sm text-gray-500">Gérez les demandes d'assistance des étudiants en temps réel.</p>
            </div>

            {/* Support container */}
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex h-0 min-h-0">
                
                {/* Left panel: discussions list */}
                <div className="w-80 border-r border-gray-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                        <div className="relative">
                            <span className="material-symbols-outlined text-gray-400 absolute left-3 top-2.5 text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Rechercher un étudiant..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {filteredThreads.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                                <p className="text-sm font-medium">Aucun chat trouvé</p>
                            </div>
                        ) : (
                            filteredThreads.map((thread) => {
                                const isSelected = selectedThread?.id === thread.id;
                                return (
                                    <button
                                        key={thread.id}
                                        onClick={() => setSelectedThread(thread)}
                                        className={`w-full p-4 text-left flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                                            isSelected ? "bg-gray-50 font-medium" : ""
                                        }`}
                                    >
                                        <div className="relative shrink-0 mt-0.5">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold uppercase">
                                                {thread.userName.charAt(0)}
                                            </div>
                                            {thread.unreadByAdmin && (
                                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{thread.userName}</p>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    {thread.lastMessageAt ? formatTime(thread.lastMessageAt).split(" ")[1] : ""}
                                                </span>
                                            </div>
                                            <p className={`text-xs truncate ${thread.unreadByAdmin ? "text-black font-semibold" : "text-gray-500"}`}>
                                                {thread.lastMessageSenderId === "admin" ? "Vous: " : ""}
                                                {thread.lastMessage}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right panel: Active Chat workspace */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
                    {selectedThread ? (
                        <>
                            {/* Thread header */}
                            <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-gray-900 truncate">{selectedThread.userName}</h2>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                        Email: {selectedThread.userEmail || "N/A"} | Tél: {selectedThread.userPhone || "N/A"}
                                    </p>
                                </div>
                            </div>

                            {/* Chat history */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map((msg) => {
                                    const isAdminMsg = msg.senderId === "admin";
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isAdminMsg ? "items-end" : "items-start"}`}>
                                            <div className={`px-4 py-2.5 text-sm max-w-[85%] md:max-w-[70%] shadow-sm ${
                                                isAdminMsg 
                                                    ? "bg-primary text-white rounded-2xl rounded-tr-none font-medium" 
                                                    : "bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-tl-none"
                                            }`}>
                                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                                            </div>
                                            <span className="text-[9px] text-gray-400 mt-1 px-1">
                                                {formatTime(msg.createdAt)}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Send input area */}
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white flex items-center gap-3 shrink-0">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Répondre à l'étudiant..."
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || sending}
                                    className={`h-11 px-5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shrink-0 ${
                                        (!inputText.trim() || sending) ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                >
                                    <span className="text-xs uppercase tracking-wider">Envoyer</span>
                                    <span className="material-symbols-outlined text-sm">send</span>
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <span className="material-symbols-outlined text-6xl text-gray-300 mb-3">forum</span>
                            <h3 className="text-base font-bold text-gray-900">Support Chat DJR Akademi</h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-1">
                                Sélectionnez un étudiant dans la liste de gauche pour afficher l'historique et répondre.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={isErrorModalOpen}
                onClose={() => setIsErrorModalOpen(false)}
                title="Erreur"
                message={errorMessage}
                type="alert"
                isDanger={true}
            />
        </div>
    );
}
