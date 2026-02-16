"use client";

import { useState, useEffect } from "react";
import { getReviews, updateReview, deleteReview } from "@/lib/reviews";
import { Review } from "@/lib/types";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { format } from "date-fns";

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [ratingFilter, setRatingFilter] = useState("All Ratings");
    const [visibilityFilter, setVisibilityFilter] = useState("All Visibility");

    // Action States
    const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Fetch Reviews
    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const data = await getReviews();
            setReviews(data);
        } catch (error: any) {
            console.error("Error loading reviews:", error);
            // Attempt to log the actual error message
            if (error instanceof Error) {
                console.error(error.message);
            } else {
                console.error(JSON.stringify(error));
            }
        } finally {
            setLoading(false);
        }
    };

    // Derived State: Filters
    const filteredReviews = reviews.filter(review => {
        const matchesSearch = (
            (review.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (review.productTitle?.toLowerCase() || "").includes(searchTerm.toLowerCase())
        );

        const matchesRating = ratingFilter === "All Ratings" || review.rating === parseInt(ratingFilter.charAt(0));

        const matchesVisibility = visibilityFilter === "All Visibility"
            ? true
            : visibilityFilter === "Visible Only"
                ? review.isVisible
                : !review.isVisible;

        return matchesSearch && matchesRating && matchesVisibility;
    });

    // Derived State: Pagination
    const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
    const paginatedReviews = filteredReviews.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, ratingFilter, visibilityFilter]);

    // Handlers
    const openDrawer = (review: Review) => {
        setSelectedReview(review);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => setIsDrawerOpen(false);

    const handleToggleVisibility = async (review: Review) => {
        if (!review.id) return;
        try {
            const newVisibility = !review.isVisible;
            await updateReview(review.id, { isVisible: newVisibility });
            // Optimistic update
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, isVisible: newVisibility } : r));
            if (selectedReview?.id === review.id) {
                setSelectedReview(prev => prev ? { ...prev, isVisible: newVisibility } : null);
            }
        } catch (error) {
            console.error("Failed to update visibility", error);
            alert("Erreur lors de la mise à jour.");
        }
    };

    const confirmDelete = async () => {
        if (!reviewToDelete) return;
        setIsDeleting(true);
        try {
            await deleteReview(reviewToDelete);
            setReviews(prev => prev.filter(r => r.id !== reviewToDelete));
            setReviewToDelete(null);
            if (selectedReview?.id === reviewToDelete) closeDrawer();
        } catch (error) {
            console.error("Failed to delete review", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <main className="flex flex-col h-full overflow-x-hidden animate-in fade-in duration-700">
            {/* Top Stats Row */}
            <header className="flex flex-col mb-8">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">Product Reviews</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and moderate customer feedback across all products.</p>
                    </div>
                </div>
            </header>

            {/* Filters and Table */}
            <section className="bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
                {/* Filter Bar */}
                <div className="p-4 border-b border-slate-100 dark:border-white/10 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 dark:bg-transparent">
                    <div className="flex-1 min-w-[300px] relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-primary focus:border-primary transition-all outline-none"
                            placeholder="Search by user or product name..."
                            type="text"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            className="text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg py-2 pl-3 pr-8 focus:ring-primary outline-none"
                        >
                            <option>All Ratings</option>
                            <option>5 Stars</option>
                            <option>4 Stars</option>
                            <option>3 Stars</option>
                            <option>2 Stars</option>
                            <option>1 Star</option>
                        </select>
                        <select
                            value={visibilityFilter}
                            onChange={(e) => setVisibilityFilter(e.target.value)}
                            className="text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg py-2 pl-3 pr-8 focus:ring-primary outline-none"
                        >
                            <option>All Visibility</option>
                            <option>Visible Only</option>
                            <option>Hidden Only</option>
                        </select>
                        <button
                            onClick={() => { setSearchTerm(""); setRatingFilter("All Ratings"); setVisibilityFilter("All Visibility"); }}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/40 text-[10px] font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">User Name</th>
                                <th className="px-6 py-4">Rating</th>
                                <th className="px-6 py-4">Product Title</th>
                                <th className="px-6 py-4">Comment</th>
                                <th className="px-6 py-4">Date Created</th>
                                <th className="px-6 py-4">IsVisible</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">Loading reviews...</td>
                                </tr>
                            ) : filteredReviews.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">No reviews found matching {searchTerm || "filters"}.</td>
                                </tr>
                            ) : (
                                paginatedReviews.map((review) => (
                                    <tr
                                        key={review.id}
                                        onClick={() => openDrawer(review)}
                                        className="hover:bg-primary/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3"><span className="text-sm font-bold">{review.userName || "Anonymous"}</span></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex text-primary gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <span
                                                        key={star}
                                                        className={`material-symbols-outlined text-lg ${star <= review.rating ? "opacity-100" : "opacity-30"}`}
                                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                                    >
                                                        star
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">{review.rating}/5</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold">{review.productTitle || "Unknown Product"}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 max-w-[200px]">{review.comment}</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {review.createdAt && typeof review.createdAt.toDate === 'function'
                                                ? format(review.createdAt.toDate(), "MMM d, yyyy")
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <label className="inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    checked={review.isVisible}
                                                    onChange={() => handleToggleVisibility(review)}
                                                    className="sr-only peer"
                                                    type="checkbox"
                                                />
                                                <div className="relative w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary transition-colors"></div>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); review.id && setReviewToDelete(review.id); }}
                                                className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between mt-auto">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Showing {filteredReviews.length} reviews
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Logic to show a sliding window of pages could be complex, 
                                // for now let's show first 5 or simpler logic if pages > 5
                                let p = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) p = currentPage - 2 + i;
                                    if (p > totalPages) p = totalPages - (4 - i);
                                }

                                return (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${currentPage === p
                                            ? "bg-primary text-white"
                                            : "hover:bg-slate-200 dark:hover:bg-white/10"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>

            {/* Review Detail Drawer */}
            <div className={`fixed inset-0 z-[60] overflow-hidden ${isDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <div
                    className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={closeDrawer}
                ></div>
                <div className={`absolute inset-y-0 right-0 max-w-md w-full bg-white dark:bg-background-dark shadow-2xl transform transition-transform duration-300 border-l border-slate-200 dark:border-white/10 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                        <h3 className="text-xl font-bold">Review Details</h3>
                        <button onClick={closeDrawer} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    {selectedReview && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <section>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">User Name</p>
                                <p className="text-lg font-bold">{selectedReview.userName || "Anonymous"}</p>
                            </section>
                            <section>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Product Title</p>
                                <p className="font-semibold">{selectedReview.productTitle || "Unknown Product"}</p>
                            </section>
                            <section>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Rating</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex text-primary gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span
                                                key={star}
                                                className={`material-symbols-outlined text-lg ${star <= selectedReview.rating ? "opacity-100" : "opacity-30"}`}
                                                style={{ fontVariationSettings: "'FILL' 1" }}
                                            >
                                                star
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-sm font-bold">{selectedReview.rating} / 5</span>
                                </div>
                            </section>
                            <section>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Date Created</p>
                                <p className="text-slate-600 dark:text-slate-400">
                                    {selectedReview.createdAt && typeof selectedReview.createdAt.toDate === 'function'
                                        ? format(selectedReview.createdAt.toDate(), "MMMM d, yyyy 'at' p")
                                        : "-"}
                                </p>
                            </section>
                            <section>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Full Comment</p>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/5 p-4 rounded-lg whitespace-pre-wrap">
                                    {selectedReview.comment}
                                </p>
                            </section>
                            <section>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Visibility</p>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${selectedReview.isVisible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                        {selectedReview.isVisible ? "Visible" : "Hidden"}
                                    </span>
                                    <button
                                        onClick={() => handleToggleVisibility(selectedReview)}
                                        className="text-primary text-xs font-bold hover:underline"
                                    >
                                        Toggle Visibility
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmModal
                isOpen={!!reviewToDelete}
                onClose={() => !isDeleting && setReviewToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Review?"
                message="Are you sure you want to delete this review? This action cannot be undone."
                confirmText="Delete"
                isDanger={true}
                isLoading={isDeleting}
            />
        </main>
    );
}
