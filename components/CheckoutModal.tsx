"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLemonSqueezyOverlay } from "@/hooks/useLemonSqueezyOverlay";
import { useAuth } from "@/context/AuthContext";

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
}

export default function CheckoutModal({ isOpen, onClose, product, onBeforePaymentRedirect }: CheckoutModalProps) {
  const { user: currentUser } = useAuth();
  const supabase = createClient();
  const priceHTG = typeof product.priceHTG === 'number'
    ? product.priceHTG
    : (product.priceHTG ? parseFloat(String(product.priceHTG)) : 0);

  const [isClosing, setIsClosing] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');

  const [modalStep, setModalStep] = useState<'contact' | 'name' | 'payment' | 'success'>('contact');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alreadyOwnedMessage, setAlreadyOwnedMessage] = useState<string | null>(null);
  const [tempLink, setTempLink] = useState<string | null>(null);

  const { openCheckout, hasExpiredSession } = useLemonSqueezyOverlay();

  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setModalStep('payment');
      } else {
        setModalStep('contact');
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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setPassword('');
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
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', product.id);
      
    return enrollments && enrollments.length > 0;
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    try {
      if (modalStep === 'name') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              displayName: fullName.trim(),
              name: fullName.trim(),
              role: "customer"
            }
          }
        });

        if (error) throw error;
        
        if (data.user) {
            const { error: insertError } = await supabase.from('users').upsert({
                id: data.user.id,
                email: data.user.email,
                name: fullName.trim(),
                role: "customer",
                status: "active"
            }, { onConflict: 'id' });
            if (insertError) console.error("Error creating user profile:", insertError);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
           if (error.message.includes('Invalid login credentials')) {
               // Check if user exists but has no account vs wrong password
               // Since we can't easily distinguish without risking security, we'll ask for name to create
               setModalStep('name');
               setIsLoading(false);
               return;
           }
           throw error;
        }

        if (data.user) {
          const ownsCourse = await checkCourseOwnership(data.user.id);
          if (ownsCourse) {
            setAlreadyOwnedMessage("Ou gen pwodui sa a deja ! 🎉 Klike sou bouton anba a pou w ka antre dirèkteman.");
            setModalStep('success');
            return;
          }
        }
      }

      setAlreadyOwnedMessage(null);
      setModalStep('payment');
    } catch (err: any) {
      console.error("Erreur de connexion:", err);
      setError(err.message || "Imel oswa modpas la pa bon.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (method: 'moncash' | 'lemonsqueezy') => {
    setIsLoading(true);
    setError(null);

    try {
      const amountValue = method === 'moncash' ? priceHTG : (typeof product.price === 'number' ? product.price : parseFloat(product.price.toString()));
      const currencyValue = method === 'moncash' ? "HTG" : product.currency;
      const finalEmail = (email || currentUser?.email || "").trim().toLowerCase();

      // Ensure user exists in our flow
      let userIdToUse = currentUser?.id;
      if (!userIdToUse) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
              userIdToUse = session.user.id;
          }
      }

      const pendingRes = await fetch("/api/checkout/create-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userIdToUse,
          email: finalEmail,
          phone: "",
          contactMethod: 'email',
          targetProductId: product.id,
          productType: product.type,
          amount: amountValue,
          currency: currencyValue,
          headline: product.title || product.headline || "Achat",
          videoPoster: product.image || product.videoPoster || "",
          paymentMethod: method
        })
      });

      if (!pendingRes.ok) {
        const errorData = await pendingRes.json();
        throw new Error(errorData.error || "Echèk nan kòmanse kòmand lan");
      }

      const { userId, userEmail, userName, orderId } = await pendingRes.json();

      if (onBeforePaymentRedirect) {
        await onBeforePaymentRedirect(userId);
      }

      if (method === 'moncash') {
        const response = await fetch("/api/bazik/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            amount: amountValue,
            description: product.title || product.headline,
            customerFirstName: userName || "Kliyan",
            userId: userId,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Echèk nan kòmanse peman Moncash la");
        const redirectUrl = data.redirectUrl || data.redirect_url || data.payment_link;
        if (redirectUrl) window.location.href = redirectUrl;
        else if (data.payment_token?.redirect_url) window.location.href = data.payment_token.redirect_url;
        else throw new Error("Nou pa jwenn lyen Moncash la");

      } else if (method === 'lemonsqueezy') {
        const response = await fetch("/api/lemonsqueezy/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            userId: userId,
            userEmail: userEmail,
            userName: userName
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Echèk nan kòmanse sesyon peman an");
        if (data.checkoutUrl) {
          await openCheckout(data.checkoutUrl, orderId, data.sessionExpiresAtMs);
        } else {
          throw new Error("Nou pa resevwa okenn lyen peman");
        }
      }
    } catch (err: any) {
      setError(err.message || "Gen yon erè ki fèt pandan n ap kòmanse peman an.");
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowMonCash = true;

  if (!isOpen) return null;

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
            
            {/* STEP 1: CONTACT */}
            {modalStep === 'contact' && (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                      <span className="text-xl">🚀</span>
                    </div>
                    <div>
                      <h2 className="text-lg lg:text-xl font-black leading-tight">Aksè rapid</h2>
                    </div>
                  </div>
                  <button onClick={handleClose} className="hidden lg:flex size-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors shrink-0 ml-2">
                    <svg className="size-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex p-1 bg-white/5 rounded-xl mb-5">
                  <button type="button" className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] sm:text-xs lg:text-sm font-bold rounded-lg transition-all bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md`}>
                    <span>✉️</span> Email
                  </button>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-xl mb-4 text-center">{error}</div>}

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Adrès e-mail</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" required autoFocus className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all text-sm bg-transparent text-white" />
                    </div>

                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-250">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Modpas</label>
                      </div>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="w-full pl-4 pr-10 py-3.5 bg-white/5 border border-white/10 rounded-xl placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all text-sm bg-transparent text-white" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1 flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined notranslate text-[18px]">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      <p className="text-[11px] text-white/40 pl-1 mt-1">
                        Modpas la dwe gen omwen 6 karaktè.
                      </p>
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading || (!email || password.length < 6)} className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white font-black rounded-xl text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-orange-500/20 flex items-center justify-center">
                    {isLoading ? <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : "Kontinye →"}
                  </button>
                </form>
              </>
            )}

            {/* STEP 1.5: NAME */}
            {modalStep === 'name' && (
              <div className="flex flex-col gap-4 py-5 px-4 sm:p-5 border border-white/10 rounded-2xl bg-white/[0.03]">
                  <div className="flex flex-col items-center text-center mb-2">
                      <div className="size-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3 text-orange-400">
                          <span className="material-symbols-outlined notranslate text-2xl">person</span>
                      </div>
                      <h3 className="font-bold text-base text-white">Byenvini !</h3>
                      <p className="text-xs text-white/50 max-w-xs leading-relaxed mt-1">
                          Nou pa jwenn kont pou imel sa a. Tanpri antre non w pou nou ka kreye kont ou a.
                      </p>
                  </div>

                  <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Non konplè w</label>
                          <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Eg: Jean Dupont"
                              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all text-sm font-medium bg-transparent text-white"
                              required
                              autoFocus
                          />
                      </div>

                      <button
                          type="submit"
                          disabled={isLoading || fullName.trim().length < 2}
                          className="w-full py-3 mt-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:pointer-events-none"
                      >
                          {isLoading ? <div className="size-4 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto"></div> : "Kontinye"}
                      </button>

                      <div className="flex justify-center mt-2 px-1 text-xs">
                          <button
                              type="button"
                              onClick={() => {
                                  setModalStep('contact');
                                  setError(null);
                              }}
                              className="text-white/40 hover:text-white transition-colors"
                          >
                              Retounen
                          </button>
                      </div>
                  </form>
              </div>
            )}

            {/* STEP 3: PAYMENT */}
            {modalStep === 'payment' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  {!currentUser && <button onClick={() => { setModalStep('contact'); setError(null); }} className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-bold transition-colors"><svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg> Retounen</button>}
                  {currentUser && <div />}
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

            {/* STEP 4: SUCCESS */}
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
                    <p className="text-sm text-white/50 mb-6 text-center">Lyen an voye nan <span className="text-white font-bold">{email}</span>.</p>
                    <button onClick={() => { setModalStep('contact'); setEmail(''); }} className="text-xs text-orange-400 underline hover:text-orange-300 transition-colors">Itilize yon lòt fason</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
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
