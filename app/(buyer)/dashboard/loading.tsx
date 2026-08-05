export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-background-dark text-white pb-20 animate-in fade-in duration-300">
            {/* Header skeleton */}
            <div className="h-16 bg-black/20 border-b border-white/5 flex items-center px-6 gap-4">
                <div className="size-8 rounded-xl bg-white/5 animate-pulse" />
                <div className="h-4 w-32 rounded-full bg-white/5 animate-pulse" />
                <div className="flex-1" />
                <div className="size-8 rounded-full bg-white/5 animate-pulse" />
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                {/* Welcome banner skeleton */}
                <div className="h-28 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />

                {/* Section title */}
                <div className="space-y-1">
                    <div className="h-5 w-40 rounded-full bg-white/5 animate-pulse" />
                    <div className="h-3 w-56 rounded-full bg-white/[0.03] animate-pulse" />
                </div>

                {/* Course cards skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden"
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            {/* Thumbnail */}
                            <div className="aspect-video bg-white/5 animate-pulse" />
                            {/* Content */}
                            <div className="p-4 space-y-3">
                                <div className="h-4 w-3/4 rounded-full bg-white/5 animate-pulse" />
                                <div className="h-3 w-1/2 rounded-full bg-white/[0.03] animate-pulse" />
                                <div className="h-1.5 w-full rounded-full bg-white/5 animate-pulse" />
                                <div className="flex justify-between items-center">
                                    <div className="h-3 w-16 rounded-full bg-white/[0.03] animate-pulse" />
                                    <div className="h-8 w-24 rounded-xl bg-orange-500/10 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
