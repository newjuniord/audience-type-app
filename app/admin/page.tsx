"use client";

import { useState, useEffect } from "react";
import { getUsers, updateUserRole, deleteUserDocument, updateUser } from "@/lib/users";
import { User } from "@/lib/types";
import ConfirmModal from "@/components/ui/ConfirmModal";

import GiftProductModal from "@/components/GiftProductModal";
import UserEnrollmentsDrawer from "@/components/UserEnrollmentsDrawer";

import { getEnrollments, getEnrollmentsByUser } from "@/lib/enrollments";
import { auth, db } from "@/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { QueryDocumentSnapshot, collection, getDocs, writeBatch, doc } from "firebase/firestore";

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'customer'>('all');
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const router = useRouter();

    // Confirm Modal State
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [userToToggle, setUserToToggle] = useState<User | null>(null);
    const [userToResetCount, setUserToResetCount] = useState<User | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Gift & Enrollments State
    const [userToGift, setUserToGift] = useState<User | null>(null);
    const [userToViewEnrollments, setUserToViewEnrollments] = useState<User | null>(null);

    const { role, loading: loadingAuth } = useAuth();

    const loadUsers = async (reset = false) => {
        try {
            setLoading(true);
            const currentLastVisible = reset ? undefined : lastVisible;
            const { users: newUsers, lastVisible: newLastVisible } = await getUsers(20, currentLastVisible);

            setUsers(prev => {
                const combined = reset ? newUsers : [...prev, ...newUsers];
                // Utilisation d'une Map pour garantir l'unicité par UID
                const uniqueMap = new Map();
                combined.forEach(u => uniqueMap.set(u.uid, u));
                return Array.from(uniqueMap.values());
            });

            setLastVisible(newLastVisible);
            setHasMore(newUsers.length === 20);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncCounts = async () => {
        if (!confirm("Voulez-vous synchroniser les compteurs d'inscriptions pour tous les utilisateurs ? Cela peut prendre du temps.")) return;
        
        setIsSyncing(true);
        try {
            // 1. Fetch ALL users (only for sync)
            const usersSnap = await getDocs(collection(db, "users"));
            // 2. Fetch ALL enrollments (only for sync)
            const enrollmentsData = await getEnrollments();

            // 3. Calculate counts
            const counts: Record<string, number> = {};
            enrollmentsData.forEach(enrollment => {
                const uid = typeof enrollment.userId === 'string' 
                    ? enrollment.userId 
                    : (enrollment.userId as any).id;
                if (uid) {
                    counts[uid] = (counts[uid] || 0) + 1;
                }
            });

            // 4. Update users in batches
            const batch = writeBatch(db);
            let operationCount = 0;

            for (const userDoc of usersSnap.docs) {
                const uid = userDoc.id;
                const count = counts[uid] || 0;
                batch.update(doc(db, "users", uid), { enrollmentCount: count });
                operationCount++;

                if (operationCount >= 500) {
                    await batch.commit();
                    // Start a new batch if needed
                    // (Note: simple implementation here, assuming < 500 users or manual repeat)
                }
            }
            
            if (operationCount > 0) await batch.commit();
            
            alert("Synchronisation terminée !");
            loadUsers(true);
        } catch (error) {
            console.error("Sync failed", error);
            alert("Erreur lors de la synchronisation.");
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

    const handleImpersonate = async (user: User) => {
        if (!auth.currentUser) return;
        
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch("/api/admin/impersonate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.uid })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to impersonate");
            }

            const { customToken } = await res.json();
            
            // Sign in with the custom token for that user
            await signInWithCustomToken(auth, customToken);
            
            // Redirect to their dashboard
            router.push("/dashboard");
        } catch (error: any) {
            console.error("Erreur d'impersonation:", error);
            alert("Erreur: " + error.message);
        }
    };

    const handleToggleTempLinks = async (user: User) => {
        try {
            const newValue = !user.canGenerateTempLinks;
            await updateUser(user.uid, { canGenerateTempLinks: newValue });
            setUsers(users.map(u => u.uid === user.uid ? { ...u, canGenerateTempLinks: newValue } : u));
        } catch (error) {
            console.error("Failed to toggle temp links", error);
            alert("Erreur lors de la mise à jour des permissions.");
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

    const isUserOnline = (user: User) => {
        if (!user || user.isOnline === false) return false;
        if (!user.lastActive) return false;
        
        try {
            let lastActiveTime = 0;
            if (typeof (user.lastActive as any).toMillis === 'function') {
                lastActiveTime = (user.lastActive as any).toMillis();
            } else if (typeof (user.lastActive as any).toDate === 'function') {
                lastActiveTime = (user.lastActive as any).toDate().getTime();
            } else if (typeof user.lastActive === 'number') {
                lastActiveTime = user.lastActive;
            } else {
                lastActiveTime = new Date(user.lastActive as any).getTime();
            }
                
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
            const created = u.createdAt.toDate();
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
                    <h2 className="text-4xl font-black tracking-tight mb-2">User Management</h2>
                    <p className="text-black/50 dark:text-white/50 text-sm">Oversee your platform members and their activity.</p>
                </div>
                {/* Add User button removed as it's usually done via Auth Sign Up, or we can implement a manual create later */}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white dark:bg-black/20 p-8 border border-black/5 dark:border-white/10 rounded-[1.5rem] hover:border-black/10 dark:hover:border-white/20 transition-colors">
                    <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Total Users</p>
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
                    <p className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">New Today</p>
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
                        placeholder="Search by name or email..."
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
                        {roleFilter === 'all' ? 'All Roles' : roleFilter === 'admin' ? 'Admins Only' : 'Customers Type'}
                    </button>
                    <button
                        onClick={() => loadUsers(true)}
                        className="px-6 py-2.5 rounded-full border border-black/5 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        Refresh
                    </button>
                    <button
                        onClick={handleSyncCounts}
                        disabled={isSyncing}
                        className="px-6 py-2.5 rounded-full border border-black/5 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-sm">{isSyncing ? 'sync' : 'database'}</span>
                        {isSyncing ? 'Syncing...' : 'Sync Counts'}
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-black/10 border border-black/5 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-sm shadow-black/5">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/5 dark:border-white/10">
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">User Details</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Role</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Purchases</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Date Joined</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-black/40 dark:text-white/40 font-medium">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-black/40 dark:text-white/40 font-medium">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
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
                                                        <p className="text-sm font-bold">{user.displayName || (user as any).fullName || "Anonyme"}</p>
                                                        {isUserOnline(user) ? (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">En Ligne</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20"></span>
                                                                <span className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest leading-none">Hors Ligne</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {user.email ? (
                                                        <p className="text-xs text-black/40 dark:text-white/40">{user.email}</p>
                                                    ) : (
                                                        <p className="text-xs text-black/40 dark:text-white/40">{user.phoneNumber || "Aucun contact"}</p>
                                                    )}
                                                    {user.email && user.phoneNumber && (
                                                        <p className="text-[10px] text-black/40 dark:text-white/40 font-medium mt-0.5 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[10px]">call</span>
                                                            {user.phoneNumber}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {user.role === 'admin' ? (
                                                <span className="px-3 py-1 rounded-full bg-primary text-white dark:bg-white dark:text-primary text-[10px] font-bold uppercase tracking-tight">Admin</span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-tight text-black/50 dark:text-white/50">Customer</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-semibold">{user.enrollmentCount || 0} Items</p>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-black/60 dark:text-white/60">
                                            {user.createdAt?.toDate().toLocaleDateString() || "Unknown"}
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
                                                    {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                                </button>
                                                <button
                                                    onClick={() => handleToggleTempLinks(user)}
                                                    className={`p-2.5 rounded-full border border-black/5 dark:border-white/10 transition-all duration-300 ${user.canGenerateTempLinks === false ? 'bg-red-400/20 text-red-600 border-red-400/50' : 'bg-purple-400/20 text-purple-600 border-purple-400/50'}`}
                                                    title={user.canGenerateTempLinks === false ? "Réactiver Partage d'accès" : "Bloquer Partage d'accès"}
                                                >
                                                    <span className="material-symbols-outlined text-sm">{user.canGenerateTempLinks === false ? 'block' : 'share_reviews'}</span>
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
                                                    onClick={() => handleDeleteUser(user.uid)}
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
                        Showing <span className="text-primary dark:text-white">{users.length}</span> users
                    </p>
                    {hasMore && (
                        <button
                            onClick={() => loadUsers()}
                            disabled={loading}
                            className="text-xs font-bold uppercase tracking-widest px-6 py-2 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Chargement...' : 'Charger plus'}
                        </button>
                    )}
                </div>
            </div>
            <ConfirmModal
                isOpen={!!userToDelete || !!userToToggle || !!userToResetCount}
                onClose={() => {
                    if (!isProcessing) {
                        setUserToDelete(null);
                        setUserToToggle(null);
                        setUserToResetCount(null);
                    }
                }}
                onConfirm={userToDelete ? confirmDeleteUser : (userToToggle ? confirmToggleRole : confirmResetCount)}
                title={userToDelete ? "Supprimer l'utilisateur ?" : (userToToggle ? "Modifier le rôle ?" : "Réinitialiser le compteur ?")}
                message={userToDelete
                    ? "ATTENTION: Cette action est irréversible. L'utilisateur sera supprimé de la base de données (Note: cela ne supprime pas le compte Auth Firebase)."
                    : (userToToggle 
                        ? `Voulez-vous vraiment ${userToToggle?.role === 'admin' ? "rétrograder" : "promouvoir"} l'utilisateur ${userToToggle?.displayName || userToToggle?.email || userToToggle?.phoneNumber || "Anonyme"} ?`
                        : `Voulez-vous vraiment réinitialiser le compteur de liens pour l'utilisateur ${userToResetCount?.displayName || userToResetCount?.email || userToResetCount?.phoneNumber || "Anonyme"} ?`
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
        </div>
    );
}
