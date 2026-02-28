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
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-10 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
            {filters.map((filter) => (
                <button
                    key={filter.name}
                    onClick={() => onFilterChange(filter.name)}
                    className={`h-12 md:h-10 shrink-0 items-center justify-center md:justify-start gap-x-2 rounded-2xl md:rounded-full px-8 md:px-6 transition-all hover:bg-primary/10 dark:hover:bg-white/10 active:scale-95 w-full md:w-auto ${filter.name === "Tous" ? "flex" : "hidden md:flex"
                        } ${activeFilter === filter.name
                            ? "bg-primary text-white"
                            : "bg-primary/5 dark:bg-white/5"
                        }`}
                >
                    {filter.icon && (
                        <span className={`material-symbols-outlined text-xl md:text-lg ${activeFilter === filter.name ? "text-white" : "text-primary dark:text-white"
                            }`}>
                            {filter.icon}
                        </span>
                    )}
                    <span className={`${activeFilter === filter.name ? "text-white font-bold md:font-semibold" : "text-primary dark:text-white font-medium"
                        } text-base md:text-sm leading-normal`}>
                        {filter.name}
                    </span>
                </button>
            ))}
        </div>
    );
}
