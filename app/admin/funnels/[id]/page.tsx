"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FunnelData } from "@/lib/types";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function AdminFunnelEditor() {
    const router = useRouter();
    const params = useParams();
    const isNew = params.id === "new";
    const funnelId = isNew ? "" : (params.id as string);

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    
    // Pour la liaison avec un produit existant
    const [availableProducts, setAvailableProducts] = useState<{id: string, title: string, type: string}[]>([]);

    const [formData, setFormData] = useState<Partial<FunnelData>>({
        id: "",
        linkedProductId: "",
        linkedProductType: "course",
        badge: "🔥 Offre Limitée • Se termine bientôt",
        headline: "",
        subheadline: "et génère tes premiers **1 000$ par mois**",
        videoUrl: "",
        videoPoster: "",
        ctaText: "OUI ! Je veux accéder maintenant →",
        ctaSubtext: "Accès immédiat · Paiement sécurisé · Sans engagement",
        urgencyText: "⚠️ Ce prix expire dans :",
        originalPrice: 197,
        currentPrice: 47,
        priceGourdes: 6500,
        lemonSqueezyId: "",
        currency: "$",
        spotsLeft: 7,
        expirationDate: null,
        benefits: [
            { icon: "🎯", text: "Stratégie complète" }
        ],
        testimonials: [],
        isActive: true
    });

    // Chargement des données
    useEffect(() => {
        const fetchInitialData = async () => {
            // 1. Charger les produits disponibles
            try {
                const coursesSnap = await getDocs(collection(db, "courses"));
                const ebooksSnap = await getDocs(collection(db, "ebooks"));
                
                const products = [
                    ...coursesSnap.docs.map(d => ({ id: d.id, title: d.data().title || 'Cours sans titre', type: 'course' })),
                    ...ebooksSnap.docs.map(d => ({ id: d.id, title: d.data().title || 'Ebook sans titre', type: 'ebook' }))
                ];
                setAvailableProducts(products);
            } catch (err) {
                console.error("Erreur chargement produits:", err);
            }

            // 2. Charger le funnel si on édite
            if (!isNew && funnelId) {
                try {
                    const docRef = doc(db, "funnels", funnelId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data() as FunnelData;
                        
                        // Conversion de la date d'expiration pour l'input datetime-local
                        let expDateStr = "";
                        if (data.expirationDate) {
                            const dateObj = typeof data.expirationDate === 'string' 
                                ? new Date(data.expirationDate) 
                                : (data.expirationDate as any).toDate ? (data.expirationDate as any).toDate() : null;
                            if (dateObj) {
                                // Format "YYYY-MM-DDThh:mm" pour l'input
                                expDateStr = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                            }
                        }

                        setFormData({
                            ...data,
                            id: docSnap.id,
                            expirationDate: expDateStr as any
                        });
                    } else {
                        alert("Page non trouvée");
                        router.push("/admin/funnels");
                    }
                } catch (error) {
                    console.error("Erreur de récupération:", error);
                }
            }
            setLoading(false);
        };

        fetchInitialData();
    }, [isNew, funnelId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Si c'est nouveau, on utilise le slug entré par l'utilisateur comme ID
        const finalId = isNew ? formData.id?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : funnelId;
        
        if (!finalId) {
            alert("L'identifiant (Slug) est obligatoire.");
            return;
        }

        setSaving(true);
        try {
            // Préparation des données
            const dataToSave: any = { ...formData };
            
            // Conversion de la date en Timestamp si elle existe
            if (dataToSave.expirationDate) {
                dataToSave.expirationDate = new Date(dataToSave.expirationDate).toISOString();
            } else {
                dataToSave.expirationDate = null;
            }

            // Nettoyage de l'ID qui ne doit pas forcément être dans le corps du document si on utilise document ID
            delete dataToSave.id;

            dataToSave.updatedAt = Timestamp.now();
            if (isNew) dataToSave.createdAt = Timestamp.now();

            await setDoc(doc(db, "funnels", finalId), dataToSave, { merge: true });
            
            setShowSuccessPopup(true);
        } catch (error) {
            console.error("Erreur lors de l'enregistrement:", error);
            alert("Erreur lors de l'enregistrement.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/admin/funnels" className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">
                        {isNew ? "Nouvelle Page de Vente" : "Éditer la Page de Vente"}
                    </h1>
                    <p className="text-sm text-black/50 dark:text-white/50">
                        {isNew ? "Créez un nouveau tunnel dynamique." : `Modification de /start/${funnelId}`}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* ── IDENTIFIANT ET LIAISON ── */}
                <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-black/5 dark:border-white/10 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-4 border-b border-black/5 dark:border-white/10 pb-2">Configuration de base</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">Identifiant URL (Slug) *</label>
                            <input
                                type="text"
                                required
                                disabled={!isNew}
                                value={formData.id || ''}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                placeholder="ex: mon-super-ebook"
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
                            />
                            {isNew && <p className="text-[10px] text-black/40 mt-1">L'URL sera: tonsite.com/start/<strong>{formData.id || '...'}</strong></p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Produit lié (Optionnel)</label>
                            <select
                                value={`${formData.linkedProductType}:${formData.linkedProductId}`}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val || val === ":") {
                                        setFormData({ ...formData, linkedProductId: "", linkedProductType: "course" });
                                    } else {
                                        const [type, id] = val.split(':');
                                        setFormData({ ...formData, linkedProductType: type as any, linkedProductId: id });
                                    }
                                }}
                                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-4 py-2 text-sm"
                            >
                                <option value=":">-- Aucun produit lié (Indépendant) --</option>
                                <optgroup label="Formations">
                                    {availableProducts.filter(p => p.type === 'course').map(p => (
                                        <option key={p.id} value={`course:${p.id}`}>{p.title}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Ebooks">
                                    {availableProducts.filter(p => p.type === 'ebook').map(p => (
                                        <option key={p.id} value={`ebook:${p.id}`}>{p.title}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 pt-2">
                        <input 
                            type="checkbox" 
                            id="isActive" 
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 rounded text-primary focus:ring-primary bg-black/5 border-transparent"
                        />
                        <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Page de vente active (Publique)</label>
                    </div>
                </div>

                {/* ── TEXTES & MEDIAS ── */}
                <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-black/5 dark:border-white/10 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-4 border-b border-black/5 dark:border-white/10 pb-2">Contenu & Médias</h2>
                    
                    <div>
                        <label className="block text-xs font-bold mb-1">Badge (Texte au dessus du titre)</label>
                        <input type="text" value={formData.badge || ''} onChange={(e) => setFormData({ ...formData, badge: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Titre principal (Headline) *</label>
                        <input type="text" required value={formData.headline || ''} onChange={(e) => setFormData({ ...formData, headline: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Sous-titre (Subheadline - supporte le markdown **gras**)</label>
                        <input type="text" value={formData.subheadline || ''} onChange={(e) => setFormData({ ...formData, subheadline: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">URL Vidéo (ex: YouTube embed)</label>
                            <input type="text" value={formData.videoUrl || ''} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Image de couverture vidéo (Poster URL)</label>
                            <input type="text" value={formData.videoPoster || ''} onChange={(e) => setFormData({ ...formData, videoPoster: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm" />
                        </div>
                    </div>
                </div>

                {/* ── PRIX & PAIEMENT ── */}
                <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-black/5 dark:border-white/10 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-4 border-b border-black/5 dark:border-white/10 pb-2">Prix & Méthodes de Paiement</h2>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">Prix Barré</label>
                            <input type="number" value={formData.originalPrice || 0} onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Prix Actuel *</label>
                            <input type="number" required value={formData.currentPrice || 0} onChange={(e) => setFormData({ ...formData, currentPrice: Number(e.target.value) })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Devise affichée</label>
                            <input type="text" value={formData.currency || '$'} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                            <label className="block text-xs font-bold text-orange-600 mb-1">Prix MonCash (HTG) *</label>
                            <p className="text-[10px] text-orange-600/70 mb-2">Montant exact à payer via le portail Haïtien.</p>
                            <input type="number" required value={formData.priceGourdes || 0} onChange={(e) => setFormData({ ...formData, priceGourdes: Number(e.target.value) })} className="w-full bg-white dark:bg-black/50 border border-transparent rounded-lg px-4 py-2 text-sm font-bold" />
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                            <label className="block text-xs font-bold text-blue-600 mb-1">ID Lemon Squeezy (Carte/PayPal)</label>
                            <p className="text-[10px] text-blue-600/70 mb-2">L'ID du produit/variante pour générer le lien de checkout.</p>
                            <input type="text" value={formData.lemonSqueezyId || ''} onChange={(e) => setFormData({ ...formData, lemonSqueezyId: e.target.value })} placeholder="ex: 123456" className="w-full bg-white dark:bg-black/50 border border-transparent rounded-lg px-4 py-2 text-sm font-bold" />
                        </div>
                    </div>
                </div>

                {/* ── AVANTAGES (BENEFITS) ── */}
                <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-black/5 dark:border-white/10 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2 mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Avantages & Bénéfices</h2>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, benefits: [...(prev.benefits || []), { icon: "🎯", text: "" }] }))}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-xs">add</span> Ajouter un bénéfice
                        </button>
                    </div>

                    <div className="space-y-3">
                        {formData.benefits?.map((benefit, index) => (
                            <div key={index} className="flex gap-2 items-center bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl border border-black/5 dark:border-white/5">
                                <input
                                    type="text"
                                    value={benefit.icon}
                                    placeholder="🎯"
                                    onChange={(e) => {
                                        const newBenefits = [...(formData.benefits || [])];
                                        newBenefits[index].icon = e.target.value;
                                        setFormData({ ...formData, benefits: newBenefits });
                                    }}
                                    className="w-12 text-center bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-2 py-2 text-sm"
                                />
                                <input
                                    type="text"
                                    value={benefit.text}
                                    placeholder="Ex: Stratégie complète en 6 modules"
                                    onChange={(e) => {
                                        const newBenefits = [...(formData.benefits || [])];
                                        newBenefits[index].text = e.target.value;
                                        setFormData({ ...formData, benefits: newBenefits });
                                    }}
                                    className="flex-1 bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newBenefits = (formData.benefits || []).filter((_, i) => i !== index);
                                        setFormData({ ...formData, benefits: newBenefits });
                                    }}
                                    className="text-red-500 hover:text-red-700 flex items-center justify-center p-2"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── TEMOIGNAGES (TESTIMONIALS) ── */}
                <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-black/5 dark:border-white/10 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2 mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Témoignages Clients</h2>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, testimonials: [...(prev.testimonials || []), { name: "", role: "", text: "", avatar: `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70)}`, stars: 5 }] }))}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-xs">add</span> Ajouter un témoignage
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.testimonials?.map((testimonial, index) => (
                            <div key={index} className="bg-black/[0.02] dark:bg-white/[0.02] p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3 relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newTestimonials = (formData.testimonials || []).filter((_, i) => i !== index);
                                        setFormData({ ...formData, testimonials: newTestimonials });
                                    }}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 flex items-center justify-center p-2"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Nom complet</label>
                                        <input
                                            type="text"
                                            value={testimonial.name}
                                            placeholder="Ex: Marie L."
                                            onChange={(e) => {
                                                const newT = [...(formData.testimonials || [])];
                                                newT[index].name = e.target.value;
                                                setFormData({ ...formData, testimonials: newT });
                                            }}
                                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Rôle / Métier</label>
                                        <input
                                            type="text"
                                            value={testimonial.role}
                                            placeholder="Ex: Entrepreneure"
                                            onChange={(e) => {
                                                const newT = [...(formData.testimonials || [])];
                                                newT[index].role = e.target.value;
                                                setFormData({ ...formData, testimonials: newT });
                                            }}
                                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">URL Avatar (Photo)</label>
                                        <input
                                            type="text"
                                            value={testimonial.avatar}
                                            onChange={(e) => {
                                                const newT = [...(formData.testimonials || [])];
                                                newT[index].avatar = e.target.value;
                                                setFormData({ ...formData, testimonials: newT });
                                            }}
                                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Note (Étoiles : 1-5)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={testimonial.stars}
                                            onChange={(e) => {
                                                const newT = [...(formData.testimonials || [])];
                                                newT[index].stars = Number(e.target.value);
                                                setFormData({ ...formData, testimonials: newT });
                                            }}
                                            className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-3 py-1.5 text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Commentaire</label>
                                    <textarea
                                        value={testimonial.text}
                                        placeholder="Ex: J'ai généré mes premiers 2000$..."
                                        rows={2}
                                        onChange={(e) => {
                                            const newT = [...(formData.testimonials || [])];
                                            newT[index].text = e.target.value;
                                            setFormData({ ...formData, testimonials: newT });
                                        }}
                                        className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-3 py-1.5 text-xs"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── URGENCE & DISPONIBILITE ── */}
                <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-black/5 dark:border-white/10 space-y-4 shadow-sm">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-4 border-b border-black/5 dark:border-white/10 pb-2">Urgence & Rareté</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">Nombre de places restantes</label>
                            <input type="number" value={formData.spotsLeft || 0} onChange={(e) => setFormData({ ...formData, spotsLeft: Number(e.target.value) })} className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Date limite absolue (Optionnelle)</label>
                            <input 
                                type="datetime-local" 
                                value={formData.expirationDate as string || ''} 
                                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value || null })} 
                                className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-4 py-2 text-sm" 
                            />
                            <p className="text-[10px] text-black/40 mt-1">Si définie, l'offre expirera exactement à cette date.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-black/10 dark:border-white/10 flex justify-end gap-3">
                    <Link href="/admin/funnels" className="px-6 py-3 rounded-xl font-bold text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors">
                        Annuler
                    </Link>
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="px-8 py-3 rounded-xl font-bold text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {saving ? "Enregistrement..." : "Enregistrer la Page"}
                    </button>
                </div>

            </form>

            {/* SUCCESS POPUP MODAL */}
            {showSuccessPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300">
                    <style>{`
                        @keyframes scaleIn {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        .animate-scale-in {
                            animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                        }
                    `}</style>
                    <div className="bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden text-center animate-scale-in">
                        {/* Vibrant decorative bar */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600"></div>
                        
                        {/* Glowing Checkmark Icon */}
                        <div className="mx-auto size-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-4xl text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                                check_circle
                            </span>
                        </div>

                        <h2 className="text-2xl font-black tracking-tight mb-3 text-black dark:text-white uppercase">
                            Enregistré avec succès ! 🎉
                        </h2>
                        
                        <p className="text-sm text-black/60 dark:text-white/60 mb-8 leading-relaxed">
                            Votre page de vente dynamique (funnel) a été enregistrée avec succès et est prête à l'emploi.
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                setShowSuccessPopup(false);
                                router.push("/admin/funnels");
                            }}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-green-500/20 active:scale-95 shadow-md cursor-pointer"
                        >
                            Super, merci !
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
