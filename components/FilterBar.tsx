interface FilterBarProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

export default function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
    const filters = [
        { name: "Tous", icon: null },
        { name: "Cours", icon: "school" },
        { name: "Ebooks", icon: "auto_stories" },
        { name: "Réservations", icon: "calendar_today" }
    ];

    return (
        <div className="flex gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((filter) => (
                <button
                    key={filter.name}
                    onClick={() => onFilterChange(filter.name)}
                    className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-6 transition-all hover:scale-105 active:scale-95 ${activeFilter === filter.name
                        ? "bg-primary text-white"
                        : "bg-primary/5 dark:bg-white/5 hover:bg-primary/10 dark:hover:bg-white/10"
                        }`}
                >
                    {filter.icon && (
                        <span className={`material-symbols-outlined text-lg ${activeFilter === filter.name ? "text-white" : "text-primary dark:text-white"
                            }`}>
                            {filter.icon}
                        </span>
                    )}
                    <span className={`${activeFilter === filter.name ? "text-white font-semibold" : "text-primary dark:text-white font-medium"
                        } text-sm leading-normal`}>
                        {filter.name}
                    </span>
                </button>
            ))}
        </div>
    );
}
