"use client";

import { useState } from "react";

interface PdfViewerProps {
    fileUrl: string;
    title: string;
    onBack: () => void;
}

export default function PdfViewer({ fileUrl, title, onBack }: PdfViewerProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col h-screen overflow-hidden">
            <header className="h-16 shrink-0 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="font-bold truncate max-w-[200px] md:max-w-md">{title}</h1>
                </div>

                <div className="flex items-center gap-2">
                    <a 
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-full text-xs font-bold transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        <span className="hidden md:inline">Ouvrir en plein écran</span>
                    </a>
                </div>
            </header>

            <main className="flex-1 overflow-hidden relative bg-[#0f0f0f] flex items-center justify-center">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
                        <p className="mt-4 text-white/50 text-sm">Chargement du document...</p>
                    </div>
                )}
                <iframe 
                    src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-none bg-white"
                    onLoad={() => setIsLoading(false)}
                    title={title}
                />
            </main>
        </div>
    );
}
