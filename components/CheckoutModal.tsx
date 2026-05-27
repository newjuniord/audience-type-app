"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { signInWithCustomToken, signInWithEmailAndPassword } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useLemonSqueezyOverlay } from "@/hooks/useLemonSqueezyOverlay";
import { useAuth } from "@/context/AuthContext";
import {
  checkUserAction,
  generateOtpAction,
  verifyOtpAndLoginAction,
  generateMagicLinkAction
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
  const priceHTG = typeof product.priceHTG === 'number'
    ? product.priceHTG
    : (product.priceHTG ? parseFloat(String(product.priceHTG)) : 0);

  const [isClosing, setIsClosing] = useState(false);
  const [animate, setAnimate] = useState(false); // Controls opening animation
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(() => detectCountry());
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, above: false });
  const [countrySearch, setCountrySearch] = useState('');
  const countryBtnRef = useRef<HTMLButtonElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [contactMethod, setContactMethod] = useState<'email' | 'phone' | 'whatsapp'>('whatsapp');
  const [modalStep, setModalStep] = useState<'contact' | 'name' | 'payment' | 'verify_code' | 'success'>('contact');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [whatsappRedirect, setWhatsappRedirect] = useState<{ url: string; businessPhone: string } | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [alreadyOwnedMessage, setAlreadyOwnedMessage] = useState<string | null>(null);
  const [tempLink, setTempLink] = useState<string | null>(null);
  const [magicLinkToken, setMagicLinkToken] = useState<string | null>(null);

  const { openCheckout, hasExpiredSession } = useLemonSqueezyOverlay();

  // Handle modal mount & routing logic
  useEffect(() => {
    if (isOpen) {
      // Auto-skip contact step if logged in
      if (currentUser) {
        setModalStep('payment');
      } else {
        setModalStep('contact');
      }

      setIsClosing(false);
      setDragY(0);
      // Small timeout to allow element to mount, triggering the slide up
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
      setPassword('');
      setUsePassword(false);
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
            ? `Nimewo pou Ayiti a dwe gen 8 chif ladan l (egz: 34567890). Ou antre ${cleanNumber.length} chif.`
            : `Nimewo pou ${selectedCountry.name} la dwe gen presizeman ${expectedLength} chif ladan l. Ou antre ${cleanNumber.length} chif.`
        );
        return;
      }
      cleanPhone = `${selectedCountry.dial}${cleanNumber}`;
      setVerifiedPhone(cleanPhone);
    }

    setIsLoading(true);
    setError(null);
    try {
      if (contactMethod === 'email') {
        if (!password) {
          throw new Error("Tanpri antre modpas ou.");
        }
        const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        const user = result.user;

        const checkData = await checkUserAction("", email.trim().toLowerCase(), product.id);
        if (checkData.error) throw new Error(checkData.error);

        if (checkData.exists && checkData.ownsCourse) {
          setAlreadyOwnedMessage(
            "Ou gen pwodui sa a deja ! 🎉 Klike sou bouton anba a pou w ka antre dirèkteman."
          );
          setModalStep('success');
        } else {
          setAlreadyOwnedMessage(null);
          setModalStep('payment');
        }
        return;
      }

      const targetProductId = product.id;
      const checkData = await checkUserAction(
        (contactMethod === 'phone' || contactMethod === 'whatsapp') ? cleanPhone : "", 
        contactMethod === 'email' ? email : "", 
        targetProductId
      );

      if (checkData.error) throw new Error(checkData.error);

      if (checkData.exists && checkData.ownsCourse) {
        setAlreadyOwnedMessage(
          "Ou gen pwodui sa a deja ! 🎉 Antre kòd ou resevwa a pou w ka antre dirèkteman."
        );
      } else {
        setAlreadyOwnedMessage(null);
      }

      if (!checkData.exists && modalStep === 'contact') {
        setModalStep('name');
        setIsLoading(false);
        return;
      }

      const contactToUse = (contactMethod === 'phone' || contactMethod === 'whatsapp') ? cleanPhone : email;
      
      const genData = await generateOtpAction(contactToUse, contactMethod);
      if (genData.error) throw new Error(genData.error);

      setVerificationError(null);
      setVerificationCode("");
      setTempLink(null);
      setCooldownSeconds(contactMethod === 'email' ? 60 : 299);
      setModalStep('verify_code');
    } catch (err: any) {
      console.error("Erreur de vérification/connexion:", err);
      if (err.message && (err.message.includes("was not found on the server") || err.message.includes("Failed to find Server Action"))) {
        window.location.reload();
        return;
      }
      let friendlyError = err.message || "Gen yon erè ki fèt. Tanpri reyezi ankò.";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        friendlyError = "Imel oswa modpas la pa bon.";
      }
      setError(friendlyError);
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

  // Écoute du Magic Link en temps réel
  useEffect(() => {
    if (!magicLinkToken) return;

    let timeoutId: NodeJS.Timeout;

    const unsubscribe = onSnapshot(doc(db, "magic_links", magicLinkToken), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === "used" && data.customToken) {
          try {
            await signInWithCustomToken(auth, data.customToken);
            // Utilisateur connecté ! On passe à l'étape de paiement ou succès
            if (alreadyOwnedMessage) setModalStep('success');
            else setModalStep('payment');
            setMagicLinkToken(null);
          } catch (err) {
            console.error("Erreur de connexion via magic link", err);
            setVerificationError("Koneksyon otomatik la echwe.");
          }
        } else if (data.status === "expired") {
          setVerificationError("Lyen an ekspire. Tanpri rekòmanse.");
          setMagicLinkToken(null);
        }
      }
    });

    // Timeout local de 10 minutes (600000 ms)
    timeoutId = setTimeout(() => {
      unsubscribe();
      setVerificationError("Tan datant lan depase (10 minit).");
      setMagicLinkToken(null);
    }, 10 * 60 * 1000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [magicLinkToken, alreadyOwnedMessage]);

  const handleVerifyCodeSubmit = async () => {
    const isValidLength = contactMethod === 'phone'
      ? (verificationCode.length >= 4 && verificationCode.length <= 6)
      : (verificationCode.length === 4);
    if (!verificationCode || !isValidLength) {
      setVerificationError(contactMethod === 'phone' ? "Kòd la dwe gen ant 4 ak 6 chif." : "Kòd la dwe gen 4 chif presizeman.");
      return;
    }
    setIsVerifyingCode(true);
    setVerificationError(null);

    try {
      const contactToUse = (contactMethod === 'phone' || contactMethod === 'whatsapp') ? verifiedPhone : email;
      const data = await verifyOtpAndLoginAction(contactToUse, verificationCode.trim(), contactMethod, fullName);

      if (data.error) throw new Error(data.error);

      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      }
      
      if (alreadyOwnedMessage) setModalStep('success');
      else setModalStep('payment');
    } catch (err: any) {
      setVerificationError(err.message || "Kòd verifikasyon sa a pa bon.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handlePurchase = async (method: 'moncash' | 'lemonsqueezy') => {
    setIsLoading(true);
    setError(null);

    try {
      const amountValue = method === 'moncash' ? priceHTG : (typeof product.price === 'number' ? product.price : parseFloat(product.price.toString()));
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
                      <p className="text-xs text-white/40">Ou pa bezwen modpas</p>
                    </div>
                  </div>
                  <button onClick={handleClose} className="hidden lg:flex size-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors shrink-0 ml-2">
                    <svg className="size-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex p-1 bg-white/5 rounded-xl mb-5">
                  <button type="button" onClick={() => { setContactMethod('whatsapp'); setError(null); setPassword(''); setUsePassword(false); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] sm:text-xs lg:text-sm font-bold rounded-lg transition-all ${contactMethod === 'whatsapp' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md' : 'text-white/50 hover:text-white'}`}>
                    <svg className="size-3.5 sm:size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg> WhatsApp
                  </button>
                  {/* <button type="button" onClick={() => { setContactMethod('phone'); setError(null); setPassword(''); setUsePassword(false); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] sm:text-xs lg:text-sm font-bold rounded-lg transition-all ${contactMethod === 'phone' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md' : 'text-white/50 hover:text-white'}`}>
                    <span>📱</span> SMS
                  </button> */}
                  <button type="button" onClick={() => { setContactMethod('email'); setError(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] sm:text-xs lg:text-sm font-bold rounded-lg transition-all ${contactMethod === 'email' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md' : 'text-white/50 hover:text-white'}`}>
                    <span>✉️</span> Email
                  </button>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-xl mb-4 text-center">{error}</div>}

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  {(contactMethod === 'phone' || contactMethod === 'whatsapp') ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Nimewo telefòn</label>
                      <div className="flex gap-2">
                        <div className="relative">
                          <button ref={countryBtnRef} type="button" onClick={() => showCountryDropdown ? setShowCountryDropdown(false) : openCountryDropdown()} className="h-full min-w-[90px] px-3 py-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-1.5 hover:bg-white/10 transition-colors text-sm font-bold whitespace-nowrap">
                            <span className="text-base">{selectedCountry.flag}</span>
                            <span className="text-white/70">{selectedCountry.dial}</span>
                            <svg className={`size-3 text-white/40 transition-transform ${showCountryDropdown ? '-rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {showCountryDropdown && typeof window !== 'undefined' && createPortal(
                            <div ref={countryDropdownRef} className="fixed w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden" style={{ left: dropdownPos.left, ...(dropdownPos.above ? { bottom: window.innerHeight - dropdownPos.top, top: 'auto' } : { top: dropdownPos.top }) }}>
                              <div className="p-2 border-b border-white/5"><input type="text" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} placeholder="Peyi oswa kòd (+509, 33...)" autoFocus className="w-full px-3 py-2 bg-white/5 rounded-lg text-xs placeholder:text-white/30 focus:outline-none bg-transparent text-white" /></div>
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
                      <p className="text-[11px] text-white/30 pl-1">W ap resevwa yon {contactMethod === 'whatsapp' ? 'mesaj WhatsApp' : 'SMS'} avèk kòd aksè ou la.</p>
                    </div>
                  ) : (
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
                  )}

                  <button type="submit" disabled={isLoading || (contactMethod === 'email' ? (!email || password.length < 6) : !phone)} className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white font-black rounded-xl text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-orange-500/20 flex items-center justify-center">
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
                          Nou pa jwenn kont pou nimewo sa a. Tanpri antre non w pou nou ka kreye kont ou a.
                      </p>
                  </div>

                  <form onSubmit={(e) => {
                      e.preventDefault();
                      handleContactSubmit(e as any);
                  }} className="flex flex-col gap-4">
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

            {/* STEP 2: VERIFY CODE */}
            {modalStep === 'verify_code' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <button onClick={() => { setModalStep('contact'); setVerificationCode(''); setVerificationError(null); }} className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-bold transition-colors"><svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg> Retounen</button>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Sekirite</p>
                  <button onClick={handleClose} className="hidden lg:flex size-7 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors"><svg className="size-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <div className="text-center py-4">
                    <>
                      <div className="size-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20"><span className="text-3xl">🔑</span></div>
                      <h2 className="text-xl font-black mb-2 leading-tight uppercase">Kòd verifikasyon</h2>
                       <div className="text-xs text-white/60 mb-6 leading-relaxed max-w-sm mx-auto">
                        {contactMethod === 'email'
                          ? "Nou voye yon kòd 4 chif nan imel ou. Antre li anba a pou nou ka konfime se ou menm :"
                          : "Nou voye yon kòd ba ou. Antre li anba a pou nou ka konfime se ou menm :"
                        }
                      </div>
                      {contactMethod === 'email' && (
                        <div className="p-3 mb-6 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400/80 text-xs font-semibold max-w-sm mx-auto text-center leading-relaxed">
                          ⚠️ Si ou pa resevwa kòd la, tanpri verifye dosye <strong>Spam</strong> ou an.
                        </div>
                      )}
                    </>

                  {/* Input Code */}
                    <>
                      <div className="mb-6 text-left">
                    <input 
                      type="text" 
                      maxLength={contactMethod === 'phone' ? 6 : 4} 
                      placeholder={contactMethod === 'phone' ? "000000" : "0000"} 
                      value={verificationCode} 
                      onChange={(e) => {
                        const maxL = contactMethod === 'phone' ? 6 : 4;
                        setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, maxL));
                      }} 
                      className="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-center text-xl font-mono placeholder-white/20 tracking-[0.5em] focus:outline-none focus:border-white transition-colors bg-transparent text-white" 
                    />
                    {verificationError && <p className="text-[11px] text-red-500 mt-2 font-semibold">⚠️ {verificationError}</p>}
                  </div>
                      <button 
                        onClick={handleVerifyCodeSubmit} 
                        disabled={isVerifyingCode || (contactMethod === 'phone' ? (verificationCode.length < 4 || verificationCode.length > 6) : verificationCode.length !== 4)} 
                        className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isVerifyingCode ? <div className="size-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"/> : "Valide kòd la"}
                      </button>
                    </>
                </div>
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
                    <div className="size-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-3xl">{(contactMethod === 'phone' || contactMethod === 'whatsapp') ? '📱' : '📬'}</span></div>
                    <h2 className="text-xl font-black mb-2">{(contactMethod === 'phone' || contactMethod === 'whatsapp') ? 'Verifye mesaj ou yo !' : 'Verifye e-mail ou yo !'}</h2>
                    <p className="text-sm text-white/50 mb-6 text-center">{(contactMethod === 'phone' || contactMethod === 'whatsapp') ? <><span className="text-white font-bold">{selectedCountry.dial} {phone}</span> — lyen ou an ap rive talè konsa.</> : <>Lyen an voye nan <span className="text-white font-bold">{email}</span>.</>}</p>
                    <button onClick={() => { setModalStep('contact'); setEmail(''); setPhone(''); }} className="text-xs text-orange-400 underline hover:text-orange-300 transition-colors">Itilize yon lòt fason</button>
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
