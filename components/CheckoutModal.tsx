"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLemonSqueezyOverlay } from "@/hooks/useLemonSqueezyOverlay";
import { useAuth } from "@/context/AuthContext";
import {
  checkUserAction,
  generateOtpAction,
  verifyOtpAndLoginAction
} from "@/app/actions/auth";

export interface CheckoutProduct {
  id: string;
  title: string;
  priceHTG: number;
  price: number | string;
  currency: string;
  lemonSqueezyId?: string;
  type: string; // 'course' | 'ebook' | 'service'
  image?: string;
  // Options pour l'affichage de la commande
  headline?: string;
  videoPoster?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CheckoutProduct;
  onBeforePaymentRedirect?: (userId: string) => Promise<void>;
}

// ─── COUNTRIES LIST ──────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'HT', name: 'Haïti',              dial: '+509', flag: '🇭🇹' },
  { code: 'DO', name: 'Rép. Dominicaine',    dial: '+1',   flag: '🇩🇴' },
  { code: 'CU', name: 'Cuba',               dial: '+53',  flag: '🇨🇺' },
  { code: 'JM', name: 'Jamaïque',           dial: '+1',   flag: '🇯🇲' },
  { code: 'PR', name: 'Porto Rico',          dial: '+1',   flag: '🇵🇷' },
  { code: 'TT', name: 'Trinidad & Tobago',   dial: '+1',   flag: '🇹🇹' },
  { code: 'BB', name: 'Barbade',             dial: '+1',   flag: '🇧🇧' },
  { code: 'US', name: 'États-Unis',          dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',              dial: '+1',   flag: '🇨🇦' },
  { code: 'MX', name: 'Mexique',             dial: '+52',  flag: '🇲🇽' },
  { code: 'GT', name: 'Guatemala',           dial: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras',            dial: '+504', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador',         dial: '+503', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua',           dial: '+505', flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica',          dial: '+506', flag: '🇨🇷' },
  { code: 'PA', name: 'Panama',              dial: '+507', flag: '🇵🇦' },
  { code: 'CO', name: 'Colombie',            dial: '+57',  flag: '🇨🇴' },
  { code: 'VE', name: 'Venezuela',           dial: '+58',  flag: '🇻🇪' },
  { code: 'EC', name: 'Équateur',            dial: '+593', flag: '🇪🇨' },
  { code: 'PE', name: 'Pérou',              dial: '+51',  flag: '🇵🇪' },
  { code: 'BO', name: 'Bolivie',             dial: '+591', flag: '🇧🇴' },
  { code: 'CL', name: 'Chili',              dial: '+56',  flag: '🇨🇱' },
  { code: 'AR', name: 'Argentine',           dial: '+54',  flag: '🇦🇷' },
  { code: 'UY', name: 'Uruguay',             dial: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay',            dial: '+595', flag: '🇵🇾' },
  { code: 'BR', name: 'Brésil',             dial: '+55',  flag: '🇧🇷' },
  { code: 'FR', name: 'France',              dial: '+33',  flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique',            dial: '+32',  flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse',              dial: '+41',  flag: '🇨🇭' },
  { code: 'GP', name: 'Guadeloupe',          dial: '+590', flag: '🇬🇵' },
  { code: 'MQ', name: 'Martinique',          dial: '+596', flag: '🇲🇶' },
  { code: 'GF', name: 'Guyane',             dial: '+594', flag: '🇬🇫' },
  { code: 'RE', name: 'La Réunion',         dial: '+262', flag: '🇷🇪' },
  { code: 'GB', name: 'Royaume-Uni',         dial: '+44',  flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne',           dial: '+49',  flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne',             dial: '+34',  flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal',            dial: '+351', flag: '🇵🇹' },
  { code: 'IT', name: 'Italie',              dial: '+39',  flag: '🇮🇹' },
  { code: 'NL', name: 'Pays-Bas',           dial: '+31',  flag: '🇳🇱' },
  { code: 'CN', name: 'Chine',              dial: '+86',  flag: '🇨🇳' },
  { code: 'KR', name: 'Corée du Sud',        dial: '+82',  flag: '🇰🇷' },
  { code: 'JP', name: 'Japon',              dial: '+81',  flag: '🇯🇵' },
];

const TIMEZONE_MAP: Record<string, string> = {
  'America/Port-au-Prince': 'HT', 'America/Santo_Domingo': 'DO',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Winnipeg': 'CA',
  'America/Montreal': 'CA', 'America/Halifax': 'CA',
  'Europe/Paris': 'FR', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH',
  'America/Guadeloupe': 'GP', 'America/Martinique': 'MQ',
  'America/Cayenne': 'GF', 'Indian/Reunion': 'RE',
  'America/Havana': 'CU', 'America/Jamaica': 'JM', 'America/Puerto_Rico': 'PR',
  'America/Port_of_Spain': 'TT', 'America/Barbados': 'BB',
  'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Monterrey': 'MX',
  'America/Guatemala': 'GT', 'America/Tegucigalpa': 'HN', 'America/El_Salvador': 'SV',
  'America/Managua': 'NI', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA',
  'America/Bogota': 'CO', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC',
  'America/Lima': 'PE', 'America/La_Paz': 'BO', 'America/Santiago': 'CL',
  'America/Argentina/Buenos_Aires': 'AR', 'America/Montevideo': 'UY', 'America/Asuncion': 'PY',
  'America/Sao_Paulo': 'BR', 'America/Manaus': 'BR', 'America/Fortaleza': 'BR',
  'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES',
  'Europe/Lisbon': 'PT', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL',
  'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Beijing': 'CN',
  'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP',
};

function detectCountry(): (typeof COUNTRIES)[0] {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const code = TIMEZONE_MAP[tz];
    if (code) { const found = COUNTRIES.find(c => c.code === code); if (found) return found; }
  } catch {}
  return COUNTRIES[0]; // fallback Haïti
}

function formatPhone(digits: string, countryCode: string): string {
  if (!digits) return '';
  if (countryCode === 'HT') {
    const d = digits.slice(0, 8);
    if (d.length <= 4) return d;
    return `${d.slice(0, 4)} ${d.slice(4)}`;
  }
  const plusOne = ['US','CA','DO','JM','PR','TT','BB'];
  if (plusOne.includes(countryCode)) {
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  const d = digits.slice(0, 12);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}

export default function CheckoutModal({ isOpen, onClose, product, onBeforePaymentRedirect }: CheckoutModalProps) {
  const { user: currentUser } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(() => detectCountry());
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, above: false });
  const [countrySearch, setCountrySearch] = useState('');
  const countryBtnRef = useRef<HTMLButtonElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [contactMethod, setContactMethod] = useState<'email' | 'phone' | 'whatsapp'>('whatsapp');
  const [modalStep, setModalStep] = useState<'contact' | 'payment' | 'verify_code' | 'success'>('contact');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [whatsappRedirect, setWhatsappRedirect] = useState<{ url: string; businessPhone: string } | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [alreadyOwnedMessage, setAlreadyOwnedMessage] = useState<string | null>(null);
  const [tempLink, setTempLink] = useState<string | null>(null);

  const { openCheckout, hasExpiredSession } = useLemonSqueezyOverlay();

  // Handle modal mount & routing logic
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto-skip contact step if logged in
      if (currentUser) {
        setModalStep('payment');
      } else {
        setModalStep('contact');
      }
    } else {
      document.body.style.overflow = '';
      setIsClosing(false);
      setDragY(0);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, currentUser]);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openCountryDropdown = () => {
    if (!countryBtnRef.current) return;
    const rect = countryBtnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 260;
    setDropdownPos({
      top: above ? rect.top - 8 : rect.bottom + 4,
      left: rect.left,
      above,
    });
    setShowCountryDropdown(true);
    setCountrySearch('');
  };

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

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (contactMethod === 'email' && !email) return;
    
    let cleanPhone = "";
    if (contactMethod === 'phone' || contactMethod === 'whatsapp') {
      if (!phone) return;
      setError(null);

      let cleanNumber = phone.replace(/\D/g, "");
      const dialDigits = selectedCountry.dial.replace(/\D/g, "");
      if (cleanNumber.startsWith(dialDigits)) cleanNumber = cleanNumber.substring(dialDigits.length);
      if (cleanNumber.startsWith("0")) cleanNumber = cleanNumber.substring(1);

      const getExpectedDigitsLength = (code: string) => {
        switch (code) {
          case 'HT': return 8;
          case 'FR': case 'BE': case 'CH': case 'GP': case 'MQ': case 'GF': case 'RE': return 9;
          case 'US': case 'CA': case 'DO': case 'PR': case 'JM': case 'TT': case 'BB': case 'MX': case 'CO': return 10;
          default: return 8;
        }
      };

      const expectedLength = getExpectedDigitsLength(selectedCountry.code);
      if (cleanNumber.length !== expectedLength) {
        setError(
          selectedCountry.code === 'HT'
            ? `Le numéro pour Haïti doit comporter exactement 8 chiffres (ex: 34567890). Tu as saisi ${cleanNumber.length} chiffre(s).`
            : `Le numéro pour ${selectedCountry.name} doit comporter exactement ${expectedLength} chiffres. Tu as saisi ${cleanNumber.length} chiffre(s).`
        );
        return;
      }
      cleanPhone = `${selectedCountry.dial}${cleanNumber}`;
      setVerifiedPhone(cleanPhone);
    }

    setIsLoading(true);
    setError(null);
    try {
      const targetProductId = product.id;
      const checkData = await checkUserAction(
        (contactMethod === 'phone' || contactMethod === 'whatsapp') ? cleanPhone : "", 
        contactMethod === 'email' ? email : "", 
        targetProductId
      );

      if (checkData.error) throw new Error(checkData.error);

      if (checkData.exists && checkData.ownsCourse) {
        setAlreadyOwnedMessage(
          "Tu possèdes déjà ce produit ! 🎉 Saisis le code reçu pour y accéder directement."
        );
      } else {
        setAlreadyOwnedMessage(null);
      }

      const contactToUse = (contactMethod === 'phone' || contactMethod === 'whatsapp') ? cleanPhone : email;
      const genData = await generateOtpAction(contactToUse, contactMethod);

      if (genData.error) throw new Error(genData.error);

      if (genData.action === "redirect_to_whatsapp" && genData.businessPhone) {
        setWhatsappRedirect({
            url: `https://wa.me/${genData.businessPhone}?text=${encodeURIComponent("Bonjour, je souhaite recevoir mon code de vérification.")}`,
            businessPhone: `+${genData.businessPhone}`
        });
      } else {
        setWhatsappRedirect(null);
      }

      setVerificationError(null);
      setVerificationCode("");
      setTempLink(null);
      setCooldownSeconds(60);
      setModalStep('verify_code');
    } catch (err: any) {
      console.error("Erreur de vérification:", err);
      if (err.message && (err.message.includes("was not found on the server") || err.message.includes("Failed to find Server Action"))) {
        window.location.reload();
        return;
      }
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleVerifyCodeSubmit = async () => {
    if (!verificationCode || verificationCode.length !== 4) {
      setVerificationError("Le code doit comporter exactement 4 chiffres.");
      return;
    }
    setIsVerifyingCode(true);
    setVerificationError(null);

    try {
      const contactToUse = (contactMethod === 'phone' || contactMethod === 'whatsapp') ? verifiedPhone : email;
      const data = await verifyOtpAndLoginAction(contactToUse, verificationCode.trim(), contactMethod);

      if (data.error) throw new Error(data.error);

      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      }
      
      if (alreadyOwnedMessage) setModalStep('success');
      else setModalStep('payment');
    } catch (err: any) {
      setVerificationError(err.message || "Code de vérification invalide.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handlePurchase = async (method: 'moncash' | 'lemonsqueezy') => {
    setIsLoading(true);
    setError(null);

    try {
      const amountValue = method === 'moncash' ? product.priceHTG : (typeof product.price === 'number' ? product.price : parseFloat(product.price.toString()));
      const currencyValue = method === 'moncash' ? "HTG" : product.currency;
      const finalEmail = (email || currentUser?.email || "").trim().toLowerCase();
      const finalPhone = verifiedPhone || currentUser?.phoneNumber || "";

      const pendingRes = await fetch("/api/checkout/create-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.uid,
          email: finalEmail,
          phone: finalPhone,
          contactMethod: finalPhone ? 'phone' : 'email',
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
        throw new Error(errorData.error || "Échec de l'initialisation de la commande");
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
            customerFirstName: userName || "Client",
            userId: userId,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Échec de l'initialisation du paiement Moncash");
        const redirectUrl = data.redirectUrl || data.redirect_url || data.payment_link;
        if (redirectUrl) window.location.href = redirectUrl;
        else if (data.payment_token?.redirect_url) window.location.href = data.payment_token.redirect_url;
        else throw new Error("Lien de redirection MonCash introuvable");

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
        if (!response.ok) throw new Error(data.error || "Échec de la création de la session de paiement");
        if (data.checkoutUrl) {
          await openCheckout(data.checkoutUrl, orderId, data.sessionExpiresAtMs);
        } else {
          throw new Error("Aucun lien de paiement retourné");
        }
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'initialisation du paiement.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[150] flex items-end lg:items-center justify-center p-0 lg:p-6 transition-colors duration-300 ${
          isClosing ? 'bg-black/0 backdrop-blur-none' : 'bg-black/70 backdrop-blur-sm'
        }`}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div
          className="w-full lg:max-w-lg bg-[#141414] border border-white/10 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-visible text-white"
          style={{
            transform: isClosing
              ? 'translateY(100%)'
              : dragY > 0
              ? `translateY(${dragY}px)`
              : 'translateY(0)',
            opacity: isClosing ? 0 : dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1,
            transition: isDragging.current ? 'none' : 'transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.35s ease',
          }}
        >
          <div
            className="flex justify-center pt-4 pb-2 lg:hidden cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
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
                      <h2 className="text-lg lg:text-xl font-black leading-tight">Accès instantané</h2>
                      <p className="text-xs text-white/40">Aucun mot de passe requis</p>
                    </div>
                  </div>
                  <button onClick={handleClose} className="hidden lg:flex size-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors shrink-0 ml-2">
                    <svg className="size-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex p-1 bg-white/5 rounded-xl mb-5">
                  <button type="button" onClick={() => { setContactMethod('whatsapp'); setError(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] sm:text-xs lg:text-sm font-bold rounded-lg transition-all ${contactMethod === 'whatsapp' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md' : 'text-white/50 hover:text-white'}`}>
                    <svg className="size-3.5 sm:size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg> WhatsApp
                  </button>
                  <button type="button" onClick={() => { setContactMethod('phone'); setError(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] sm:text-xs lg:text-sm font-bold rounded-lg transition-all ${contactMethod === 'phone' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md' : 'text-white/50 hover:text-white'}`}>
                    <span>📱</span> SMS
                  </button>
                  <button type="button" onClick={() => { setContactMethod('email'); setError(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] sm:text-xs lg:text-sm font-bold rounded-lg transition-all ${contactMethod === 'email' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md' : 'text-white/50 hover:text-white'}`}>
                    <span>✉️</span> Email
                  </button>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-xl mb-4 text-center">{error}</div>}

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  {(contactMethod === 'phone' || contactMethod === 'whatsapp') ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Numéro de téléphone</label>
                      <div className="flex gap-2">
                        <div className="relative">
                          <button ref={countryBtnRef} type="button" onClick={() => showCountryDropdown ? setShowCountryDropdown(false) : openCountryDropdown()} className="h-full min-w-[90px] px-3 py-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-1.5 hover:bg-white/10 transition-colors text-sm font-bold whitespace-nowrap">
                            <span className="text-base">{selectedCountry.flag}</span>
                            <span className="text-white/70">{selectedCountry.dial}</span>
                            <svg className={`size-3 text-white/40 transition-transform ${showCountryDropdown ? '-rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {showCountryDropdown && typeof window !== 'undefined' && createPortal(
                            <div ref={countryDropdownRef} className="fixed w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden" style={{ left: dropdownPos.left, ...(dropdownPos.above ? { bottom: window.innerHeight - dropdownPos.top, top: 'auto' } : { top: dropdownPos.top }) }}>
                              <div className="p-2 border-b border-white/5"><input type="text" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} placeholder="Pays ou indicatif (+509, 33...)" autoFocus className="w-full px-3 py-2 bg-white/5 rounded-lg text-xs placeholder:text-white/30 focus:outline-none bg-transparent text-white" /></div>
                              <div className="max-h-56 overflow-y-auto">
                                {COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)).map((country) => (
                                  <button key={country.code} type="button" onClick={() => { setSelectedCountry(country); setShowCountryDropdown(false); setCountrySearch(''); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left ${selectedCountry.code === country.code ? 'bg-orange-500/10 text-orange-400' : 'text-white/80'}`}>
                                    <span className="text-base shrink-0">{country.flag}</span><span className="flex-1 truncate">{country.name}</span><span className="text-white/40 text-xs shrink-0">{country.dial}</span>
                                  </button>
                                ))}
                              </div>
                            </div>, document.body
                          )}
                        </div>
                        <input type="tel" value={formatPhone(phone, selectedCountry.code)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder={selectedCountry.code === 'HT' ? '34 56 7890' : '## ## ## ##'} required autoFocus className="flex-1 px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all text-sm tracking-wide font-medium bg-transparent text-white" />
                      </div>
                      <p className="text-[11px] text-white/30 pl-1">Tu recevras un {contactMethod === 'whatsapp' ? 'message WhatsApp' : 'SMS'} avec ton code d'accès.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Adresse e-mail</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" required autoFocus className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all text-sm bg-transparent text-white" />
                      <p className="text-[11px] text-white/30 pl-1">Tu recevras un code d'accès par email.</p>
                    </div>
                  )}

                  <button type="submit" disabled={isLoading || (contactMethod === 'email' ? !email : !phone)} className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white font-black rounded-xl text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-orange-500/20 flex items-center justify-center">
                    {isLoading ? <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : "Continuer →"}
                  </button>
                </form>
              </>
            )}

            {/* STEP 2: VERIFY CODE */}
            {modalStep === 'verify_code' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <button onClick={() => { setModalStep('contact'); setVerificationCode(''); setVerificationError(null); }} className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-bold transition-colors"><svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg> Retour</button>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Sécurité</p>
                  <button onClick={handleClose} className="hidden lg:flex size-7 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors"><svg className="size-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div className="text-center py-4">
                  {whatsappRedirect ? (
                    <>
                      <div className="size-16 bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-3xl">📱</span></div>
                      <h2 className="text-xl font-black mb-2 leading-tight uppercase">Ouvre WhatsApp !</h2>
                      <div className="text-xs text-white/60 mb-6 leading-relaxed max-w-sm mx-auto">
                        Clique sur le bouton ci-dessous pour nous envoyer le message pré-rempli. <strong className="text-white">Le robot te répondra avec ton code !</strong>
                      </div>
                      
                      <a href={whatsappRedirect.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-4 mb-4 bg-[#25D366] text-white font-black rounded-xl text-sm transition-all hover:bg-[#1ebd5a] shadow-lg shadow-[#25D366]/20">
                        <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        Ouvrir WhatsApp
                      </a>

                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-2 text-left">
                        <p className="text-xs text-white/50 leading-relaxed">
                          <strong className="text-white">Autre appareil ?</strong> Si tu n'as pas WhatsApp sur cet écran, envoie le mot <strong className="text-[#25D366]">CODE</strong> sur notre numéro <strong className="text-white">WhatsApp</strong> ci-dessous depuis ton téléphone :
                        </p>
                        <div className="mt-2 flex items-center justify-between bg-black/20 rounded-lg p-3 border border-white/5">
                          <p className="text-xl font-black text-white tracking-widest font-mono">
                            {whatsappRedirect.businessPhone.length === 12 && whatsappRedirect.businessPhone.startsWith('+1')
                              ? whatsappRedirect.businessPhone.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')
                              : whatsappRedirect.businessPhone}
                          </p>
                          <button 
                            onClick={(e) => {
                              navigator.clipboard.writeText(whatsappRedirect.businessPhone);
                              const target = e.currentTarget;
                              const originalHtml = target.innerHTML;
                              target.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Copié';
                              target.classList.add('text-green-400', 'bg-green-400/10', 'border-green-400/20');
                              target.classList.remove('text-white/50', 'hover:text-white', 'bg-white/5', 'hover:bg-white/10', 'border-transparent');
                              setTimeout(() => {
                                target.innerHTML = originalHtml;
                                target.classList.remove('text-green-400', 'bg-green-400/10', 'border-green-400/20');
                                target.classList.add('text-white/50', 'hover:text-white', 'bg-white/5', 'hover:bg-white/10', 'border-transparent');
                              }, 2000);
                            }}
                            className="h-8 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-transparent flex items-center justify-center gap-1.5 transition-all text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider"
                            title="Copier le numéro"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span> Copier
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-center w-full mt-4 border-t border-white/10 pt-6">
                        <p className="text-xs text-white/50 mb-3 font-bold uppercase tracking-wider">Étape 2</p>
                        <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-sm mx-auto">Une fois le code reçu sur WhatsApp, tapez-le ici :</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="size-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20"><span className="text-3xl">🔑</span></div>
                      <h2 className="text-xl font-black mb-2 leading-tight uppercase">Code de vérification</h2>
                      <div className="text-xs text-white/60 mb-6 leading-relaxed max-w-sm mx-auto">
                        Nous t'avons envoyé un code à 4 chiffres. Renseigne-le ci-dessous pour confirmer ton identité :
                      </div>
                    </>
                  )}
                  <div className="mb-6 text-left">
                    <input type="text" maxLength={4} placeholder="2102" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 4))} className="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-center text-xl font-mono placeholder-white/20 tracking-[0.5em] focus:outline-none focus:border-white transition-colors bg-transparent text-white" />
                    {verificationError && <p className="text-[11px] text-red-500 mt-2 font-semibold">⚠️ {verificationError}</p>}
                  </div>
                  <button onClick={handleVerifyCodeSubmit} disabled={isVerifyingCode || verificationCode.length !== 4} className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isVerifyingCode ? <div className="size-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"/> : "Valider le code"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT */}
            {modalStep === 'payment' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  {!currentUser && <button onClick={() => { setModalStep('contact'); setError(null); }} className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-bold transition-colors"><svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg> Retour</button>}
                  {currentUser && <div />}
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Paiement</p>
                  <button onClick={handleClose} className="hidden lg:flex size-7 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors"><svg className="size-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>

                <div className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                  <span className="text-xs text-white/50">Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black">{product.currency}{product.price}</span>
                  </div>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-xl mb-4 text-center">{error}</div>}

                <p className="text-xs text-white/40 text-center mb-4 font-semibold uppercase tracking-widest">Comment veux-tu payer ?</p>

                <div className="space-y-3">
                  {(selectedCountry.code === 'HT' || product.priceHTG > 0) && (
                    <button onClick={() => handlePurchase('moncash')} disabled={isLoading || product.priceHTG <= 0} className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#e30713]/20 to-[#e30713]/5 border-2 border-[#e30713]/50 hover:border-[#e30713] rounded-2xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale group">
                      <img src="/images/moncash-logo.png" alt="MonCash" className="size-12 object-contain rounded-xl shadow-lg shrink-0" />
                      <div className="text-left flex-1">
                        <p className="font-black text-sm">MonCash ({product.priceHTG} HTG)</p>
                        <p className="text-xs text-white/50">Paiement mobile haïtien</p>
                      </div>
                    </button>
                  )}

                  <button onClick={() => handlePurchase('lemonsqueezy')} disabled={isLoading} className="w-full flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/[0.06] rounded-2xl transition-all active:scale-95 disabled:opacity-50 group">
                    <div className="size-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0"><span className="text-xl">💳</span></div>
                    <div className="text-left flex-1">
                      <p className="font-black text-sm">Carte bancaire · PayPal</p>
                      <p className="text-xs text-white/50">Visa, Mastercard, Amex</p>
                    </div>
                  </button>
                </div>

                {isLoading && <div className="flex items-center justify-center gap-2 mt-4 text-white/40 text-xs"><div className="size-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"/> Traitement...</div>}
              </div>
            )}

            {/* STEP 4: SUCCESS */}
            {modalStep === 'success' && (
              <div className="text-center py-6">
                {alreadyOwnedMessage ? (
                  <>
                    <div className="size-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30"><span className="text-3xl">🎉</span></div>
                    <h2 className="text-xl font-black mb-2 leading-tight uppercase">Tu possèdes déjà ce produit !</h2>
                    <p className="text-sm text-white/60 mb-6">{alreadyOwnedMessage}</p>
                    <button onClick={() => window.location.href = tempLink || "/dashboard"} className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"><span className="material-symbols-outlined text-lg">login</span> Accéder</button>
                  </>
                ) : (
                  <>
                    <div className="size-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-3xl">{(contactMethod === 'phone' || contactMethod === 'whatsapp') ? '📱' : '📬'}</span></div>
                    <h2 className="text-xl font-black mb-2">{(contactMethod === 'phone' || contactMethod === 'whatsapp') ? 'Vérifie tes messages !' : 'Vérifie tes e-mails !'}</h2>
                    <p className="text-sm text-white/50 mb-6 text-center">{(contactMethod === 'phone' || contactMethod === 'whatsapp') ? <><span className="text-white font-bold">{selectedCountry.dial} {phone}</span> — ton lien arrive sous peu.</> : <>Lien envoyé à <span className="text-white font-bold">{email}</span>.</>}</p>
                    <button onClick={() => { setModalStep('contact'); setEmail(''); setPhone(''); }} className="text-xs text-orange-400 underline hover:text-orange-300 transition-colors">Utiliser une autre méthode</button>
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
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Session expirée</h3>
            <p className="text-sm text-white/60 mb-8 leading-relaxed">Le temps alloué pour votre paiement est écoulé. Veuillez rafraîchir la page pour générer une nouvelle session sécurisée.</p>
            <button onClick={() => window.location.reload()} className="w-full h-14 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black uppercase tracking-wider text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">Recharger la page</button>
          </div>
        </div>
      )}
    </>
  );
}
