"use client";

import { useState, useEffect, useRef } from "react";
import { StorageAsset } from "@/lib/types";
import { getAssets, uploadFile, deleteAsset } from "@/lib/storage";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function StoragePage() {
    const [filter, setFilter] = useState("Tous les fichiers");
    const [assets, setAssets] = useState<StorageAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI State
    const [assetToDelete, setAssetToDelete] = useState<StorageAsset | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string } | null>(null);

    // Fetch Assets
    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const data = await getAssets();
            setAssets(data);
        } catch (error) {
            console.error("Error loading assets:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredAssets = assets.filter(asset => {
        if (filter === "Tous les fichiers") return true;
        if (filter === "Images") return asset.contentType.startsWith("image/");
        if (filter === "Vidéos") return asset.contentType.startsWith("video/");
        if (filter === "Documents") return asset.contentType.includes("pdf") || asset.contentType.includes("doc") || asset.contentType.includes("txt");
        if (filter === "Archives") return asset.contentType.includes("zip") || asset.contentType.includes("rar") || asset.contentType.includes("compressed");
        return true;
    });

    // Handle Upload
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                setUploading(true);
                await uploadFile(file);
                await loadAssets(); // Refresh list
            } catch (error) {
                console.error("Upload failed", error);
                setAlertConfig({ isOpen: true, title: "Échec de l'upload", message: "Une erreur est survenue lors du téléchargement du fichier." });
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        }
    };

    // Handle Delete
    const confirmDelete = async () => {
        if (!assetToDelete) return;
        setIsDeleting(true);
        try {
            await deleteAsset(assetToDelete);
            setAssets(assets.filter(a => a.id !== assetToDelete.id));
            setAssetToDelete(null);
        } catch (error) {
            console.error("Delete failed", error);
            setAlertConfig({ isOpen: true, title: "Erreur", message: "Impossible de supprimer le fichier." });
        } finally {
            setIsDeleting(false);
        }
    };

    // Copy URL
    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        setAlertConfig({ isOpen: true, title: "Lien copié !", message: "L'URL du fichier a été copiée dans le presse-papier." });
    };

    // Stats Calculation
    const totalFiles = assets.length;
    const totalSize = assets.reduce((acc, curr) => acc + curr.sizeBytes, 0);
    const formattedTotalSize = (totalSize / (1024 * 1024)).toFixed(2) + " MB";
    const avgSize = totalFiles > 0 ? (totalSize / totalFiles / (1024 * 1024)).toFixed(2) + " MB" : "0 MB";

    return (
        <main className="max-w-[1400px] w-full animate-in fade-in duration-700">
            {/* Hidden Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-black dark:text-white">Gestionnaire de Stockage</h2>
                    <p className="text-black/60 dark:text-white/60 mt-2">Gérez vos fichiers et assets cloud.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-primary text-white dark:bg-white dark:text-primary px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 dark:shadow-white/20 disabled:opacity-50"
                    >
                        {uploading ? (
                            <span className="material-symbols-outlined animate-spin">refresh</span>
                        ) : (
                            <span className="material-symbols-outlined text-[20px]">upload</span>
                        )}
                        {uploading ? "Importation..." : "Importer un fichier"}
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-black/40 dark:text-white/40 font-bold text-xs uppercase tracking-widest">Total Fichiers</span>
                        <span className="material-symbols-outlined text-black/20 dark:text-white/20">description</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-black dark:text-white">{totalFiles}</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-black/40 dark:text-white/40 font-bold text-xs uppercase tracking-widest">Espace Utilisé</span>
                        <span className="material-symbols-outlined text-black/20 dark:text-white/20">cloud_done</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-black dark:text-white">{formattedTotalSize}</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-black/40 dark:text-white/40 font-bold text-xs uppercase tracking-widest">Taille Moyenne</span>
                        <span className="material-symbols-outlined text-black/20 dark:text-white/20">straighten</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-black dark:text-white">{avgSize}</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex overflow-x-auto gap-2 pb-6 no-scrollbar mb-6">
                {["Tous les fichiers", "Images", "Vidéos", "Documents", "Archives"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filter === f
                            ? "bg-primary text-white dark:bg-white dark:text-primary"
                            : "bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10"
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* File Grid */}
            {loading ? (
                <div className="text-center py-20 opacity-50">Chargement des fichiers...</div>
            ) : filteredAssets.length === 0 ? (
                <div className="text-center py-20 opacity-50">Aucun fichier trouvé.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAssets.map((asset) => (
                        <div key={asset.id} className="group bg-white dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            {asset.contentType.startsWith("image/") ? (
                                <div className="aspect-square relative overflow-hidden bg-black/5 dark:bg-white/5">
                                    <img
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        src={asset.url}
                                        alt={asset.name}
                                    />
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button
                                            onClick={() => setAssetToDelete(asset)}
                                            className="bg-white/90 dark:bg-black/90 backdrop-blur p-2 rounded-full shadow-lg hover:bg-red-500 hover:text-white text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-square relative overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <span className="material-symbols-outlined text-6xl text-black/20 dark:text-white/20 group-hover:scale-110 transition-transform duration-300">
                                            {asset.contentType.startsWith("video/") ? "play_circle" :
                                                asset.contentType.includes("pdf") ? "picture_as_pdf" : "description"}
                                        </span>
                                        <span className="text-xs font-bold text-black/30 dark:text-white/30 uppercase tracking-widest">{asset.type}</span>
                                    </div>
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button
                                            onClick={() => setAssetToDelete(asset)}
                                            className="bg-white/90 dark:bg-black/90 backdrop-blur p-2 rounded-full shadow-lg hover:bg-red-500 hover:text-white text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="p-5">
                                <div className="flex items-start justify-between mb-1">
                                    <h3 className="font-bold text-black dark:text-white truncate pr-2" title={asset.name}>{asset.name}</h3>
                                    <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tighter bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40">
                                        {asset.type}
                                    </span>
                                </div>
                                <p className="text-[11px] font-medium text-black/40 dark:text-white/40 font-mono truncate mb-4">{asset.path}</p>
                                <div className="flex items-center justify-between text-xs font-semibold text-black/60 dark:text-white/60 mb-4 pb-4 border-b border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">data_usage</span>
                                        {asset.size}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">calendar_today</span>
                                        {asset.createdAt ? format(asset.createdAt.toDate(), "d MMM yy", { locale: fr }) : "-"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg text-[10px] font-mono text-black/40 dark:text-white/40 truncate">
                                        {asset.url}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(asset.url)}
                                        className="bg-black text-white dark:bg-white dark:text-black p-2 rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center shrink-0"
                                        title="Copier le lien"
                                    >
                                        <span className="material-symbols-outlined text-sm">content_copy</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <ConfirmModal
                isOpen={!!assetToDelete}
                onClose={() => !isDeleting && setAssetToDelete(null)}
                onConfirm={confirmDelete}
                title="Supprimer le fichier ?"
                message={`Êtes-vous sûr de vouloir supprimer "${assetToDelete?.name}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                isDanger={true}
                isLoading={isDeleting}
            />

            <ConfirmModal
                isOpen={!!alertConfig}
                onClose={() => setAlertConfig(null)}
                title={alertConfig?.title || ""}
                message={alertConfig?.message || ""}
                type='alert'
            />
        </main>
    );
}
