"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { uploadChatMedia, compressImage } from "@/lib/chatMedia";
import UserEnrollmentsModal from "@/components/UserEnrollmentsModal";
import GiftProductModal from "@/components/GiftProductModal";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
    type?: "text" | "image" | "voice";
    mediaUrl?: string;
    voiceDuration?: number;
    createdAt: any;
    chatId?: string;
}

export default function AdminChatPage() {
    const { user, userData } = useAuth();
    const supabase = createClient();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
    const [isEnrollmentsOpen, setIsEnrollmentsOpen] = useState(false);
    const [isGiftOpen, setIsGiftOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [editUserName, setEditUserName] = useState("");
    const [editUserEmail, setEditUserEmail] = useState("");
    const [editUserPhone, setEditUserPhone] = useState("");
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Fetch all chat threads in real-time
    useEffect(() => {
        const fetchThreads = async () => {
            const { data } = await supabase.from("chats").select("*").order("lastMessageAt", { ascending: false });
            if (data) {
                setThreads(data.map((d: any) => ({
                    id: d.id,
                    userId: d.userId || d.id,
                    userName: d.userName || "Etidyan",
                    userEmail: d.userEmail || "",
                    userPhone: d.userPhone || "",
                    lastMessage: d.lastMessage || "",
                    lastMessageSenderId: d.lastMessageSenderId || "",
                    lastMessageAt: d.lastMessageAt,
                    unreadByAdmin: !!d.unreadByAdmin,
                    unreadByUser: !!d.unreadByUser
                })));
            }
        };

        fetchThreads();

        const channel = supabase.channel('admin-chats-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
                fetchThreads();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    // 2. Fetch messages for active thread
    useEffect(() => {
        if (!selectedThread) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            const { data } = await supabase.from("messages")
                .select("*")
                .eq("chatId", selectedThread.id)
                .order("createdAt", { ascending: true });
            
            if (data) {
                const unreadIds: string[] = [];
                const list: Message[] = data.map((d: any) => {
                    if (d.senderId !== "admin" && !d.isRead) {
                        unreadIds.push(d.id);
                    }
                    return {
                        id: d.id,
                        senderId: d.senderId,
                        senderName: d.senderName || "",
                        text: d.text || "",
                        type: d.type || "text",
                        mediaUrl: d.mediaUrl || "",
                        voiceDuration: d.voiceDuration || 0,
                        createdAt: d.createdAt,
                        chatId: d.chatId
                    };
                });
                
                setMessages(list);

                if (unreadIds.length > 0) {
                    await supabase.from("messages").update({ isRead: true }).in("id", unreadIds);
                }

                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
            }
        };

        fetchMessages();

        const channel = supabase.channel(`messages-${selectedThread.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chatId=eq.${selectedThread.id}` }, () => {
                fetchMessages();
            })
            .subscribe();

        // Reset unread indicator when thread is opened
        supabase.from("chats").update({ unreadByAdmin: false }).eq("id", selectedThread.id).then();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedThread, supabase]);

    const sendAdminMessage = useCallback(async (type: "text" | "image", mediaBlob?: Blob, mediaName?: string) => {
        if (!selectedThread) return;
        setSending(true);
        try {
            const adminName = userData?.displayName || user?.displayName || "Admin";
            const now = new Date().toISOString();

            let mediaUrl = "";
            let textContent = inputText.trim();

            if (type === "image" && mediaBlob) {
                mediaUrl = await uploadChatMedia(selectedThread.id, mediaBlob, mediaName || "admin_image.jpg");
                textContent = "📷 Image";
            }

            const msgData: any = { 
                id: crypto.randomUUID(),
                chatId: selectedThread.id,
                senderId: "admin", 
                senderName: adminName, 
                text: textContent, 
                type, 
                createdAt: now 
            };
            
            if (mediaUrl) msgData.mediaUrl = mediaUrl;

            await supabase.from("messages").insert(msgData);
            
            await supabase.from("chats").update({ 
                lastMessage: textContent, 
                lastMessageSenderId: "admin", 
                lastMessageAt: now, 
                unreadByAdmin: false, 
                unreadByUser: true 
            }).eq("id", selectedThread.id);

            setInputText("");
            setImagePreview(null);
            setImageFile(null);
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            console.error("Error sending response message:", err);
            setErrorMessage("Erreur lors de l'envoi du message. Veuillez réessayer.");
            setIsErrorModalOpen(true);
        } finally { setSending(false); }
    }, [selectedThread, user, userData, inputText, supabase]);

    const handleSendText = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || sending) return;
        sendAdminMessage("text");
    };

    const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        if (file.size > 10 * 1024 * 1024) { setErrorMessage("Image trop volumineuse (max 10MB)."); setIsErrorModalOpen(true); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSendImage = async () => {
        if (!imageFile || sending) return;
        const compressed = await compressImage(imageFile);
        await sendAdminMessage("image", compressed, imageFile.name);
    };

    const cancelImage = () => { setImagePreview(null); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

    // ──── Message Deletion (Long Press) ────
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);

    const handlePressStart = (msg: Message) => {
        pressTimer.current = setTimeout(() => {
            setMessageToDelete(msg);
        }, 600);
    };

    const handlePressEnd = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    const confirmDeleteMessage = async () => {
        if (!messageToDelete || !selectedThread) return;
        try {
            await supabase.from("messages").delete().eq("id", messageToDelete.id);
            setMessageToDelete(null);
        } catch (err) {
            console.error("Error deleting message:", err);
            setErrorMessage("Erreur lors de la suppression du message.");
            setIsErrorModalOpen(true);
        }
    };

    // ──── Delete entire conversation ────
    const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);

    const deleteConversation = async () => {
        if (!selectedThread) return;
        try {
            setSending(true);
            await supabase.from("messages").delete().eq("chatId", selectedThread.id);
            await supabase.from("chats").delete().eq("id", selectedThread.id);

            setSelectedThread(null);
            setIsDeleteChatModalOpen(false);
        } catch (err) {
            console.error("Error deleting conversation:", err);
            setErrorMessage("Erreur lors de la suppression de la conversation.");
            setIsErrorModalOpen(true);
        } finally {
            setSending(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedThread) return;
        setIsSavingUser(true);
        try {
            const currentUserId = selectedThread.userId || selectedThread.id;

            // Check if email already exists
            if (editUserEmail.trim() !== "") {
                const { data: emailSnap } = await supabase.from("users").select("id").eq("email", editUserEmail.trim()).limit(1);
                if (emailSnap && emailSnap.length > 0 && emailSnap[0].id !== currentUserId) {
                    setErrorMessage("Cette adresse email est déjà utilisée par un autre utilisateur.");
                    setIsErrorModalOpen(true);
                    setIsSavingUser(false);
                    return;
                }
            }

            // Check if phone already exists
            if (editUserPhone.trim() !== "") {
                const { data: phoneSnap } = await supabase.from("users").select("id").eq("phone", editUserPhone.trim()).limit(1);
                if (phoneSnap && phoneSnap.length > 0 && phoneSnap[0].id !== currentUserId) {
                    setErrorMessage("Ce numéro de téléphone est déjà utilisé par un autre utilisateur.");
                    setIsErrorModalOpen(true);
                    setIsSavingUser(false);
                    return;
                }
            }

            await supabase.from("chats").update({
                userName: editUserName,
                userEmail: editUserEmail,
                userPhone: editUserPhone
            }).eq("id", selectedThread.id);
            
            // Also update in users collection
            await supabase.from("users").update({
                displayName: editUserName,
                email: editUserEmail,
                phone: editUserPhone
            }).eq("id", currentUserId);

            setIsEditUserOpen(false);
        } catch(err) {
            console.error("Error updating user:", err);
            setErrorMessage("Erreur lors de la mise à jour des informations.");
            setIsErrorModalOpen(true);
        } finally {
            setIsSavingUser(false);
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + 
               date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    const filteredThreads = threads.filter(t => 
        t.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Support Client & Messagerie</h1>
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
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setEditUserName(selectedThread.userName || "");
                                            setEditUserEmail(selectedThread.userEmail || "");
                                            setEditUserPhone(selectedThread.userPhone || "");
                                            setIsEditUserOpen(true);
                                        }}
                                        className="h-9 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 border border-gray-200"
                                        title="Modifier les infos"
                                    >
                                        <span className="material-symbols-outlined text-base">edit</span>
                                        <span className="hidden sm:inline">Modifier</span>
                                    </button>
                                    <button
                                        onClick={() => setIsEnrollmentsOpen(true)}
                                        className="h-9 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 border border-gray-200"
                                        title="Voir les inscriptions"
                                    >
                                        <span className="material-symbols-outlined text-base">school</span>
                                        <span className="hidden sm:inline">Inscriptions</span>
                                    </button>
                                    <button
                                        onClick={() => setIsGiftOpen(true)}
                                        className="h-9 px-3.5 bg-primary text-white hover:bg-primary/95 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm shadow-primary/20"
                                        title="Donner l'accès à un produit"
                                    >
                                        <span className="material-symbols-outlined text-base">redeem</span>
                                        <span className="hidden sm:inline">Donner l'accès</span>
                                    </button>
                                    <button
                                        onClick={() => setIsDeleteChatModalOpen(true)}
                                        className="h-9 px-3.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 border border-red-100"
                                        title="Supprimer la conversation"
                                    >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                        <span className="hidden sm:inline">Supprimer</span>
                                    </button>
                                </div>
                            </div>

                            {/* Chat history */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map((msg) => {
                                    const isAdminMsg = msg.senderId === "admin";
                                    const bubbleCls = isAdminMsg
                                        ? "bg-primary text-white rounded-2xl rounded-tr-none font-medium"
                                        : "bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-tl-none";
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isAdminMsg ? "items-end" : "items-start"}`}>
                                            <div 
                                                className={`max-w-[70%] shadow-sm overflow-hidden ${bubbleCls} cursor-pointer transition-opacity active:opacity-80 select-none`}
                                                onTouchStart={() => handlePressStart(msg)}
                                                onTouchEnd={handlePressEnd}
                                                onMouseDown={() => handlePressStart(msg)}
                                                onMouseUp={handlePressEnd}
                                                onMouseLeave={handlePressEnd}
                                            >
                                                {msg.type === "image" && msg.mediaUrl ? (
                                                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"><img src={msg.mediaUrl} alt="Image" className="w-full max-w-[280px] rounded-xl object-cover" loading="lazy" /></a>
                                                ) : msg.type === "voice" && msg.mediaUrl ? (
                                                    <div className="px-4 py-2.5 flex items-center gap-3 min-w-[180px]">
                                                        <button onClick={() => { const a = document.getElementById(`audio-${msg.id}`) as HTMLAudioElement; a?.paused ? a?.play() : a?.pause(); }} className={`w-8 h-8 rounded-full ${isAdminMsg ? "bg-white/20" : "bg-gray-100"} flex items-center justify-center shrink-0`}><span className="material-symbols-outlined text-sm">play_arrow</span></button>
                                                        <div className="flex-1 flex flex-col gap-1"><div className={`h-1 ${isAdminMsg ? "bg-white/20" : "bg-gray-200"} rounded-full`} /><span className="text-[10px] opacity-60">{formatDuration(msg.voiceDuration || 0)}</span></div>
                                                        <audio id={`audio-${msg.id}`} src={msg.mediaUrl} preload="none" />
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-2.5"><p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p></div>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-gray-400 mt-1 px-1">{formatTime(msg.createdAt)}</span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Send input area */}
                            {imagePreview ? (
                                <div className="p-4 border-t border-gray-200 bg-white shrink-0">
                                    <div className="flex items-end gap-3">
                                        <div className="relative"><img src={imagePreview} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-gray-200" /><button onClick={cancelImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">✕</button></div>
                                        <button onClick={handleSendImage} disabled={sending} className={`h-10 px-4 bg-primary text-white rounded-xl flex items-center gap-2 text-xs font-bold active:scale-95 transition-all ${sending ? "opacity-50" : ""}`}>{sending ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <><span className="material-symbols-outlined text-sm">send</span>Envoyer</>}</button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSendText} className="p-4 border-t border-gray-200 bg-white flex items-center gap-3 shrink-0">
                                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImagePick} />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center shrink-0 transition-colors"><span className="material-symbols-outlined text-lg">image</span></button>
                                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Répondre à l'étudiant..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors" />
                                    <button type="submit" disabled={!inputText.trim() || sending} className={`h-11 px-5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shrink-0 ${(!inputText.trim() || sending) ? "opacity-50 cursor-not-allowed" : ""}`}><span className="text-xs uppercase tracking-wider">Envoyer</span><span className="material-symbols-outlined text-sm">send</span></button>
                                </form>
                            )}
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
            <ConfirmModal
                isOpen={!!messageToDelete}
                onClose={() => setMessageToDelete(null)}
                title="Supprimer le message"
                message="Êtes-vous sûr de vouloir supprimer ce message ?"
                onConfirm={confirmDeleteMessage}
                type="confirm"
                isDanger={true}
            />

            {/* User Access and Gifting Modals */}
            {selectedThread && (
                <>
                    <ConfirmModal
                        isOpen={isDeleteChatModalOpen}
                        onClose={() => setIsDeleteChatModalOpen(false)}
                        title="Supprimer la conversation"
                        message="Êtes-vous sûr de vouloir supprimer TOUTE la conversation ? Cette action est irréversible et supprimera tous les messages pour l'étudiant également."
                        onConfirm={deleteConversation}
                        type="confirm"
                        isDanger={true}
                    />
                    <UserEnrollmentsModal
                        isOpen={isEnrollmentsOpen}
                        onClose={() => setIsEnrollmentsOpen(false)}
                        user={{
                            uid: selectedThread.userId || selectedThread.id,
                            email: selectedThread.userEmail,
                            displayName: selectedThread.userName,
                            phone: selectedThread.userPhone
                        } as any}
                    />
                    <GiftProductModal
                        isOpen={isGiftOpen}
                        onClose={() => setIsGiftOpen(false)}
                        user={{
                            uid: selectedThread.userId || selectedThread.id,
                            email: selectedThread.userEmail,
                            displayName: selectedThread.userName,
                            phone: selectedThread.userPhone
                        } as any}
                    />

                    {isEditUserOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900">Modifier l'utilisateur</h3>
                                    <button onClick={() => setIsEditUserOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                                <form onSubmit={handleUpdateUser} className="p-6 flex flex-col gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nom Complet</label>
                                        <input
                                            type="text"
                                            value={editUserName}
                                            onChange={(e) => setEditUserName(e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="Ex: Jean Dupont"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={editUserEmail}
                                            onChange={(e) => setEditUserEmail(e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="Ex: jean@mail.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Numéro de téléphone</label>
                                        <PhoneInput
                                            international
                                            defaultCountry="HT"
                                            value={editUserPhone}
                                            onChange={(val) => setEditUserPhone(val || "")}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all PhoneInput-custom"
                                            placeholder="Ex: +1 849 000 0000"
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditUserOpen(false)}
                                            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingUser}
                                            className={`px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/95 rounded-xl transition-all shadow-sm shadow-primary/20 flex items-center gap-2 ${isSavingUser ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            {isSavingUser && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                                            Enregistrer
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
