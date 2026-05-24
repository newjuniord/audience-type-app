"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    doc, setDoc, addDoc, collection, query, orderBy,
    onSnapshot, Timestamp, getDocs, where, getDoc
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { uploadChatMedia, compressImage } from "@/lib/chatMedia";

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    type?: "text" | "image" | "voice";
    mediaUrl?: string;
    voiceDuration?: number;
    createdAt: any;
    isPending?: boolean;
    isRead?: boolean;
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

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Voice preview (recorded but not yet sent)
    const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
    const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
    const [voicePreviewDuration, setVoicePreviewDuration] = useState(0);
    const [isVoicePlaying, setIsVoicePlaying] = useState(false);
    const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);

    // Image preview state
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Toast
    const [toast, setToast] = useState<string | null>(null);
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ──── Access check ────
    useEffect(() => {
        if (!user) return;
        const uid = user.uid;
        async function checkAccess() {
            try {
                // Read global chat settings first
                const platformRef = doc(db, "settings", "platform");
                const platformSnap = await getDoc(platformRef);
                const chatRule = platformSnap.exists() ? platformSnap.data().chatAccessRule : "enrolled_only";

                if (chatRule === "all") {
                    setHasAccess(true);
                } else {
                    const snapEnroll = await getDocs(query(collection(db, "enrollments"), where("userId", "==", uid)));
                    const snapBook = await getDocs(query(collection(db, "bookingApplications"), where("usersId", "==", uid)));
                    setHasAccess(snapEnroll.size + snapBook.size > 0);
                }
            } catch { setHasAccess(false); }
            finally { setLoadingAccess(false); }
        }
        checkAccess();
    }, [user]);

    // ──── Messages listener ────
    useEffect(() => {
        if (!user || !hasAccess) return;
        const uid = user.uid;
        const q = query(collection(db, "chats", uid, "messages"), orderBy("createdAt", "asc"));
        const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
            const msgs: Message[] = [];
            snap.forEach((d) => {
                const data = d.data();
                msgs.push({ id: d.id, senderId: data.senderId, senderName: data.senderName || "", text: data.text || "", type: data.type || "text", mediaUrl: data.mediaUrl || "", voiceDuration: data.voiceDuration || 0, createdAt: data.createdAt, isPending: d.metadata.hasPendingWrites, isRead: data.isRead });
            });
            setMessages(msgs);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });
        setDoc(doc(db, "chats", uid), { unreadByUser: false }, { merge: true }).catch(() => {});
        return () => unsub();
    }, [user, hasAccess]);

    // ──── Toast helper ────
    const showToast = useCallback((msg: string) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(msg);
        toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    }, []);

    // ──── Send helper (text, image, voice) ────
    const sendMessage = useCallback(async (type: "text" | "image" | "voice", mediaBlob?: Blob, mediaName?: string, duration?: number) => {
        if (!user) return;
        setSending(true);
        try {
            const uid = user.uid;
            const userName = userData?.displayName || user.displayName || "Etidyan";
            const userEmail = userData?.email || user.email || "";
            const userPhone = userData?.phone || user.phoneNumber || "";
            const chatRef = doc(db, "chats", uid);
            const messagesRef = collection(db, "chats", uid, "messages");
            const now = Timestamp.now();

            let mediaUrl = "";
            let textContent = inputText.trim();

            if (type === "image" && mediaBlob) {
                mediaUrl = await uploadChatMedia(uid, mediaBlob, mediaName || "image.jpg");
                textContent = "📷 Imaj";
            } else if (type === "voice" && mediaBlob) {
                mediaUrl = await uploadChatMedia(uid, mediaBlob, mediaName || "voice.webm");
                textContent = "🎤 Mesaj vokal";
            }

            const msgData: any = { senderId: uid, senderName: userName, text: textContent, type, createdAt: now };
            if (mediaUrl) msgData.mediaUrl = mediaUrl;
            if (duration) msgData.voiceDuration = duration;

            await addDoc(messagesRef, msgData);
            await setDoc(chatRef, { userId: uid, userName, userEmail, userPhone, lastMessage: textContent, lastMessageSenderId: uid, lastMessageAt: now, unreadByAdmin: true, unreadByUser: false }, { merge: true });

            setInputText("");
            setImagePreview(null);
            setImageFile(null);
            setVoicePreviewBlob(null);
            setVoicePreviewUrl(null);
            setVoicePreviewDuration(0);
            setIsVoicePlaying(false);
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            showToast(type === "image" ? "📷 Imaj voye !" : type === "voice" ? "🎤 Mesaj vokal voye !" : "✓ Mesaj voye !");
        } catch (err) {
            console.error("Error sending message:", err);
            setErrorMessage("Echèk nan voye mesaj la. Tanpri re-eseye.");
            setIsErrorModalOpen(true);
        } finally { setSending(false); }
    }, [user, userData, inputText, showToast]);

    // ──── Text send ────
    const handleSendText = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || sending) return;
        sendMessage("text");
    };

    // ──── Image pick ────
    const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { setErrorMessage("Sèlman imaj ki aksepte."); setIsErrorModalOpen(true); return; }
        if (file.size > 10 * 1024 * 1024) { setErrorMessage("Imaj la twò gwo (max 10MB)."); setIsErrorModalOpen(true); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSendImage = async () => {
        if (!imageFile || sending) return;
        const compressed = await compressImage(imageFile);
        await sendMessage("image", compressed, imageFile.name);
    };

    const cancelImage = () => {
        setImagePreview(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Long-press to delete image preview
    const handleImageLongPressStart = () => {
        longPressTimerRef.current = setTimeout(() => { cancelImage(); }, 500);
    };
    const handleImageLongPressEnd = () => {
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    };

    // ──── Voice recording ────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime((t) => {
                    if (t >= 59) { stopRecording(); return 60; }
                    return t + 1;
                });
            }, 1000);
        } catch {
            setErrorMessage("Pa ka aksede nan mikwofòn ou. Tanpri bay pèmisyon.");
            setIsErrorModalOpen(true);
        }
    };

    const stopRecording = () => {
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === "inactive") { setIsRecording(false); return; }
        const finalDuration = recordingTime;
        recorder.onstop = () => {
            recorder.stream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
            if (blob.size > 0) {
                const url = URL.createObjectURL(blob);
                setVoicePreviewBlob(blob);
                setVoicePreviewUrl(url);
                setVoicePreviewDuration(finalDuration);
            }
        };
        recorder.stop();
        setIsRecording(false);
        setRecordingTime(0);
    };

    const cancelVoicePreview = () => {
        if (voicePreviewAudioRef.current) { voicePreviewAudioRef.current.pause(); voicePreviewAudioRef.current = null; }
        if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
        setVoicePreviewBlob(null);
        setVoicePreviewUrl(null);
        setVoicePreviewDuration(0);
        setIsVoicePlaying(false);
    };

    const toggleVoicePreviewPlay = () => {
        if (!voicePreviewUrl) return;
        if (!voicePreviewAudioRef.current) {
            const audio = new Audio(voicePreviewUrl);
            audio.onended = () => setIsVoicePlaying(false);
            voicePreviewAudioRef.current = audio;
        }
        const audio = voicePreviewAudioRef.current;
        if (isVoicePlaying) { audio.pause(); setIsVoicePlaying(false); }
        else { audio.play(); setIsVoicePlaying(true); }
    };

    const sendVoicePreview = () => {
        if (!voicePreviewBlob) return;
        if (voicePreviewAudioRef.current) { voicePreviewAudioRef.current.pause(); voicePreviewAudioRef.current = null; }
        sendMessage("voice", voicePreviewBlob, "voice.webm", voicePreviewDuration);
    };

    const cancelRecording = () => {
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.onstop = () => { recorder.stream.getTracks().forEach((t) => t.stop()); };
            recorder.stop();
        }
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingTime(0);
    };

    // 12-hour AM/PM format
    const formatTime = (ts: any) => {
        if (!ts) return "";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    };

    const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "00")}`;

    // Day separator helpers
    const getDateKey = (ts: any): string => {
        if (!ts) return "";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    };

    const DAY_NAMES_FR = ["Dimanch", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi"];

    const getDateLabel = (ts: any): string => {
        if (!ts) return "";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
        if (sameDay(d, today)) return "Jodi a";
        if (sameDay(d, yesterday)) return "Yè";
        const day = DAY_NAMES_FR[d.getDay()];
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        return `${day} • ${dd}/${mm}`;
    };

    const renderDaySeparator = (label: string, mobile: boolean) => (
        <div className="flex items-center gap-3 py-2">
            <div className={`flex-1 h-px ${mobile ? "bg-white/[0.06]" : "bg-black/[0.06] dark:bg-white/[0.06]"}`} />
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                mobile
                    ? "text-white/30 bg-white/[0.04] border-white/[0.06]"
                    : "text-black/35 dark:text-white/30 bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.06]"
            } uppercase tracking-wider`}>{label}</span>
            <div className={`flex-1 h-px ${mobile ? "bg-white/[0.06]" : "bg-black/[0.06] dark:bg-white/[0.06]"}`} />
        </div>
    );

    // ──── Message bubble renderer (mobile only — desktop renders inline) ────
    const renderBubble = (msg: Message, isMe: boolean) => {
        const bubbleClass = isMe
            ? "bg-primary text-white rounded-2xl rounded-tr-sm font-medium"
            : "bg-[#1a1a1a] text-white/90 border border-white/[0.06] rounded-2xl rounded-tl-sm";

        return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`max-w-[82%] shadow-sm overflow-hidden ${bubbleClass}`}>
                    {msg.type === "image" && msg.mediaUrl ? (
                        <div>
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                                <img src={msg.mediaUrl} alt="Image" className="w-full max-w-[280px] rounded-xl object-cover" loading="lazy" />
                            </a>
                            {msg.text && msg.text !== "📷 Imaj" && <p className="px-3.5 py-1.5 text-[13px] whitespace-pre-wrap break-words">{msg.text}</p>}
                        </div>
                    ) : msg.type === "voice" && msg.mediaUrl ? (
                        <div className="px-3.5 py-2.5 flex items-center gap-3 min-w-[180px]">
                            <button onClick={() => { const a = document.getElementById(`audio-${msg.id}`) as HTMLAudioElement; a?.paused ? a?.play() : a?.pause(); }} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 hover:bg-white/30 transition-colors">
                                <span className="material-symbols-outlined text-sm">play_arrow</span>
                            </button>
                            <div className="flex-1 flex flex-col gap-1">
                                <div className="h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white/60 rounded-full w-0 transition-all" /></div>
                                <span className="text-[10px] opacity-60">{formatDuration(msg.voiceDuration || 0)}</span>
                            </div>
                            <audio id={`audio-${msg.id}`} src={msg.mediaUrl} preload="none" />
                        </div>
                    ) : (
                        <div className="px-3.5 py-2">
                            <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                        </div>
                    )}
                    {/* Time + read checkmarks inside bubble */}
                    <div className={`flex items-center gap-1 px-3.5 pb-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[9px] ${isMe ? "text-white/50" : "text-white/30"}`}>{formatTime(msg.createdAt)}</span>
                        {isMe && msg.isRead && <span className="text-[10px] text-[#4db8ff] font-black">✓✓</span>}
                    </div>
                </div>
            </div>
        );
    };

    // ──── Input bar renderer (shared) ────
    const renderInputBar = (mobile: boolean) => {
        const bar = mobile ? "px-3 py-2.5 pb-[84px]" : "p-4";
        const bg = mobile ? "bg-[#0e0e0e] border-white/[0.06]" : "bg-black/5 dark:bg-white/[0.01] border-black/5 dark:border-white/5";

        if (imagePreview) {
            return (
                <div className={`${bar} ${bg} border-t shrink-0`}>
                    <div className="flex items-end gap-3">
                        <div className="relative select-none cursor-pointer" onMouseDown={handleImageLongPressStart} onMouseUp={handleImageLongPressEnd} onMouseLeave={handleImageLongPressEnd} onTouchStart={handleImageLongPressStart} onTouchEnd={handleImageLongPressEnd} title="Kenbe pou efase">
                            <img src={imagePreview} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-white/10" />
                            <button onClick={cancelImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg">✕</button>
                            <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center text-white/40 bg-black/40 rounded-b-xl py-0.5">Kenbe pou efase</span>
                        </div>
                        <button onClick={handleSendImage} disabled={sending} className={`h-10 px-4 bg-primary text-white rounded-full flex items-center gap-2 text-xs font-bold active:scale-95 transition-all shadow-lg shadow-primary/30 ${sending ? "opacity-50" : ""}`}>
                            {sending ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <><span className="material-symbols-outlined text-sm">send</span> Ale</>}
                        </button>
                    </div>
                </div>
            );
        }

        if (voicePreviewBlob && voicePreviewUrl) {
            return (
                <div className={`${bar} ${bg} border-t flex items-center gap-3 shrink-0`}>
                    <button onClick={cancelVoicePreview} className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 active:scale-90"><span className="material-symbols-outlined text-lg">delete</span></button>
                    <div className="flex-1 flex items-center gap-2 bg-white/[0.06] rounded-full px-3 py-2">
                        <button onClick={toggleVoicePreviewPlay} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-sm text-white">{isVoicePlaying ? "pause" : "play_arrow"}</span>
                        </button>
                        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: isVoicePlaying ? "100%" : "0%", transition: isVoicePlaying ? `width ${voicePreviewDuration}s linear` : "none" }} />
                        </div>
                        <span className="text-[10px] text-white/50 shrink-0">{formatDuration(voicePreviewDuration)}</span>
                    </div>
                    <button onClick={sendVoicePreview} disabled={sending} className={`w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shrink-0 active:scale-90 shadow-lg shadow-primary/30 ${sending ? "opacity-50" : ""}`}>
                        {sending ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-lg">send</span>}
                    </button>
                </div>
            );
        }

        if (isRecording) {
            return (
                <div className={`${bar} ${bg} border-t flex items-center gap-3 shrink-0`}>
                    <button onClick={cancelRecording} className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 active:scale-90"><span className="material-symbols-outlined text-lg">delete</span></button>
                    <div className="flex-1 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-bold text-red-400">{formatDuration(recordingTime)}</span>
                        <span className="text-[10px] text-white/40">/ 1:00 max</span>
                    </div>
                    <button onClick={stopRecording} className="w-10 h-10 bg-white/10 text-white border border-white/20 rounded-full flex items-center justify-center shrink-0 active:scale-90"><span className="material-symbols-outlined text-lg">stop</span></button>
                </div>
            );
        }

        // Desktop-aware color tokens
        const inputBg   = mobile ? "bg-white/[0.06] border-white/[0.08] text-white placeholder-white/25 focus:border-primary/40"
                                 : "bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.08] dark:border-white/[0.08] text-black dark:text-white placeholder-black/30 dark:placeholder-white/25 focus:border-primary/50";
        const iconBtn   = mobile ? "bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/10"
                                 : "bg-black/[0.05] dark:bg-white/[0.06] text-black/40 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10";

        return (
            <form onSubmit={handleSendText} className={`${bar} ${bg} border-t flex items-center gap-2 shrink-0`}>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImagePick} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`${mobile ? "w-9 h-9" : "w-10 h-10"} rounded-full ${iconBtn} flex items-center justify-center shrink-0 transition-colors active:scale-90`}>
                    <span className="material-symbols-outlined text-lg">image</span>
                </button>
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Ekri mesaj ou a la..." className={`flex-1 border ${inputBg} ${mobile ? "rounded-full px-4 py-2.5" : "rounded-2xl px-5 py-3"} text-sm focus:outline-none transition-colors`} />
                <button type="submit" disabled={!inputText.trim() || sending} className={`${mobile ? "w-10 h-10" : "h-11 px-5"} bg-primary text-white ${mobile ? "rounded-full" : "rounded-2xl"} flex items-center justify-center ${mobile ? "" : "gap-2"} active:scale-90 transition-all shrink-0 ${(!inputText.trim() || sending) ? "opacity-40" : "shadow-lg shadow-primary/30"}`}>
                    {!mobile && <span className="text-xs uppercase tracking-wider">Ale</span>}
                    <span className="material-symbols-outlined text-lg">send</span>
                </button>
            </form>
        );
    };
    // ──── Loading / Access denied ────
    if (loadingAccess) return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    if (hasAccess === false) {
        return (
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-primary dark:text-white px-6 py-20 items-center justify-center">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center backdrop-blur-lg">
                    <span className="material-symbols-outlined text-6xl text-primary mb-4">lock</span>
                    <h3 className="text-xl font-bold mb-3">Sèvis Chat Sipo Bloke</h3>
                    <p className="text-sm opacity-75 mb-8">Ou dwe genyen omwen yon kou oswa yon rezèvasyon konsiltasyon pou w ka kontakte ekip admin nan chat la.</p>
                    <div className="flex flex-col gap-3">
                        <Link href="/products" className="h-12 w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-primary/25">Gade kou ak pwodui yo</Link>
                        <Link href="/consultation" className="h-12 w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all">Pran yon randevou</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* ===== MOBILE ===== */}
            <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-background-dark text-white">
                <div className="px-4 py-3 bg-[#0e0e0e] border-b border-white/[0.06] flex items-center gap-3 shrink-0 safe-area-pt">
                    <Link href="/dashboard" className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors shrink-0 active:scale-90"><span className="material-symbols-outlined text-lg">arrow_back</span></Link>
                    <div className="relative shrink-0"><div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-base">support_agent</span></div><div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-[1.5px] border-[#0e0e0e]" /></div>
                    <div className="min-w-0"><div className="text-sm font-bold truncate leading-tight">Admin DJR Akademi</div><div className="text-[10px] text-green-400 font-semibold leading-tight">Enliy</div></div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 select-text">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-4">
                            <span className="material-symbols-outlined text-4xl mb-2 animate-bounce">forum</span>
                            <p className="text-sm font-bold">Ekri premye mesaj ou a pou kòmanse diskisyon an.</p>
                            <p className="text-xs mt-1">Ekip admin la ap reponn ou trè vit.</p>
                        </div>
                    ) : (
                        messages.map((m, i) => {
                            const prevMsg = messages[i - 1];
                            const showSeparator = i === 0 || getDateKey(m.createdAt) !== getDateKey(prevMsg?.createdAt);
                            return (
                                <div key={m.id}>
                                    {showSeparator && renderDaySeparator(getDateLabel(m.createdAt), true)}
                                    {renderBubble(m, m.senderId === user?.uid)}
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
                {renderInputBar(true)}
            </div>

            {/* ===== DESKTOP ===== */}
            <div className="hidden md:flex relative min-h-[calc(100vh-80px)] w-full overflow-x-hidden bg-background-light dark:bg-background-dark text-primary dark:text-white">
                <div className="w-full max-w-[1200px] mx-auto flex gap-6 px-8 py-8 h-[calc(100vh-80px)]">

                    {/* ── Left sidebar ── */}
                    <div className="w-72 shrink-0 flex flex-col gap-4">
                        {/* Back link */}
                        <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-sm font-bold transition-all active:scale-95 group">
                            <span className="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                            Retounen nan dashboard
                        </Link>

                        {/* Admin card */}
                        <div className="bg-white dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.07] rounded-3xl p-5 shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-xl">support_agent</span>
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#111] shadow-lg animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-extrabold leading-tight">Admin DJR Akademi</p>
                                    <p className="text-[11px] text-green-400 font-semibold mt-0.5">● Disponib kounye a</p>
                                </div>
                            </div>
                            <div className="h-px bg-black/5 dark:bg-white/5 mb-4" />
                            <div className="space-y-2.5 text-xs text-black/50 dark:text-white/40">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-primary/70">schedule</span>
                                    <span>Repons mwens pase <strong className="text-black/70 dark:text-white/60">24 tè</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-primary/70">translate</span>
                                    <span>Kreyòl, Fransè, Anglè</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-primary/70">verified</span>
                                    <span>Sipò ofisyèl DJR Akademi</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick tips */}
                        <div className="bg-white dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.07] rounded-3xl p-5 shadow-lg flex-1">
                            <p className="text-[11px] font-extrabold uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">Kèk konsèy rapid</p>
                            <div className="space-y-2">
                                {[
                                    { icon: "school", text: "Mande konsèy sou kou ou a" },
                                    { icon: "photo_camera", text: "Voye yon screenshot si w gen pwoblèm" },
                                    { icon: "lock", text: "Pa janm pataje mo de pàs ou" },
                                ].map((tip, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                                        <span className="material-symbols-outlined text-base text-primary/60 shrink-0 mt-0.5">{tip.icon}</span>
                                        <span className="text-xs text-black/60 dark:text-white/50 leading-snug">{tip.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Main chat panel ── */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f0f0f] border border-black/5 dark:border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">

                        {/* Chat header */}
                        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.05] bg-gradient-to-r from-primary/[0.04] to-transparent flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-base text-primary">forum</span>
                                </div>
                                <div>
                                    <p className="text-sm font-extrabold leading-tight">Konvèsasyon Sipo</p>
                                    <p className="text-[10px] text-black/40 dark:text-white/30 font-medium">{messages.length} mesaj</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Enliy</span>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 select-text" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12 gap-4 opacity-60">
                                    <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                                        <span className="material-symbols-outlined text-4xl text-primary">chat_bubble_outline</span>
                                    </div>
                                    <p className="text-base font-extrabold">Pa gen mesaj pou kounye a</p>
                                    <p className="text-sm max-w-xs leading-relaxed">Ekri premye mesaj ou a pou kòmanse diskisyon an. Ekip admin la ap reponn ou trè vit!</p>
                                </div>
                            ) : (
                                messages.map((m, i) => {
                                    const isMe = m.senderId === user?.uid;
                                    const prevMsg = messages[i - 1];
                                    const showSeparator = i === 0 || getDateKey(m.createdAt) !== getDateKey(prevMsg?.createdAt);
                                    return (
                                        <div key={m.id}>
                                            {showSeparator && renderDaySeparator(getDateLabel(m.createdAt), false)}
                                            <div className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                                                {!isMe && (
                                                    <span className="text-[10px] font-bold text-black/30 dark:text-white/25 px-1 uppercase tracking-wide">Admin</span>
                                                )}
                                                <div className={`max-w-[65%] rounded-2xl overflow-hidden shadow-sm ${
                                                    isMe
                                                        ? "bg-primary text-white rounded-tr-sm"
                                                        : "bg-black/[0.04] dark:bg-white/[0.06] text-black dark:text-white border border-black/[0.05] dark:border-white/[0.06] rounded-tl-sm"
                                                }`}>
                                                    {m.type === "image" && m.mediaUrl ? (
                                                        <div>
                                                            <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer">
                                                                <img src={m.mediaUrl} alt="Image" className="w-full max-w-[320px] object-cover hover:opacity-90 transition-opacity cursor-zoom-in" loading="lazy" />
                                                            </a>
                                                            {m.text && m.text !== "📷 Imaj" && <p className="px-4 py-2 text-[13px] whitespace-pre-wrap break-words">{m.text}</p>}
                                                        </div>
                                                    ) : m.type === "voice" && m.mediaUrl ? (
                                                        <div className="px-4 py-3 flex items-center gap-3 min-w-[200px]">
                                                            <button onClick={() => { const a = document.getElementById(`audio-${m.id}`) as HTMLAudioElement; a?.paused ? a?.play() : a?.pause(); }} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${isMe ? "bg-white/20 hover:bg-white/30" : "bg-primary/10 hover:bg-primary/20"}`}>
                                                                <span className={`material-symbols-outlined text-sm ${isMe ? "text-white" : "text-primary"}`}>play_arrow</span>
                                                            </button>
                                                            <div className="flex-1 flex flex-col gap-1.5">
                                                                <div className={`h-1 rounded-full overflow-hidden ${isMe ? "bg-white/20" : "bg-black/10 dark:bg-white/10"}`}>
                                                                    <div className={`h-full rounded-full w-0 ${isMe ? "bg-white/70" : "bg-primary/60"}`} />
                                                                </div>
                                                                <span className="text-[10px] opacity-50 font-medium">{formatDuration(m.voiceDuration || 0)}</span>
                                                            </div>
                                                            <audio id={`audio-${m.id}`} src={m.mediaUrl} preload="none" />
                                                        </div>
                                                    ) : (
                                                        <div className="px-4 py-2.5">
                                                            <p className="text-[13.5px] whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>
                                                        </div>
                                                    )}
                                                    {/* Time + read checkmarks */}
                                                    <div className={`flex items-center gap-1 px-4 pb-2 ${isMe ? "justify-end" : "justify-start"}`}>
                                                        <span className={`text-[9px] font-medium ${ isMe ? "text-white/50" : "text-black/30 dark:text-white/25"}`}>{formatTime(m.createdAt)}</span>
                                                        {isMe && m.isRead && <span className="text-[10px] text-[#4db8ff] font-black">✓✓</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input area — reuse existing renderer but override wrapper */}
                        <div className="shrink-0 border-t border-black/[0.05] dark:border-white/[0.05]">
                            {renderInputBar(false)}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} title="Echèk" message={errorMessage} type="alert" isDanger={true} />

            {/* ===== TOAST ===== */}
            {toast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
                    <div className="bg-gray-900/95 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl border border-white/10 flex items-center gap-2 animate-fade-in-up backdrop-blur-md whitespace-nowrap">
                        {toast}
                    </div>
                </div>
            )}
        </>
    );
}
