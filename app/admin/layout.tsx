import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-display transition-colors duration-200">
            <AdminSidebar />
            <div className="flex-1 ml-64 p-10">
                {children}
            </div>
        </div>
    );
}
