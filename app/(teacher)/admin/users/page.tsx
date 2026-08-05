"use client";

import { useState, useEffect } from "react";
import { getUsers, updateUserRole, deleteUserDocument, updateUser } from "@/lib/users";
import { User } from "@/lib/types";
import ConfirmModal from "@/components/ui/ConfirmModal";
import GiftProductModal from "@/components/buyer/GiftProductModal";
import UserEnrollmentsDrawer from "@/components/admin/UserEnrollmentsDrawer";
import CreateUserDrawer from "@/components/admin/CreateUserDrawer";
import { generateAdminTempLink } from "@/app/actions/notify";

import { getEnrollments } from "@/lib/enrollments";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'customer'>('all');
    const [isSyncing, setIsSyncing] = useState(false);
    const router = useRouter();

    const PAGE_SIZE = 8;
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page to 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);

    // Confirm Modal State
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [userToToggle, setUserToToggle] = useState<User | null>(null);
    const [userToResetCount, setUserToResetCount] = useState<User | null>(null);
    const [userToImpersonate, setUserToImpersonate] = useState<User | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Gift & Enrollments State
    const [userToGift, setUserToGift] = useState<User | null>(null);
    const [userToViewEnrollments, setUserToViewEnrollments] = useState<User | null>(null);

    // Create User State
    const [isCreateUserDrawerOpen, setIsCreateUserDrawerOpen] = useState(false);

    const { role, loading: loadingAuth } = useAuth();

    const loadUsers = async () => {
        try {
            setLoading(true);
            // Fetching up to 1000 users at once to enable robust client-side search and pagination
            const { users: newUsers } = await getUsers(1000, 1);
            
            // Calculer le nombre d'inscriptions réelles par utilisateur depuis la collection enrollments
            let countMap: Record<string, number> = {};
            try {
                const allEnrollments = await getEnrollments();
                allEnrollments.forEach(enr => {
                    if (enr.userId) {
                        countMap[enr.userId] = (countMap[enr.userId] || 0) + 1;
                    }
                });
            } catch (err) {
                console.error("Erreur lors de la récupération des inscriptions pour le comptage:", err);
            }

            setUsers(() => {
                // Utilisation d'une Map pour garantir l'unicité par UID
                const uniqueMap = new Map();
                newUsers.forEach(u => {
                    const uid = u.uid || (u as any).id;
                    const realCount = countMap[uid] !== undefined ? countMap[uid] : (u.enrollmentCount || 0);
                    uniqueMap.set(uid, { ...u, enrollmentCount: realCount });
                });
                return Array.from(uniqueMap.values());
            });

            setCurrentPage(1);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncCounts = async () => {
        setIsSyncing(true);
        try {
            const allEnrollments = await getEnrollments();
            const countMap: Record<string, number> = {};
            allEnrollments.forEach(enr => {
                if (enr.userId) {
                    countMap[enr.userId] = (countMap[enr.userId] || 0) + 1;
                }
            });

            for (const user of users) {
                const realCount = countMap[user.uid] || 0;
                if (user.enrollmentCount !== realCount) {
                    await updateUser(user.uid, { enrollmentCount: realCount });
                }
            }
            
            alert("Synchronisation terminée !");
            loadUsers();
        } catch (error) {
            console.error("Sync failed", error);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        if (!loadingAuth && role === "admin") {
            loadUsers();
        }
    }, [role, loadingAuth]);

    const handleToggleRole = (user: User) => {
        setUserToToggle(user);
    };

    const confirmToggleRole = async () => {
        if (!userToToggle) return;
        setIsProcessing(true);

        const newRole = userToToggle.role === 'admin' ? 'customer' : 'admin';

        try {
            await updateUserRole(userToToggle.uid, newRole);
            // Optimistic update
            setUsers(users.map(u => u.uid === userToToggle.uid ? { ...u, role: newRole } : u));
            setUserToToggle(null);
        } catch (error) {
            console.error("Failed to update role", error);
            // alert("Erreur lors de la mise à jour du rôle."); // Could use alert state here too
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = (uid: string) => {
        setUserToDelete(uid);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        setIsProcessing(true);
        try {
            await deleteUserDocument(userToDelete);
            setUsers(users.filter(u => u.uid !== userToDelete));
            setUserToDelete(null);
        } catch (error) {
            console.error("Failed to delete user", error);
            // alert("Erreur lors de la suppression.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImpersonate = (user: User) => {
        setUserToImpersonate(user);
    };

    const confirmImpersonate = async () => {
        if (!userToImpersonate) return;
        setIsProcessing(true);
        
        try {
            // L'impersonation directe du côté client n'est pas recommandée sans Custom Tokens.
            // On peut appeler une Cloud Function qui nous connecte via le SSR client, ou stocker un token impersonation.
            alert("La fonctionnalité d'impersonation n'est pas encore implémentée.");
            
            // Redirect to their dashboard
            // router.push("/dashboard");
        } catch (error: any) {
            console.error("Erreur d'impersonation:", error);
            alert("Erreur: " + error.message);
        } finally {
            setIsProcessing(false);
            setUserToImpersonate(null);
        }
    };

    const [generatedLink, setGeneratedLink] = useState("");
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkModalUser, setLinkModalUser] = useState<User | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    const handleGenerateAdminTempLink = async (user: User) => {
        setLinkModalUser(user);
        setIsProcessing(true);
        try {
            const res = await generateAdminTempLink(user.uid);
            if (!res.success) throw new Error(res.error || "Erreur de génération");
            setGeneratedLink(res.link || "");
            setShowLinkModal(true);
        } catch (error: any) {
            console.error("Failed to generate temp link", error);
            alert(error.message || "Erreur lors de la génération du lien.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResetTempLinksCount = (user: User) => {
        setUserToResetCount(user);
    };

    const confirmResetCount = async () => {
        if (!userToResetCount) return;
        setIsProcessing(true);
        try {
            await updateUser(userToResetCount.uid, { tempLinksCount: 0 });
            setUsers(users.map(u => u.uid === userToResetCount.uid ? { ...u, tempLinksCount: 0 } : u));
            setUserToResetCount(null);
        } catch (error) {
            console.error("Failed to reset count", error);
            alert("Erreur lors de la réinitialisation.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Derived state for Filtering
    const filteredUsers = users.filter(user => {
        const matchesSearch = (
            (user.displayName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
        );
        const matchesRole = roleFilter === 'all' || (user.role || 'customer') === roleFilter;
        return matchesSearch && matchesRole;
    });

    const displayedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const canGoNext = filteredUsers.length > currentPage * PAGE_SIZE;

    const handleNextPage = async () => {
        if (!canGoNext) return;
        setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const isUserOnline = (user: User) => {
        if (!user || user.isOnline === false) return false;
        if (!user.lastActive) return false;
        
        try {
            const lastActiveTime = new Date(user.lastActive as any).getTime();
                
            if (isNaN(lastActiveTime)) return false;
            
            const timeSinceLastActive = Date.now() - lastActiveTime;
            // Timeout after 1h 15m (4500000 ms) grace period
            return timeSinceLastActive < 4500000;
        } catch(e) {
            console.error("isUserOnline check failed:", e);
            return false;
        }
    };

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        newToday: users.filter(u => {
            if (!u.createdAt) return false;
            const today = new Date();
            const created = new Date(u.createdAt as any);
            if (isNaN(created.getTime())) return false;
            return created.getDate() === today.getDate() &&
                created.getMonth() === today.getMonth() &&
                created.getFullYear() === today.getFullYear();
        }).length
    };

    return (
        <div className="animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Gestion des Utilisateurs</h2>
                    <p className="text-black/50 dark:text-white/50 text-sm">Supervisez les membres de votre plateforme et leur activité.</p>
                </div>
                <button 
                    onClick={() => setIsCreateUserDrawerOpen(true)}
                    className="h-12 px-6 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xl shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Ajouter un utilisateur
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white dark:bg-black/20 p-8 border border-black/5 dark:border-white/10 rounded-[1.5rem] hover:border-black/10 dark:hover:border-white/20 transition-colors">
                    <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Total Utilisateurs</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter">{stats.total}</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-black/20 p-8 border border-black/5 dark:border-white/10 rounded-[1.5rem] hover:border-black/10 dark:hover:border-white/20 transition-colors">
                    <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Admins</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter">{stats.admins}</span>
                        <span className="text-xs font-bold text-primary/30 dark:text-white/30 uppercase tracking-widest px-2 py-0.5 border border-black/5 dark:border-white/10 rounded-full text-[10px]">staff</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-black/20 p-8 border border-black/5 dark:border-white/10 rounded-[1.5rem] hover:border-black/10 dark:hover:border-white/20 transition-colors">
                    <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Nouveaux aujourd'hui</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter">{stats.newToday}</span>
                    </div>
                </div>
            </div>

            {/* Table Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 min-w-[300px]">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">search</span>
                    <input
                        className="w-full bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-full pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:opacity-50"
                        placeholder="Rechercher par nom ou email..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setRoleFilter(prev => prev === 'all' ? 'admin' : prev === 'admin' ? 'customer' : 'all')}
                        className="px-6 py-2.5 rounded-full border border-black/5 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        {roleFilter === 'all' ? 'Tous les rôles' : roleFilter === 'admin' ? 'Admins uniquement' : 'Clients uniquement'}
                    </button>
                    <button
                        onClick={() => loadUsers()}
                        className="px-6 py-2.5 rounded-full border border-black/5 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        Actualiser
                    </button>
                    <button
                        onClick={handleSyncCounts}
                        disabled={isSyncing}
                        className="px-6 py-2.5 rounded-full border border-black/5 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-sm">{isSyncing ? 'sync' : 'database'}</span>
                        {isSyncing ? 'Synchronisation...' : 'Synchro. Compteurs'}
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-black/10 border border-black/5 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm shadow-black/5">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/10">
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Détails utilisateur</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Rôle</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Inscriptions</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Date d'inscription</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {loading && displayedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-black/40 dark:text-white/40 font-medium">Chargement des utilisateurs...</td>
                                </tr>
                            ) : displayedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-black/40 dark:text-white/40 font-medium">Aucun utilisateur trouvé.</td>
                                </tr>
                            ) : (
                                displayedUsers.map((user) => (
                                    <tr key={user.uid || (user as any).id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                                                    {(user.photoURL || (user as any).photoUrl) ? (
                                                        <img 
                                                            alt={user.displayName || (user as any).fullName} 
                                                            className="w-full h-full object-cover" 
                                                            src={user.photoURL || (user as any).photoUrl} 
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).onerror = null;
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                if ((e.target as HTMLImageElement).parentElement) {
                                                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="material-symbols-outlined text-black/20 dark:text-white/20">person</span>';
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-black/20 dark:text-white/20">person</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold">{user.displayName || (user as any).name || (user as any).fullName || "Anonyme"}</p>
                                                        {/* INDICATOR DISABLED 
                                                        isUserOnline(user) ? (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">En Ligne</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20"></span>
                                                                <span className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest leading-none">Hors Ligne</span>
                                                            </div>
                                                        )
                                                        */}
                                                    </div>
                                                    {user.email ? (
                                                        <p className="text-xs text-black/40 dark:text-white/40">{user.email}</p>
                                                    ) : (
                                                        <p className="text-xs text-black/40 dark:text-white/40">
                                                            {user.phoneNumber ? `Connexion avec phone: ${user.phoneNumber}` : "Aucun contact"}
                                                        </p>
                                                    )}
                                                    {user.email && user.phoneNumber && (
                                                        <p className="text-[10px] text-black/40 dark:text-white/40 font-medium mt-0.5 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[10px]">call</span>
                                                            {user.phoneNumber}
                                                        </p>
                                                    )}
                                                    {user.phone && (
                                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[10px]">smartphone</span>
                                                            Phone: {user.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {user.role === 'admin' ? (
                                                <span className="px-3 py-1 rounded-full bg-primary text-white dark:bg-white dark:text-primary text-[10px] font-bold uppercase tracking-tight">Admin</span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-tight text-black/50 dark:text-white/50">Client</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-semibold">{user.enrollmentCount || 0} inscriptions</p>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-black/60 dark:text-white/60">
                                            {user.createdAt ? new Date(user.createdAt as any).toLocaleDateString() : "Inconnu"}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setUserToViewEnrollments(user)}
                                                    className="p-2.5 rounded-full border border-black/5 dark:border-white/10 hover:bg-blue-400/20 hover:text-blue-600 hover:border-blue-400/50 transition-all duration-300"
                                                    title="View Enrollments"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => setUserToGift(user)}
                                                    className="p-2.5 rounded-full border border-black/5 dark:border-white/10 hover:bg-yellow-400/20 hover:text-yellow-600 hover:border-yellow-400/50 transition-all duration-300"
                                                    title="Offer Gift"
                                                >
                                                    <span className="material-symbols-outlined text-sm">redeem</span>
                                                </button>
                                                <button
                                                    onClick={() => handleImpersonate(user)}
                                                    className="p-2.5 rounded-full border border-black/5 dark:border-white/10 hover:bg-emerald-400/20 hover:text-emerald-600 hover:border-emerald-400/50 transition-all duration-300"
                                                    title="Connecter en tant que"
                                                >
                                                    <span className="material-symbols-outlined text-sm">login</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleRole(user)}
                                                    className="px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-[10px] font-bold hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all duration-300"
                                                >
                                                    {user.role === 'admin' ? 'Retirer Admin' : 'Rendre Admin'}
                                                </button>
                                                <button
                                                    onClick={() => handleGenerateAdminTempLink(user)}
                                                    className="p-2.5 rounded-full border border-black/5 dark:border-white/10 hover:bg-purple-400/20 hover:text-purple-600 hover:border-purple-400/50 transition-all duration-300"
                                                    title="Générer un lien de connexion temporaire"
                                                >
                                                    <span className="material-symbols-outlined text-sm">link</span>
                                                </button>
                                                {user.tempLinksCount && user.tempLinksCount > 0 ? (
                                                    <button
                                                        onClick={() => handleResetTempLinksCount(user)}
                                                        className="p-2.5 rounded-full border border-black/5 dark:border-white/10 hover:bg-orange-400/20 hover:text-orange-600 hover:border-orange-400/50 transition-all duration-300"
                                                        title="Réinitialiser Quota Liens"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">history</span>
                                                    </button>
                                                ) : null}
                                                <button
                                                    onClick={() => handleDeleteUser(user.uid || (user as any).id!)}
                                                    className="p-2.5 rounded-full border border-black/5 dark:border-white/10 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300"
                                                    title="Remove"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-5 border-t border-black/5 dark:border-white/10 flex items-center justify-between bg-black/[0.01] dark:bg-white/[0.01]">
                    <p className="text-xs text-black/40 dark:text-white/40 font-medium">
                        {filteredUsers.length === 0 
                            ? "Aucun utilisateur" 
                            : `Affiche ${(currentPage - 1) * PAGE_SIZE + 1} - ${Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} (${filteredUsers.length} chargés)`
                        }
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1 || loading}
                            className="px-4 py-2 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50 text-xs font-bold flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                            Précédent
                        </button>
                        <span className="text-xs font-bold px-2 text-black/60 dark:text-white/60">Page {currentPage}</span>
                        <button
                            onClick={handleNextPage}
                            disabled={!canGoNext || loading}
                            className="px-4 py-2 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50 text-xs font-bold flex items-center gap-1"
                        >
                            Suivant
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
            <ConfirmModal
                isOpen={!!userToDelete || !!userToToggle || !!userToResetCount || !!userToImpersonate}
                onClose={() => {
                    if (!isProcessing) {
                        setUserToDelete(null);
                        setUserToToggle(null);
                        setUserToResetCount(null);
                        setUserToImpersonate(null);
                    }
                }}
                onConfirm={userToDelete ? confirmDeleteUser : (userToToggle ? confirmToggleRole : (userToResetCount ? confirmResetCount : confirmImpersonate))}
                title={userToDelete ? "Supprimer l'utilisateur ?" : (userToToggle ? "Modifier le rôle ?" : (userToResetCount ? "Réinitialiser le compteur ?" : "Se connecter en tant que..."))}
                message={userToDelete
                    ? "ATTENTION: Cette action est irréversible. L'utilisateur sera supprimé de la base de données (Note: cela ne supprime pas le compte Auth Firebase)."
                    : (userToToggle 
                        ? `Voulez-vous vraiment ${userToToggle?.role === 'admin' ? "rétrograder" : "promouvoir"} l'utilisateur ${userToToggle?.displayName || (userToToggle as any)?.name || userToToggle?.email || userToToggle?.phoneNumber || "Anonyme"} ?`
                        : (userToResetCount
                            ? `Voulez-vous vraiment réinitialiser le compteur de liens pour l'utilisateur ${userToResetCount?.displayName || (userToResetCount as any)?.name || userToResetCount?.email || userToResetCount?.phoneNumber || "Anonyme"} ?`
                            : `Voulez-vous vraiment vous connecter en tant que ${userToImpersonate?.displayName || (userToImpersonate as any)?.name || userToImpersonate?.email || userToImpersonate?.phoneNumber || "Anonyme"} ? Vous serez redirigé vers son tableau de bord.`
                        )
                    )
                }
                confirmText={userToDelete ? "Supprimer" : "Confirmer"}
                isDanger={!!userToDelete}
                isLoading={isProcessing}
            />
            <GiftProductModal
                isOpen={!!userToGift}
                onClose={() => setUserToGift(null)}
                user={userToGift}
            />
            <UserEnrollmentsDrawer
                isOpen={!!userToViewEnrollments}
                onClose={() => setUserToViewEnrollments(null)}
                user={userToViewEnrollments}
            />
            <CreateUserDrawer
                isOpen={isCreateUserDrawerOpen}
                onClose={() => setIsCreateUserDrawerOpen(false)}
                onUserCreated={() => loadUsers()}
            />

            {/* Modal de lien temporaire généré */}
            {showLinkModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm" onClick={() => setShowLinkModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl shadow-black/10 w-full max-w-md relative overflow-hidden p-8 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="size-16 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-3xl">key</span>
                        </div>
                        <h3 className="text-2xl font-black text-primary dark:text-white mb-2">Lien généré !</h3>
                        <p className="text-black/50 dark:text-white/50 text-sm font-medium leading-relaxed mb-6">
                            Copiez ce lien de connexion unique pour l'envoyer manuellement à{" "}
                            <strong className="text-primary dark:text-white">
                                {linkModalUser?.displayName || (linkModalUser as any)?.name || linkModalUser?.email || linkModalUser?.phoneNumber || "l'utilisateur"}
                            </strong>.
                        </p>

                        <div className="relative mb-6">
                            <input
                                readOnly
                                value={generatedLink}
                                className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-black/70 dark:text-white/70 pr-24 focus:outline-none"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedLink);
                                    setLinkCopied(true);
                                    setTimeout(() => setLinkCopied(false), 2000);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-xs">{linkCopied ? 'check' : 'content_copy'}</span>
                                {linkCopied ? 'Copié !' : 'Copier'}
                            </button>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowLinkModal(false)}
                                className="flex-1 h-12 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-primary dark:text-white rounded-xl font-bold text-sm transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
