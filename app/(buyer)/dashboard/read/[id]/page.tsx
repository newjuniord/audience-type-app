"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getEbook } from "@/lib/ebooks";
import { Ebook } from "@/lib/types";
import dynamic from 'next/dynamic';

// Dynamically import the PdfViewer so it only renders on the client side
// This prevents Next.js from throwing the Object.defineProperty error during SSR with pdfjs-dist
const DynamicPdfViewer = dynamic(() => import('@/components/buyer/PdfViewer'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white">
            <div className="w-12 h-12 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
            <p className="mt-4 opacity-50">Chargement du lecteur PDF...</p>
        </div>
    )
});

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    
    const [ebook, setEbook] = useState<Ebook | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchEbook = async () => {
            try {
                const fetchedEbook = await getEbook(resolvedParams.id);
                if (!fetchedEbook || !fetchedEbook.fileUrl) {
                    setError("Fichier introuvable.");
                } else {
                    setEbook(fetchedEbook);
                }
            } catch (err) {
                setError("Erreur lors du chargement du fichier.");
            } finally {
                setLoading(false);
            }
        };
        fetchEbook();
    }, [resolvedParams.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
                <p className="mt-4 opacity-50">Chargement de votre Ebook...</p>
            </div>
        );
    }

    if (error || !ebook) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={() => router.back()} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                    Retour au Dashboard
                </button>
            </div>
        );
    }

    return (
        <DynamicPdfViewer 
            fileUrl={ebook.fileUrl || ""} 
            title={ebook.title} 
            onBack={() => router.back()} 
        />
    );
}
