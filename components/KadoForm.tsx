"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createGift, updateGift } from "@/lib/gifts";
import { Gift } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface ProductOption {
    id: string;
    title: string;
    type: 'course' | 'ebook' | 'service';
    thumbnailUrl?: string;
}

interface KadoFormProps {
    initialData?: Gift;
    giftId?: string;
}

export default function KadoForm({ initialData, giftId }: KadoFormProps) {
    const router = useRouter();
    const isEditing = !!giftId;

    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Form state
    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [photoLink, setPhotoLink] = useState(initialData?.photoLink || "");
    const [triggerProductId, setTriggerProductId] = useState(initialData?.triggerProductId || "");
    const [giftProductId, setGiftProductId] = useState(initialData?.giftProductId || "");
    const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

    // Options avancées
    const [hasExpiration, setHasExpiration] = useState(!!initialData?.expirationDate);
    const [expirationDate, setExpirationDate] = useState(
        initialData?.expirationDate ? initialData.expirationDate.toDate().toISOString().split("T")[0] : ""
    );
    const [hasMaxUses, setHasMaxUses] = useState(initialData?.maxUses !== null && initialData?.maxUses !== undefined);
    const [maxUses, setMaxUses] = useState(initialData?.maxUses?.toString() || "");
    const [requiresInvitation, setRequiresInvitation] = useState(initialData?.requiresInvitation || false);
    const [invitationCode, setInvitationCode] = useState(initialData?.invitationCode || "");

    // Charger tous les produits (cours + ebooks + services)
    useEffect(() => {
        const load = async () => {
            try {
                const [coursesSnap, ebooksSnap, servicesSnap] = await Promise.all([
                    getDocs(collection(db, "courses")),
                    getDocs(collection(db, "ebooks")),
                    getDocs(collection(db, "services")),
                ]);

                const all: ProductOption[] = [
                    ...coursesSnap.docs.map(d => ({
                        id: d.id, title: d.data().title || "Sans titre", type: "course" as const,
                        thumbnailUrl: d.data().thumbnail || d.data().coverImage
                    })),
                    ...ebooksSnap.docs.map(d => ({
                        id: d.id, title: d.data().title || "Sans titre", type: "ebook" as const,
                        thumbnailUrl: d.data().coverImage
                    })),
                    ...servicesSnap.docs.map(d => ({
                        id: d.id, title: d.data().title || "Sans titre", type: "service" as const,
                        thumbnailUrl: d.data().imageUrl
                    })),
                ];
                setProducts(all);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingProducts(false);
            }
        };
        load();
    }, []);

    const selectedGiftProduct = products.find(p => p.id === giftProductId);
    const giftType = selectedGiftProduct?.type || "course";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!title.trim()) return setError("Le titre est requis.");
        if (!triggerProductId) return setError("Sélectionnez un produit déclencheur.");
        if (!giftProductId) return setError("Sélectionnez un produit à offrir.");
        if (triggerProductId === giftProductId) return setError("Le produit déclencheur et le cadeau doivent être différents.");
        if (requiresInvitation && !invitationCode.trim()) return setError("Saisissez un code d'invitation.");

        setSaving(true);
        try {
            const data: Omit<Gift, "id" | "createdAt" | "currentUsesCount"> = {
                title: title.trim(),
                description: description.trim(),
                photoLink: photoLink.trim(),
                type: giftType === "service" ? "consultation" : giftType,
                triggerProductId,
                giftProductId,
                giftProductTitle: selectedGiftProduct?.title || "",
                giftProductType: giftType,
                giftProductThumbnailUrl: selectedGiftProduct?.thumbnailUrl || "",
                isActive,
                expirationDate: hasExpiration && expirationDate
                    ? Timestamp.fromDate(new Date(expirationDate))
                    : null,
                maxUses: hasMaxUses && maxUses ? parseInt(maxUses) : null,
                requiresInvitation,
                invitationCode: requiresInvitation ? invitationCode.trim().toUpperCase() : null,
            };

            if (isEditing) {
                await updateGift(giftId, data);
            } else {
                await createGift(data);
            }

            router.push("/admin/kado");
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue.");
            setSaving(false);
        }
    };

    const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => (
        <div className="flex items-start justify-between gap-4 py-4 border-b border-black/5 last:border-0">
            <div>
                <p className="text-sm font-bold">{label}</p>
                {description && <p className="text-xs text-black/40 mt-0.5">{description}</p>}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${checked ? "bg-primary" : "bg-black/10"}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
            </button>
        </div>
    );

    const ProductSelect = ({ value, onChange, label, excludeId }: { value: string; onChange: (v: string) => void; label: string; excludeId?: string }) => {
        const typeLabel: Record<string, string> = { course: "📚 Cours", ebook: "📖 Ebook", service: "🗓️ Consultation" };
        const grouped = ["course", "ebook", "service"].map(type => ({
            type, items: products.filter(p => p.type === type && p.id !== excludeId)
        })).filter(g => g.items.length > 0);

        return (
            <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">{label}</label>
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                    <option value="">— Sélectionner un produit —</option>
                    {loadingProducts ? (
                        <option disabled>Chargement...</option>
                    ) : (
                        grouped.map(group => (
                            <optgroup key={group.type} label={typeLabel[group.type]}>
                                {group.items.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </optgroup>
                        ))
                    )}
                </select>
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.push("/admin/kado")} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-all">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">{isEditing ? "Modifier le Kado" : "Créer un Kado"}</h1>
                    <p className="text-xs text-black/40">Un cadeau offert automatiquement lors d'un achat</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section principale */}
                <div className="bg-white border border-black/5 rounded-2xl p-6 space-y-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Informations du cadeau</h2>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Titre du Kado *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Bonus exclusif — Guide des stratégies"
                            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Décrivez brièvement ce cadeau..."
                            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">URL de l'image</label>
                        <input
                            type="url"
                            value={photoLink}
                            onChange={e => setPhotoLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        {photoLink && (
                            <div className="mt-2 h-32 rounded-xl overflow-hidden border border-black/5">
                                <img src={photoLink} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Produits */}
                <div className="bg-white border border-black/5 rounded-2xl p-6 space-y-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Association des produits</h2>

                    <ProductSelect
                        value={triggerProductId}
                        onChange={setTriggerProductId}
                        label="Produit déclencheur (celui que le client achète) *"
                        excludeId={giftProductId}
                    />

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-black/5" />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full">
                            <span className="material-symbols-outlined text-orange-500 text-sm">redeem</span>
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Cadeau offert</span>
                        </div>
                        <div className="flex-1 h-px bg-black/5" />
                    </div>

                    <ProductSelect
                        value={giftProductId}
                        onChange={setGiftProductId}
                        label="Produit à débloquer gratuitement *"
                        excludeId={triggerProductId}
                    />

                    {selectedGiftProduct && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                            <p className="text-xs font-medium text-emerald-700">
                                <span className="font-bold">{selectedGiftProduct.title}</span>
                                <span className="text-emerald-600/60"> sera débloqué gratuitement ({selectedGiftProduct.type})</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Options avancées */}
                <div className="bg-white border border-black/5 rounded-2xl p-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Options avancées</h2>
                    <p className="text-xs text-black/30 mb-6">Configurez les restrictions et conditions du cadeau</p>

                    <Toggle
                        checked={isActive}
                        onChange={setIsActive}
                        label="Kado actif"
                        description="Désactivez pour suspendre temporairement le cadeau"
                    />

                    <Toggle
                        checked={hasExpiration}
                        onChange={v => { setHasExpiration(v); if (!v) setExpirationDate(""); }}
                        label="Limiter dans le temps"
                        description="Le cadeau ne sera plus disponible après cette date"
                    />
                    {hasExpiration && (
                        <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
                            <input
                                type="date"
                                value={expirationDate}
                                onChange={e => setExpirationDate(e.target.value)}
                                className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mt-2"
                            />
                        </div>
                    )}

                    <Toggle
                        checked={hasMaxUses}
                        onChange={v => { setHasMaxUses(v); if (!v) setMaxUses(""); }}
                        label="Limiter la quantité"
                        description="Nombre maximum d'utilisateurs pouvant réclamer ce cadeau"
                    />
                    {hasMaxUses && (
                        <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
                            <input
                                type="number"
                                value={maxUses}
                                onChange={e => setMaxUses(e.target.value)}
                                min="1"
                                placeholder="Ex: 50"
                                className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mt-2"
                            />
                        </div>
                    )}

                    <Toggle
                        checked={requiresInvitation}
                        onChange={v => { setRequiresInvitation(v); if (!v) setInvitationCode(""); }}
                        label="Code d'invitation requis"
                        description="L'utilisateur devra saisir un code secret pour réclamer le cadeau"
                    />
                    {requiresInvitation && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <input
                                type="text"
                                value={invitationCode}
                                onChange={e => setInvitationCode(e.target.value.toUpperCase())}
                                placeholder="Ex: KADO-DJR-2025"
                                className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mt-2"
                            />
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                        <span className="material-symbols-outlined text-base">error</span>
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 rounded-xl font-black uppercase text-sm tracking-wide transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {saving ? "Enregistrement..." : isEditing ? "Mettre à jour le Kado" : "Créer le Kado"}
                </button>
            </form>
        </div>
    );
}
