"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp, getDocs, where, writeBatch, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertCategory, AlertType } from "@/lib/types";

// Preset alert templates
const ALERT_PRESETS: {
    category: AlertCategory;
    type: AlertType;
    icon: string;
    iconColor: string;
    iconBg: string;
    defaultTitle: string;
    defaultBody: string;
    defaultActionLabel?: string;
    defaultActionUrl?: string;
}[] = [
    { category: "utility", type: "payment_success", icon: "payments", iconColor: "text-emerald-400", iconBg: "bg-emerald-400/10", defaultTitle: "Peman ou resevwa!", defaultBody: "Peman ou an konfime. Aksè ou bay kont ou kounye a.", defaultActionLabel: "Wè kontni mwen", defaultActionUrl: "/dashboard" },
    { category: "utility", type: "otp_login", icon: "lock", iconColor: "text-blue-400", iconBg: "bg-blue-400/10", defaultTitle: "Koneksyon nan kont ou", defaultBody: "Yon koneksyon nan kont ou fèk detekte. Si se pa ou, kontakte sipò a." },
    { category: "utility", type: "booking_reminder", icon: "event", iconColor: "text-orange-400", iconBg: "bg-orange-400/10", defaultTitle: "Rapèl konsiltasyon ou", defaultBody: "Konsiltasyon ou a prèske rele. Prepare w.", defaultActionLabel: "Wè detay", defaultActionUrl: "/consultation" },
    { category: "utility", type: "account_security", icon: "shield", iconColor: "text-red-400", iconBg: "bg-red-400/10", defaultTitle: "Alèt sekirite kont", defaultBody: "Gen aktivite sispèk sou kont ou. Verifye enfòmasyon ou yo." },
    { category: "utility", type: "course_access", icon: "play_circle", iconColor: "text-purple-400", iconBg: "bg-purple-400/10", defaultTitle: "Aksè fòmasyon ou konfime", defaultBody: "Ou ka kòmanse fòmasyon ou kounye a.", defaultActionLabel: "Kòmanse kounye a", defaultActionUrl: "/dashboard" },
    { category: "marketing", type: "new_course", icon: "school", iconColor: "text-blue-400", iconBg: "bg-blue-400/10", defaultTitle: "Nouvo fòmasyon disponib!", defaultBody: "Yon nouvo fòmasyon sou IA/Biznis sot lanse. Pa rate l!", defaultActionLabel: "Wè fòmasyon an", defaultActionUrl: "/products" },
    { category: "marketing", type: "promotion", icon: "local_offer", iconColor: "text-primary", iconBg: "bg-primary/10", defaultTitle: "Ofèt espesyal pou ou!", defaultBody: "Reduksyon eksklizif jis pou manm yo. Prese avan li fini!", defaultActionLabel: "Pwofite kounye a", defaultActionUrl: "/products" },
    { category: "marketing", type: "free_ebook", icon: "auto_stories", iconColor: "text-purple-400", iconBg: "bg-purple-400/10", defaultTitle: "Ebook gratis pou ou!", defaultBody: "Ou gen aksè ak yon ebook gratis. Telechaje li kounye a.", defaultActionLabel: "Telechaje", defaultActionUrl: "/products" },
    { category: "marketing", type: "webinar", icon: "live_tv", iconColor: "text-red-400", iconBg: "bg-red-400/10", defaultTitle: "Webinar an dirèk jodi a!", defaultBody: "Rantre nan sesyon an dirèk la kounye a. Plas yo limite!", defaultActionLabel: "Rantre", defaultActionUrl: "/consultation" },
    { category: "marketing", type: "reactivation", icon: "campaign", iconColor: "text-orange-400", iconBg: "bg-orange-400/10", defaultTitle: "Nou regrèt ou manke w!", defaultBody: "Sa gen lontan depi nou wè ou. Gen kontni nouvo ki tann ou.", defaultActionLabel: "Retounen", defaultActionUrl: "/dashboard" },
    { category: "utility", type: "maintenance", icon: "build", iconColor: "text-yellow-400", iconBg: "bg-yellow-400/10", defaultTitle: "🔧 Antretyen pwograme jodi a a 11PM", defaultBody: "Platfòm nan ka pa disponib pou anviwon 30 minit.", defaultActionLabel: "", defaultActionUrl: "" },
];

