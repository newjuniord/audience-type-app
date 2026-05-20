"use client";
import React, { useState, useEffect, useRef } from 'react';

interface VideoPlayerProps {
    url: string;
    className?: string;
    roundedClassName?: string;
}

export default function VideoPlayer({ url, className = "", roundedClassName = "rounded-3xl" }: VideoPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Auto-hide controls when playing — MUST be before any conditional return
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (isPlaying) {
            timeoutId = setTimeout(() => {
                setShowControls(false);
            }, 2500);
        } else {
            setShowControls(true);
        }
        return () => clearTimeout(timeoutId);
    }, [isPlaying, showControls]);

    // Synchronize fullscreen state from document — MUST be before any conditional return
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // ---- Early return AFTER all hooks ----
    if (!url) {
        return (
            <div className={`w-full aspect-video bg-black/10 dark:bg-white/10 flex items-center justify-center text-black/20 dark:text-white/20 select-none ${roundedClassName} ${className}`}>
                <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl">videocam_off</span>
                    <span className="text-xs font-bold uppercase tracking-widest">Pas de vidéo</span>
                </div>
            </div>
        );
    }

    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);

    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);

    const isYouTube = !!youtubeMatch;
    const isVimeo = !!vimeoMatch;

    const sendCommand = (youtubeCmd: string, youtubeArgs: any[], vimeoCmd: string, vimeoValue?: any) => {
        if (isYouTube && iframeRef.current?.contentWindow) {
            const msg = JSON.stringify({
                event: 'command',
                func: youtubeCmd,
                args: youtubeArgs
            });
            iframeRef.current.contentWindow.postMessage(msg, '*');
        } else if (isVimeo && iframeRef.current?.contentWindow) {
            const msg = JSON.stringify({
                method: vimeoCmd,
                value: vimeoValue
            });
            iframeRef.current.contentWindow.postMessage(msg, '*');
        }
    };

    const handlePlay = () => {
        if (videoRef.current) {
            videoRef.current.play();
        } else {
            sendCommand('playVideo', [], 'play');
        }
        setIsPlaying(true);
    };

    const handlePause = () => {
        if (videoRef.current) {
            videoRef.current.pause();
        } else {
            sendCommand('pauseVideo', [], 'pause');
        }
        setIsPlaying(false);
    };

    const handleTogglePlay = () => {
        if (isPlaying) {
            handlePause();
        } else {
            handlePlay();
        }
        setShowControls(true);
    };

    const handleReset = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.pause();
        } else {
            sendCommand('seekTo', [0, true], 'setCurrentTime', 0);
            sendCommand('pauseVideo', [], 'pause');
        }
        setIsPlaying(false);
        setShowControls(true);
    };

    const handleToggleMute = () => {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        if (videoRef.current) {
            videoRef.current.muted = nextMute;
        } else {
            if (nextMute) {
                sendCommand('mute', [], 'setVolume', 0);
            } else {
                sendCommand('unMute', [], 'setVolume', 1);
            }
        }
    };

    const handleToggleFullscreen = () => {
        const container = containerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch((err) => console.error(err));
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Build Src Urls with API enabled and controls disabled
    let embedSrc = "";
    if (isYouTube) {
        embedSrc = `https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1&controls=0&rel=0&showinfo=0&modestbranding=1&iv_load_policy=3&playsinline=1&autoplay=0`;
    } else if (isVimeo) {
        embedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}?api=1&controls=0&badge=0&byline=0&portrait=0&title=0&autoplay=0`;
    }

    const showCustomControls = isYouTube || isVimeo;

    return (
        <div
            ref={containerRef}
            className={`relative w-full aspect-video bg-black overflow-hidden group/player select-none ${roundedClassName} ${className}`}
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* The Video Source */}
            {showCustomControls ? (
                <iframe
                    ref={iframeRef}
                    src={embedSrc}
                    className="w-full h-full pointer-events-none scale-105" // slightly scaled to clip any remaining branding borders if any
                    title="Video Player"
                    frameBorder="0"
                    allow="autoplay; fullscreen; encrypted-media"
                ></iframe>
            ) : (
                <video
                    ref={videoRef}
                    src={url}
                    className="w-full h-full object-cover bg-black"
                    onClick={handleTogglePlay}
                />
            )}

            {/* Click Interceptor Overlay (Blocks clicking on the iframe / links) */}
            {showCustomControls && (
                <div
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={handleTogglePlay}
                />
            )}

            {/* Premium Custom Control UI */}
            {(!isPlaying || showControls) && (
                <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 bg-gradient-to-b from-black/60 via-black/10 to-black/70 transition-all duration-300 pointer-events-none animate-in fade-in duration-200">

                    {/* Top indicator */}
                    <div className="flex justify-between items-start">
                        <span className="bg-black/40 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/70">
                            Lecteur Sécurisé 🔒
                        </span>
                    </div>

                    {/* Big Center Play/Pause Indicator Button */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                            type="button"
                            onClick={handleTogglePlay}
                            className="size-16 bg-white text-black hover:scale-110 hover:bg-amber-400 active:scale-95 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 pointer-events-auto cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {isPlaying ? "pause" : "play_arrow"}
                            </span>
                        </button>
                    </div>

                    {/* Custom Control Bar at the Bottom */}
                    <div className="w-full flex items-center justify-between gap-4 pointer-events-auto bg-black/50 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl">

                        {/* Play/Pause/Reset Group */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleTogglePlay}
                                className="size-10 bg-white/10 hover:bg-white/20 active:scale-90 rounded-xl flex items-center justify-center transition-all cursor-pointer text-white"
                                title={isPlaying ? "Pause" : "Play"}
                            >
                                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {isPlaying ? "pause" : "play_arrow"}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={handleReset}
                                className="size-10 bg-white/5 hover:bg-white/15 active:scale-90 rounded-xl flex items-center justify-center transition-all cursor-pointer text-white/80 hover:text-white"
                                title="Réinitialiser"
                            >
                                <span className="material-symbols-outlined text-2xl">
                                    restart_alt
                                </span>
                            </button>
                        </div>

                        {/* Middle notification copy */}
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider hidden sm:inline select-none">
                            Double-clique pour plein écran
                        </span>

                        {/* Mute/Fullscreen Group */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleToggleMute}
                                className="size-10 bg-white/5 hover:bg-white/15 active:scale-90 rounded-xl flex items-center justify-center transition-all cursor-pointer text-white/80 hover:text-white"
                                title={isMuted ? "Activer le son" : "Couper le son"}
                            >
                                <span className="material-symbols-outlined text-2xl">
                                    {isMuted ? "volume_off" : "volume_up"}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={handleToggleFullscreen}
                                className="size-10 bg-white/5 hover:bg-white/15 active:scale-90 rounded-xl flex items-center justify-center transition-all cursor-pointer text-white/80 hover:text-white"
                                title="Plein écran"
                            >
                                <span className="material-symbols-outlined text-2xl">
                                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                                </span>
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
