"use client";

import { useState, useEffect, useRef } from "react";
import { useLemonSqueezyOverlay } from "@/hooks/useLemonSqueezyOverlay";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "@/components/shared/LoginModal";

export interface CheckoutProduct {
  id: string;
  title: string;
  priceHTG: number;
  price: number | string;
  currency: string;
  lemonSqueezyId?: string;
  type: string;
  image?: string;
  headline?: string;
  videoPoster?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CheckoutProduct;
  onBeforePaymentRedirect?: (userId: string) => Promise<void>;
  /**
   * Réservation déjà enregistrée en base et en attente de paiement.
   * Transmise au prestataire puis retrouvée au retour pour confirmer le rendez-vous.
   */
  bookingId?: string;
}

export default function CheckoutModal({ isOpen, onClose, product, onBeforePaymentRedirect, bookingId }: CheckoutModalProps) {
  const { user: currentUser } = useAuth();
  const priceHTG = typeof product.priceHTG === 'number'
    ? product.priceHTG
    : (product.priceHTG ? parseFloat(String(product.priceHTG)) : 0);

  const [isClosing, setIsClosing] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  const [modalStep, setModalStep] = useState<'login' | 'payment' | 'success'>('payment');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alreadyOwnedMessage, setAlreadyOwnedMessage] = useState<string | null>(null);
  const [tempLink, setTempLink] = useState<string | null>(null);

  const { openCheckout, hasExpiredSession } = useLemonSqueezyOverlay();

  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setModalStep('payment');
      } else {
        setModalStep('login');
      }

      setIsClosing(false);
      setDragY(0);
      const timer = setTimeout(() => {
        setAnimate(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsClosing(false);
      setAnimate(false);
      setDragY(0);
    }
  }, [isOpen, currentUser]);

  // Handle back-forward cache (bfcache) pour réinitialiser le bouton si l'utilisateur fait "Retour"
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsRedirecting(false);
        setIsLoading(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 350);
  };

  const onDragStart = (e: React.TouchEvent | React.PointerEvent) => {
    isDragging.current = true;
    dragStartY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
  };
  const onDragMove = (e: React.TouchEvent | React.PointerEvent) => {
    if (!isDragging.current) return;
    const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = Math.max(0, currentY - dragStartY.current);
    setDragY(delta);
  };
  const onDragEnd = () => {
    isDragging.current = false;
    if (dragY > 80) handleClose();
    else setDragY(0);
  };

  const checkCourseOwnership = async (userId: string) => {
    try {
      const { db } = await import("@/lib/firebase");
      const { collection, query, where, getDocs, limit } = await import("firebase/firestore");
      
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentsQ = query(
          enrollmentsRef,
          where("userId", "==", userId),
          where("productId", "==", product.id),
          limit(1)
      );
      const enrollmentsSnap = await getDocs(enrollmentsQ);
      return !enrollmentsSnap.empty;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handlePurchase = async (method: 'moncash' | 'lemonsqueezy' | 'natcash') => {
    setIsLoading(true);
    setIsRedirecting(false);
    setError(null);
    let willRedirect = false;

    try {
      const amountValue = (method === 'moncash' || method === 'natcash') ? priceHTG : (typeof product.price === 'number' ? product.price : parseFloat(product.price.toString()));
      const currencyValue = (method === 'moncash' || method === 'natcash') ? "HTG" : product.currency;
      const finalEmail = (currentUser?.email || "").trim().toLowerCase();

      // Ensure user exists in our flow
      let userIdToUse = currentUser?.uid;

      if (onBeforePaymentRedirect && userIdToUse) {
        await onBeforePaymentRedirect(userIdToUse);
      }

      // Filet de sécurité : si la commande ne remonte pas le bookingId au retour,
      // la page de vérification le retrouve ici.
      if (bookingId) localStorage.setItem("pending_booking", bookingId);

      if (userIdToUse) {
        const alreadyOwns = await checkCourseOwnership(userIdToUse);
        if (alreadyOwns) {
          setAlreadyOwnedMessage("Ou gen pwodui sa a deja! Inutile d'acheter à nouveau.");
          setModalStep('success');
          setIsLoading(false);
          return;
        }
      }

      if (method === 'lemonsqueezy') {
        // Si lemonSqueezyId est une URL complète, fallback; sinon appeler l'API
        let checkoutUrl = "";
        const lsId = (product.lemonSqueezyId || "").trim();

        if (lsId.startsWith("http://") || lsId.startsWith("https://")) {
          checkoutUrl = lsId;
          if (userIdToUse) {
            const sep = checkoutUrl.includes('?') ? '&' : '?';
            checkoutUrl += `${sep}checkout[custom][userId]=${userIdToUse}&checkout[custom][productId]=${product.id}&checkout[custom][productType]=${product.type}`;
          }
        } else {
          // Appeler l'API pour générer le Checkout avec Custom Price
          const response = await fetch('/api/payment/lemon-squeezy/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              productType: product.type || 'course',
              userId: userIdToUse,
              userEmail: finalEmail,
              userName: currentUser?.displayName || "Client",
              bookingId
            })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || "Erreur lors de l'ouverture du paiement Lemon Squeezy.");
          }

          checkoutUrl = data.checkoutUrl;
          if (data.orderId) localStorage.setItem("pending_lemon-squeezy_order", data.orderId);
        }
        
        // Rediriger directement vers la page officielle Lemon Squeezy (évite le bug 404 lors du changement de pays dans l'overlay)
        willRedirect = true;
        setIsRedirecting(true);
        window.location.href = checkoutUrl;
        return;
      } else if (method === 'moncash' || method === 'natcash') {
        const response = await fetch('/api/payment/plopplop/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            productType: product.type || 'course', // Défaut à course si non défini
            method: method,
            userId: userIdToUse,
            userEmail: finalEmail,
            userName: currentUser?.displayName || "Client",
            bookingId
          })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Peman an pa ka kòmanse. Eseye ankò.");
        }

        // Rediriger vers l'URL Plopplop
        if (data.checkoutUrl) {
           localStorage.setItem("pending_plopplop_order", data.orderId);
           willRedirect = true;
           setIsRedirecting(true);
           window.location.href = data.checkoutUrl;
           return;
        } else {
           throw new Error("Plopplop pa voye lyen peman an.");
        }
      }
    } finally {
      if (!willRedirect) {
        setIsLoading(false);
      }
    }
  };

  const shouldShowMonCash = true;

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <LoginModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={() => {}}
        productName={product.title}
      />
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[150] flex items-end lg:items-center justify-center p-0 lg:p-6 transition-colors duration-300 ${
          isClosing || !animate ? 'bg-black/0 backdrop-blur-none' : 'bg-black/70 backdrop-blur-sm'
        }`}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div
          className="w-full lg:max-w-lg bg-[#141414] border border-white/10 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-visible text-white"
          style={{
            transform: isClosing || !animate
              ? 'translateY(100%)'
              : dragY > 0
              ? `translateY(${dragY}px)`
              : 'translateY(0)',
            opacity: isClosing ? 0 : !animate ? 0 : dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1,
            transition: isDragging.current ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease',
          }}
        >
          <div
            className="flex justify-center pt-4 pb-2 lg:hidden cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
          >
            <div
              className="rounded-full bg-white/25 transition-all duration-150"
              style={{
                width: dragY > 20 ? '48px' : '40px',
                height: '4px',
                opacity: dragY > 0 ? 0.6 : 1,
              }}
            />
          </div>

          <div className="p-6 lg:p-8 overflow-y-auto max-h-[85vh] lg:max-h-[90vh]">
            
            {/* STEP 1: PAYMENT */}
            {modalStep === 'payment' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Peman</p>
                  <button onClick={handleClose} className="hidden lg:flex size-7 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors"><svg className="size-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>

                <div className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                  <span className="text-xs text-white/50">Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black">{product.currency}{product.price}</span>
                  </div>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-xl mb-4 text-center">{error}</div>}

                <p className="text-xs text-white/40 text-center mb-4 font-semibold uppercase tracking-widest">Kijan ou vle peye ?</p>

                <div className="space-y-3">
                  {shouldShowMonCash && (
                    <>
                      <button 
                        onClick={() => handlePurchase('moncash')} 
                        disabled={isLoading || priceHTG <= 0} 
                        className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#e30713]/20 to-[#e30713]/5 border-2 border-[#e30713]/50 hover:border-[#e30713] rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale group text-left"
                      >
                        <img src="/images/moncash-logo.png" alt="MonCash" className="size-12 object-contain rounded-xl shadow-lg shrink-0" />
                        <div className="flex-1">
                          <p className="font-black text-sm">
                            MonCash {priceHTG > 0 ? `(${priceHTG} HTG)` : ''}
                          </p>
                          {priceHTG > 0 ? (
                            <p className="text-xs text-white/50 font-medium">Peman mobil ayisyen</p>
                          ) : (
                            <p className="text-xs text-red-400 font-semibold mt-0.5">
                              Pwodui sa a pa disponib pou peman MonCash
                            </p>
                          )}
                        </div>
                      </button>

                      <button 
                        onClick={() => handlePurchase('natcash')} 
                        disabled={isLoading || priceHTG <= 0} 
                        className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#f48024]/20 to-[#f48024]/5 border-2 border-[#f48024]/50 hover:border-[#f48024] rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale group text-left"
                      >
                        <div className="size-12 bg-white rounded-xl shadow-lg shrink-0 flex items-center justify-center p-1">
                           <img src="/images/natcash.png" alt="Natcash" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
                           <span className="hidden font-black text-[#f48024] text-xs">NAT</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm">
                            Natcash {priceHTG > 0 ? `(${priceHTG} HTG)` : ''}
                          </p>
                          {priceHTG > 0 ? (
                            <p className="text-xs text-white/50 font-medium">Peman mobil Natcom</p>
                          ) : (
                            <p className="text-xs text-red-400 font-semibold mt-0.5">
                              Pwodui sa a pa disponib pou peman Natcash
                            </p>
                          )}
                        </div>
                      </button>
                    </>
                  )}

                  <button onClick={() => handlePurchase('lemonsqueezy')} disabled={isLoading} className="w-full flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/[0.06] rounded-2xl transition-all active:scale-95 disabled:opacity-50 group">
                    <div className="size-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0"><span className="text-xl">💳</span></div>
                    <div className="text-left flex-1">
                      <p className="font-black text-sm">Kat bankè · PayPal</p>
                      <p className="text-xs text-white/50">Visa, Mastercard, Amex</p>
                    </div>
                  </button>
                </div>

                {isLoading && <div className="flex items-center justify-center gap-2 mt-4 text-white/40 text-xs"><div className="size-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"/> N ap trete...</div>}
              </div>
            )}

            {/* STEP 2: SUCCESS */}
            {modalStep === 'success' && (
              <div className="text-center py-6">
                {alreadyOwnedMessage ? (
                  <>
                    <div className="size-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30"><span className="text-3xl">🎉</span></div>
                    <h2 className="text-xl font-black mb-2 leading-tight uppercase">Ou gen pwodui sa a deja !</h2>
                    <p className="text-sm text-white/60 mb-6">{alreadyOwnedMessage}</p>
                    <button onClick={() => window.location.href = tempLink || "/dashboard"} className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"><span className="material-symbols-outlined text-lg">login</span> Antre</button>
                  </>
                ) : (
                  <>
                    <div className="size-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-3xl">📬</span></div>
                    <h2 className="text-xl font-black mb-2">Verifye e-mail ou yo !</h2>
                    <p className="text-sm text-white/50 mb-6 text-center">Lyen an voye nan <span className="text-white font-bold">{currentUser?.email}</span>.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ── REDIRECTION OVERLAY ── */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="size-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-white tracking-wide">Redirection vers le paiement...</p>
          </div>
        </div>
      )}

      {/* ── SESSION EXPIRÉE POPUP ── */}
      {hasExpiredSession && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#1a1a1a] border border-red-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl shadow-red-500/20 animate-in fade-in zoom-in duration-300">
            <div className="size-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⏱️</div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Sesyon an ekspire</h3>
            <p className="text-sm text-white/60 mb-8 leading-relaxed">Tan pou w fè peman an depase. Tanpri rechaje paj la pou w ka kòmanse yon lòt sesyon an sekirite.</p>
            <button onClick={() => window.location.reload()} className="w-full h-14 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black uppercase tracking-wider text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">Rechaje paj la</button>
          </div>
        </div>
      )}
    </>
  );
}

