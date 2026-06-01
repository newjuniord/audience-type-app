"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VideoPlayer from "./VideoPlayer";

export default function HomeVideo() {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('settings')
                    .select('*')
                    .eq('id', 'homepage')
                    .single();

                if (!error && data) {
                    if (data.video_visible && data.video_url) {
                        setVideoUrl(data.video_url);
                        setIsVisible(true);
                    } else if (data.videoVisible && data.videoUrl) {
                        // Fallback for camelCase column names if any
                        setVideoUrl(data.videoUrl);
                        setIsVisible(true);
                    } else {
                        setIsVisible(false);
                    }
                }
            } catch (error) {
                console.error("Error fetching homepage video setting:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    if (loading || !isVisible || !videoUrl) return null;

    return (
        <div className="w-[calc(100%+2rem)] sm:w-full -mx-4 sm:mx-auto max-w-4xl mt-16 md:mt-24 relative group">
            {/* Glowing background effect */}
            <div className="absolute -inset-1 sm:-inset-1 bg-gradient-to-r from-emerald-500 via-primary to-blue-500 rounded-none sm:rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative rounded-none sm:rounded-[2rem] overflow-hidden shadow-2xl shadow-black/20 dark:shadow-white/5 border-y sm:border border-black/5 dark:border-white/10 bg-black">
                <VideoPlayer 
                    url={videoUrl} 
                    roundedClassName="rounded-none" 
                    className="w-full aspect-video object-cover" 
                />
            </div>
        </div>
    );
}
