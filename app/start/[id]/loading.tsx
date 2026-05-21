export default function StartPageLoading() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white animate-in fade-in duration-300">
            {/* Sticky countdown bar skeleton */}
            <div className="fixed top-0 left-0 right-0 z-50 h-10 bg-red-600/30 animate-pulse" />

            <div className="pt-10 max-w-4xl mx-auto px-4 py-12 space-y-10">
                {/* Badge + headline skeleton */}
                <div className="text-center space-y-4 pt-6">
                    <div className="h-5 w-36 rounded-full bg-orange-500/20 animate-pulse mx-auto" />
                    <div className="space-y-2">
                        <div className="h-10 w-3/4 rounded-xl bg-white/5 animate-pulse mx-auto" />
                        <div className="h-10 w-2/3 rounded-xl bg-white/5 animate-pulse mx-auto" />
                    </div>
                    <div className="h-4 w-1/2 rounded-full bg-white/[0.03] animate-pulse mx-auto" />
                </div>

                {/* Video skeleton */}
                <div className="aspect-video max-w-2xl mx-auto rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse flex items-center justify-center">
                    <div className="size-16 rounded-full bg-orange-500/20 animate-pulse" />
                </div>

                {/* Benefits list */}
                <div className="space-y-3 max-w-xl mx-auto">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="size-5 rounded-full bg-orange-500/20 animate-pulse flex-shrink-0" />
                            <div className="h-4 rounded-full bg-white/5 animate-pulse flex-1" style={{ width: `${60 + i * 10}%` }} />
                        </div>
                    ))}
                </div>

                {/* CTA button skeleton */}
                <div className="max-w-sm mx-auto">
                    <div className="h-16 rounded-2xl bg-orange-500/20 animate-pulse" />
                </div>

                {/* Pricing skeleton */}
                <div className="flex items-center justify-center gap-4">
                    <div className="h-8 w-24 rounded-xl bg-white/5 animate-pulse" />
                    <div className="h-10 w-32 rounded-xl bg-orange-500/10 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