interface UserOption { uid: string; displayName: string; email: string; phone: string; }

interface SentAlert extends Alert { id: string; userEmail?: string; }

export default function AdminAlertsPage() {
    const { role, loading } = useAuth();
    const [users, setUsers] = useState<UserOption[]>([]);
    const [sentAlerts, setSentAlerts] = useState<SentAlert[]>([]);
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [tab, setTab] = useState<"send" | "history">("send");

    // Form state
    const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [title, setTitle] = useState(ALERT_PRESETS[0].defaultTitle);
    const [body, setBody] = useState(ALERT_PRESETS[0].defaultBody);
    const [actionUrl, setActionUrl] = useState(ALERT_PRESETS[0].defaultActionUrl || "");
    const [actionLabel, setActionLabel] = useState(ALERT_PRESETS[0].defaultActionLabel || "");

    // Search and Dropdown state for Custom Combobox
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (role !== "admin") return;
        // Load users for dropdown
        getDocs(collection(db, "users")).then((snap) => {
            setUsers(snap.docs.map((d) => {
                const data = d.data();
                return { 
                    uid: d.id, 
                    displayName: data.displayName || data.name || "Itilizatè", 
                    email: data.email || "", 
                    phone: data.phone || "" 
                };
            }));
        });
        // Real-time sent alerts history
        const q = query(collection(db, "alerts"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setSentAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SentAlert[]);
        });
        return () => unsub();
    }, [role]);

    const handlePresetChange = (idx: number) => {
        setSelectedPreset(idx);
        const p = ALERT_PRESETS[idx];
        setTitle(p.defaultTitle);
        setBody(p.defaultBody);
        setActionUrl(p.defaultActionUrl || "");
        setActionLabel(p.defaultActionLabel || "");
    };

    const handleSend = async () => {
        setSending(true);
        try {
            const preset = ALERT_PRESETS[selectedPreset];
            const baseAlert: any = {
                category: preset.category,
                type: preset.type,
                icon: preset.icon,
                iconColor: preset.iconColor,
                iconBg: preset.iconBg,
                title,
                body,
                isRead: false,
                createdAt: Timestamp.now(),
            };

            if (actionUrl) {
                baseAlert.actionUrl = actionUrl;
            }
            if (actionLabel) {
                baseAlert.actionLabel = actionLabel;
            }

            if (targetMode === "all") {
                // Chunk the writes in batches of 450 to avoid Firestore's 500 limit
                const chunkSize = 450;
                for (let i = 0; i < users.length; i += chunkSize) {
                    const chunk = users.slice(i, i + chunkSize);
                    const batch = writeBatch(db);
                    chunk.forEach((u) => {
                        const ref = doc(collection(db, "alerts"));
                        batch.set(ref, { ...baseAlert, userId: u.uid });
                    });
                    await batch.commit();
                }
            } else {
                await addDoc(collection(db, "alerts"), { ...baseAlert, userId: selectedUserId });
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            console.error("Error sending alerts:", e);
            alert("Erreur lors de l'envoi.");
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, "alerts", id));
    };

    const formatDate = (ts: any) => {
        if (!ts) return "";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    };

    if (loading || role !== "admin") return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Success toast */}
            {success && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Alèt yo voye avèk siksè!
                </div>
            )}

            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-black uppercase tracking-tighter italic">Notifikasyon & Alèt</h1>
                <p className="text-black/50 text-sm mt-2">Voye mesaj utilitè ak maketing bay itilizatè yo.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8">
                {(["send", "history"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${tab === t ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-black/5 text-black/60 hover:bg-black/10"}`}
                    >
                        {t === "send" ? "📤 Voye Alèt" : `📋 Istwa (${sentAlerts.length})`}
                    </button>
                ))}
            </div>

            {tab === "send" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Form */}
                    <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm space-y-6">
                        <h2 className="font-black text-lg uppercase tracking-tight">Konfigire alèt la</h2>

                        {/* Target */}
                        <div>
                            <label className="text-xs font-bold text-black/40 uppercase tracking-wider block mb-2">Destinatè</label>
                            <div className="flex gap-2">
                                {(["all", "specific"] as const).map((m) => (
                                    <button key={m} onClick={() => setTargetMode(m)}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${targetMode === m ? "bg-primary text-white border-primary" : "bg-black/5 border-black/10 text-black/60 hover:bg-black/10"}`}
                                    >
                                        {m === "all" ? "🌍 Tout itilizatè" : "👤 Yon sèl moun"}
                                    </button>
                                ))}
                            </div>
                            {targetMode === "specific" && (
                                <div className="relative mt-3">
                                    <div 
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full min-h-[52px] py-2 px-4 bg-black/5 border border-black/10 rounded-xl flex items-center justify-between cursor-pointer hover:bg-black/[0.08] transition-all"
                                    >
                                        {selectedUserId ? (
                                            (() => {
                                                const u = users.find(user => user.uid === selectedUserId);
                                                if (!u) return <span className="text-black/30 text-sm">— Chwazi yon itilizatè —</span>;
                                                const contactInfo = [u.email, u.phone].filter(Boolean).join(" / ");
                                                return (
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-bold text-sm text-black leading-tight">{u.displayName}</span>
                                                        {contactInfo && <span className="text-[12px] text-black/40 mt-0.5">{contactInfo}</span>}
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <span className="text-black/30 text-sm">— Chwazi yon itilizatè —</span>
                                        )}
                                        <span className="material-symbols-outlined text-black/40">unfold_more</span>
                                    </div>

                                    {isDropdownOpen && (
                                        <>
                                            {/* Click outside overlay */}
                                            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                                            
                                            {/* Dropdown list */}
                                            <div className="absolute z-50 w-full mt-2 bg-white border border-black/10 rounded-2xl shadow-xl overflow-hidden p-2 space-y-1">
                                                <div className="flex items-center gap-2 px-3 py-2 border-b border-black/5 mb-1">
                                                    <span className="material-symbols-outlined text-black/30 text-sm">search</span>
                                                    <input 
                                                        type="text" 
                                                        value={searchQuery} 
                                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                                        placeholder="Chèche pa non, imel oswa telefòn..." 
                                                        className="w-full bg-transparent outline-none text-sm placeholder:text-black/30 text-black"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-60 overflow-y-auto space-y-0.5">
                                                    {users.filter(u => 
                                                        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                        u.phone.includes(searchQuery)
                                                    ).map((u) => {
                                                        const contactInfo = [u.email, u.phone].filter(Boolean).join(" / ");
                                                        return (
                                                            <button
                                                                key={u.uid}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedUserId(u.uid);
                                                                    setIsDropdownOpen(false);
                                                                    setSearchQuery("");
                                                                }}
                                                                className={`w-full text-left px-3 py-2 rounded-xl flex flex-col transition-all ${selectedUserId === u.uid ? 'bg-primary/10 border-primary' : 'hover:bg-black/5'}`}
                                                            >
                                                                <span className="font-bold text-sm text-black leading-tight">{u.displayName}</span>
                                                                {contactInfo && <span className="text-[12px] text-black/40 mt-0.5">{contactInfo}</span>}
                                                            </button>
                                                        );
                                                    })}
                                                    {users.filter(u => 
                                                        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                        u.phone.includes(searchQuery)
                                                    ).length === 0 && (
                                                        <p className="text-center py-6 text-xs text-black/40 font-bold uppercase tracking-wider">Okenn rezilta jwenn</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Preset */}
                        <div>
                            <label className="text-xs font-bold text-black/40 uppercase tracking-wider block mb-2">Modèl alèt</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ALERT_PRESETS.map((p, i) => (
                                    <button key={i} onClick={() => handlePresetChange(i)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left ${selectedPreset === i ? "bg-primary/10 border-primary text-primary" : "bg-black/5 border-black/10 text-black/60 hover:bg-black/10"}`}
                                    >
                                        <span className={`material-symbols-outlined text-base ${p.iconColor}`}>{p.icon}</span>
                                        <span className="truncate">{p.type.replace(/_/g, " ")}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-xs font-bold text-black/40 uppercase tracking-wider block mb-2">Tit</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)}
                                className="w-full h-11 px-4 bg-black/5 border border-black/10 rounded-xl text-sm outline-none focus:border-primary transition-all"
                                placeholder="Tit notifikasyon an..."
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label className="text-xs font-bold text-black/40 uppercase tracking-wider block mb-2">Mesaj</label>
                            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
                                className="w-full px-4 py-3 bg-black/5 border border-black/10 rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
                                placeholder="Deskripsyon notifikasyon an..."
                            />
                        </div>

                        {/* Action */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-black/40 uppercase tracking-wider block mb-2">Bouton tèks</label>
                                <input value={actionLabel} onChange={(e) => setActionLabel(e.target.value)}
                                    className="w-full h-10 px-3 bg-black/5 border border-black/10 rounded-xl text-xs outline-none focus:border-primary transition-all"
                                    placeholder="Wè detay"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-black/40 uppercase tracking-wider block mb-2">Lyen URL</label>
                                <input value={actionUrl} onChange={(e) => setActionUrl(e.target.value)}
                                    className="w-full h-10 px-3 bg-black/5 border border-black/10 rounded-xl text-xs outline-none focus:border-primary transition-all"
                                    placeholder="/dashboard"
                                />
                            </div>
                        </div>

                        <button onClick={handleSend} disabled={sending || (targetMode === "specific" && !selectedUserId)}
                            className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {sending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-xl">send</span>}
                            {sending ? "Ap voye..." : targetMode === "all" ? `Voye bay ${users.length} itilizatè` : "Voye alèt la"}
                        </button>
                    </div>

                    {/* Right: Preview */}
                    <div className="space-y-4">
                        <h2 className="font-black text-sm uppercase tracking-widest text-black/40">Aperçu</h2>
                        <div className="bg-[#0e0e0e] rounded-3xl p-6 border border-white/5">
                            <div className="flex gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                                <div className={`w-11 h-11 rounded-xl ${ALERT_PRESETS[selectedPreset].iconBg} flex items-center justify-center shrink-0`}>
                                    <span className={`material-symbols-outlined text-xl ${ALERT_PRESETS[selectedPreset].iconColor}`}>{ALERT_PRESETS[selectedPreset].icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-black text-white leading-tight">{title || "Tit notifikasyon an..."}</p>
                                        <span className="text-[10px] text-white/30 font-bold shrink-0">Kounye a</span>
                                    </div>
                                    <p className="text-xs text-white/50 mt-1 leading-relaxed">{body || "Mesaj notifikasyon an..."}</p>
                                    {actionLabel && (
                                        <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-black text-primary uppercase tracking-wide">
                                            {actionLabel}
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Non li — aparèt nan onglèt {ALERT_PRESETS[selectedPreset].category === "utility" ? "Utilitè" : "Pwomosyon"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* History */
                <div className="space-y-3">
                    {sentAlerts.length === 0 ? (
                        <div className="text-center py-20 bg-black/5 border border-dashed border-black/10 rounded-3xl">
                            <span className="material-symbols-outlined text-4xl text-black/20">notifications_off</span>
                            <p className="text-black/40 font-bold uppercase tracking-widest text-xs mt-4">Okenn alèt voye</p>
                        </div>
                    ) : (
                        sentAlerts.map((alert) => (
                            <div key={alert.id} className="bg-white border border-black/5 rounded-2xl p-5 flex items-start gap-4 group hover:shadow-md transition-all">
                                <div className={`w-10 h-10 rounded-xl ${alert.iconBg} flex items-center justify-center shrink-0`}>
                                    <span className={`material-symbols-outlined text-lg ${alert.iconColor}`}>{alert.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-sm">{alert.title}</p>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${alert.category === "utility" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
                                            {alert.category}
                                        </span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${alert.isRead ? "bg-gray-100 text-gray-500" : "bg-primary/10 text-primary"}`}>
                                            {alert.isRead ? "Li" : "Pa li"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-black/50 mt-1 truncate">{alert.body}</p>
                                    <p className="text-[10px] text-black/30 mt-1 font-bold">{formatDate(alert.createdAt)}</p>
                                </div>
                                <button onClick={() => handleDelete(alert.id)}
                                    className="size-9 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
