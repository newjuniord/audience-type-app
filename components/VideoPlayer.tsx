import React from 'react';

interface VideoPlayerProps {
    url: string;
    className?: string;
    roundedClassName?: string;
}

export default function VideoPlayer({ url, className = "", roundedClassName = "rounded-3xl" }: VideoPlayerProps) {
    if (!url) {
        return (
            <div className={`w-full aspect-video bg-black/10 dark:bg-white/10 flex items-center justify-center text-black/20 dark:text-white/20 select-none ${roundedClassName} ${className}`}>
                <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl">videocam_off</span>
                    <span className="text-xs font-bold uppercase tracking-widest">No Video URL</span>
                </div>
            </div>
        );
    }

    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);

    if (youtubeMatch) {
        return (
            <iframe
                src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                className={`w-full aspect-video ${roundedClassName} ${className}`}
                title="Video Preview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        );
    }

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);

    if (vimeoMatch) {
        return (
            <iframe
                src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                className={`w-full aspect-video ${roundedClassName} ${className}`}
                title="Video Preview"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
            ></iframe>
        );
    }

    // Bunny.net
    const bunnyRegex = /https?:\/\/(?:www\.)?(?:player|iframe)\.mediadelivery\.net\/(?:embed|play)\/([\w-]+)\/([\w-]+)/;
    const bunnyMatch = url.match(bunnyRegex);

    if (bunnyMatch) {
        return (
            <iframe
                src={`https://iframe.mediadelivery.net/embed/${bunnyMatch[1]}/${bunnyMatch[2]}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`}
                loading="lazy"
                className={`w-full aspect-video ${roundedClassName} border-0 ${className}`}
                title="Video Preview"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
            ></iframe>
        );
    }

    // HTML5 fallback
    return (
        <video
            src={url}
            controls
            className={`w-full aspect-video object-cover bg-black ${roundedClassName} ${className}`}
            onError={(e) => {
                (e.target as HTMLVideoElement).style.display = 'none';
            }}
        >
            Votre navigateur ne supporte pas la balise vidéo.
        </video>
    );
}
