export default function AdminLoading() {
    return (
        <div className="min-h-screen bg-background-dark pb-20 animate-in fade-in duration-300">
            {/* Page header skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 p-6">
                <div className="space-y-2">
                    <div className="h-9 w-60 rounded-xl bg-white/5 animate-pulse" />
                    <div className="h-4 w-80 rounded-full bg-white/[0.03] animate-pulse" />
                </div>
                <div className="h-12 w-48 rounded-full bg-orange-500/10 animate-pulse" />
            </div>

            <div className="px-6 space-y-8">
                {/* Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-black/20 border border-white/10 rounded-[1.5rem] p-8 space-y-3">
                            <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
                            <div className="h-9 w-16 rounded-xl bg-white/5 animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Search bar + buttons */}
                <div className="flex gap-3">
                    <div className="flex-1 h-12 rounded-full bg-white/5 border border-white/10 animate-pulse" />
                    <div className="h-12 w-32 rounded-full bg-white/5 border border-white/10 animate-pulse" />
                    <div className="h-12 w-28 rounded-full bg-white/5 border border-white/10 animate-pulse" />
                </div>

                {/* Table skeleton */}
                <div className="bg-black/10 border border-white/10 rounded-[1.5rem] overflow-hidden">
                    {/* Header */}
                    <div className="flex gap-8 px-8 py-5 border-b border-white/10">
                        {["User Details", "Role", "Purchases", "Date Joined", "Actions"].map((col) => (
                            <div key={col} className="h-3 rounded-full bg-white/5 animate-pulse" style={{ width: col === "User Details" ? "160px" : "80px" }} />
                        ))}
                    </div>
                    {/* Rows */}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-8 px-8 py-6 border-b border-white/5"
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className="size-10 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
                                <div className="space-y-1.5">
                                    <div className="h-4 w-32 rounded-full bg-white/5 animate-pulse" />
                                    <div className="h-3 w-48 rounded-full bg-white/[0.03] animate-pulse" />
                                </div>
                            </div>
                            <div className="h-5 w-20 rounded-full bg-white/5 animate-pulse" />
                            <div className="h-4 w-16 rounded-full bg-white/5 animate-pulse" />
                            <div className="h-4 w-24 rounded-full bg-white/[0.03] animate-pulse" />
                            <div className="h-8 w-28 rounded-full bg-white/5 animate-pulse ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
