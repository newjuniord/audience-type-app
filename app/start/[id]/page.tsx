"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { sendSignInLinkToEmail, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useBotBlocker } from "@/hooks/useBotBlocker";
import BotBlockerPopup from "@/components/BotBlockerPopup";
import VideoPlayer from "@/components/VideoPlayer";

import { doc, getDoc, collection, query, where, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { createOrder } from "@/lib/orders";
import { getEnrollmentsByUser } from "@/lib/enrollments";
import { useParams, useRouter } from "next/navigation";
import { FunnelData } from "@/lib/types";

// Données par défaut affichées pendant le chargement (Squelette/Fallback)
const DEFAULT_COURSE_DATA: FunnelData = {
  id: "default",
  badge: "Chargement...",
  headline: "Chargement de l'offre...",
  subheadline: "Veuillez patienter quelques instants.",
  videoUrl: "",
  videoPoster: "",
  originalPrice: 0,
  currentPrice: 0,
  priceGourdes: 0,
  lemonSqueezyId: "",
  currency: "$",
  ctaText: "Continuer",
  ctaSubtext: "Paiement sécurisé",
  benefits: [],
  testimonials: [],
  spotsLeft: 0,
  expirationDate: null,
  urgencyText: "⚠️ Expire dans :",
  isActive: true
};

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
}

function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-white font-black">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── COUNTRIES LIST ──────────────────────────────────────────────────────────
const COUNTRIES = [
  // Caraïbes & Haïti en tête
  { code: 'HT', name: 'Haïti',              dial: '+509', flag: '🇭🇹' },
  { code: 'DO', name: 'Rép. Dominicaine',    dial: '+1',   flag: '🇩🇴' },
  { code: 'CU', name: 'Cuba',               dial: '+53',  flag: '🇨🇺' },
  { code: 'JM', name: 'Jamaïque',           dial: '+1',   flag: '🇯🇲' },
  { code: 'PR', name: 'Porto Rico',          dial: '+1',   flag: '🇵🇷' },
  { code: 'TT', name: 'Trinidad & Tobago',   dial: '+1',   flag: '🇹🇹' },
  { code: 'BB', name: 'Barbade',             dial: '+1',   flag: '🇧🇧' },
  // Amérique du Nord
  { code: 'US', name: 'États-Unis',          dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',              dial: '+1',   flag: '🇨🇦' },
  { code: 'MX', name: 'Mexique',             dial: '+52',  flag: '🇲🇽' },
  // Amérique Centrale
  { code: 'GT', name: 'Guatemala',           dial: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras',            dial: '+504', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador',         dial: '+503', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua',           dial: '+505', flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica',          dial: '+506', flag: '🇨🇷' },
  { code: 'PA', name: 'Panama',              dial: '+507', flag: '🇵🇦' },
  // Amérique du Sud
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
  // Europe francophone
  { code: 'FR', name: 'France',              dial: '+33',  flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique',            dial: '+32',  flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse',              dial: '+41',  flag: '🇨🇭' },
  { code: 'GP', name: 'Guadeloupe',          dial: '+590', flag: '🇬🇵' },
  { code: 'MQ', name: 'Martinique',          dial: '+596', flag: '🇲🇶' },
  { code: 'GF', name: 'Guyane',             dial: '+594', flag: '🇬🇫' },
  { code: 'RE', name: 'La Réunion',         dial: '+262', flag: '🇷🇪' },
  // Europe
  { code: 'GB', name: 'Royaume-Uni',         dial: '+44',  flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne',           dial: '+49',  flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne',             dial: '+34',  flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal',            dial: '+351', flag: '🇵🇹' },
  { code: 'IT', name: 'Italie',              dial: '+39',  flag: '🇮🇹' },
  { code: 'NL', name: 'Pays-Bas',           dial: '+31',  flag: '🇳🇱' },
  // Asie
  { code: 'CN', name: 'Chine',              dial: '+86',  flag: '🇨🇳' },
  { code: 'KR', name: 'Corée du Sud',        dial: '+82',  flag: '🇰🇷' },
  { code: 'JP', name: 'Japon',              dial: '+81',  flag: '🇯🇵' },
];

// ─── TIMEZONE → COUNTRY CODE MAP ─────────────────────────────────────────────
const TIMEZONE_MAP: Record<string, string> = {
  'America/Port-au-Prince': 'HT',
  'America/Santo_Domingo':  'DO',
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

// Formate les chiffres selon le pays pour l'affichage dans l'input
function formatPhone(digits: string, countryCode: string): string {
  if (!digits) return '';
  // Haïti : ## ## #### (8 chiffres)
  if (countryCode === 'HT') {
    const d = digits;
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
    return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  }
  // Pays +1 (US, CA, DO, JM...) : ### ### ####
  const plusOne = ['US','CA','DO','JM','PR','TT','BB'];
  if (plusOne.includes(countryCode)) {
    const d = digits;
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  // Générique : ### ### ###
  const d = digits;
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}

// ─── CONFETTI CONFIG ────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "#f59e0b", "#f97316", "#ef4444", "#22c55e",
  "#3b82f6", "#a855f7", "#ec4899", "#fff",
];
const CONFETTI_EMOJIS = ["💰", "🎯", "⚡", "🔥", "🎁", "✨", "💎", "🚀"];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  emoji?: string;
  size: number;
  angle: number;
  speed: number;
  spin: number;
  opacity: number;
  type: "rect" | "circle" | "emoji";
}

export default function StartPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.id as string;

  const [courseData, setCourseData] = useState<FunnelData>(DEFAULT_COURSE_DATA);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [expired, setExpired] = useState(false);

  // 1. Charger les données du Funnel
  useEffect(() => {
    const fetchFunnel = async () => {
      if (!funnelId) return;
      try {
        const docRef = doc(db, "funnels", funnelId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as FunnelData;
          if (!data.isActive) {
            setExpired(true); // Ou rediriger vers une page 404/indisponible
          }
          setCourseData(data);
          setDataLoaded(true);
        } else {
          console.error("Funnel introuvable");
          router.push("/"); // Redirige si la page n'existe pas
        }
      } catch (error) {
        console.error("Erreur chargement funnel:", error);
      }
    };
    fetchFunnel();
  }, [funnelId, router]);

  // 1.5. Charger les avis réels du produit lié si disponible (avec repli sur les témoignages manuels)
  useEffect(() => {
    const fetchReviews = async () => {
      if (!dataLoaded || !courseData) return;

      let fetchedReviews: any[] = [];
      try {
        let productRef: any = null;
        if (courseData.linkedProductId) {
          if (typeof courseData.linkedProductId === 'string') {
            const collectionName = courseData.linkedProductType === 'ebook' ? 'ebooks' : 'courses';
            productRef = doc(db, collectionName, courseData.linkedProductId);
          } else {
            productRef = courseData.linkedProductId;
          }
        }

        if (productRef) {
          const q = query(
            collection(db, "reviews"),
            where("productId", "==", productRef),
            where("isVisible", "==", true)
          );
          const snapshot = await getDocs(q);
          const reviewsList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              name: data.userName || "Utilisateur anonyme",
              role: courseData.linkedProductType === 'ebook' ? "Lecteur Vérifié" : "Client Vérifié",
              text: data.comment || "",
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.userName || 'User')}&background=random`,
              stars: data.rating || 5,
              createdAt: data.createdAt
            };
          });

          // Trier les avis réels par note (desc) puis par date (desc)
          reviewsList.sort((a, b) => {
            if (b.stars !== a.stars) {
              return b.stars - a.stars;
            }
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
          });

          fetchedReviews = reviewsList;
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des avis réels :", error);
      }

      if (fetchedReviews.length > 0) {
        setTestimonials(fetchedReviews);
      } else {
        setTestimonials(courseData.testimonials || []);
      }
    };

    fetchReviews();
  }, [dataLoaded, courseData]);

  const [secondsLeft, setSecondsLeft] = useState(17 * 60); // Valeur par défaut
  
  // 2. Calcul du temps restant basé sur la date d'expiration absolue
  useEffect(() => {
    if (!dataLoaded) return;
    
    if (courseData.expirationDate) {
      // Date absolue depuis Firestore
      const expiryDate = typeof courseData.expirationDate === 'string' 
        ? new Date(courseData.expirationDate).getTime() 
        : (courseData.expirationDate as any).toDate().getTime();
      
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.floor((expiryDate - now) / 1000);
        
        if (diff <= 0) {
          setSecondsLeft(0);
          setExpired(true);
          clearInterval(interval);
        } else {
          setSecondsLeft(diff);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // S'il n'y a pas de date d'expiration absolue, on utilise le timer local standard (ex: 15 minutes fake urgency)
      setSecondsLeft(15 * 60);
      const timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [dataLoaded, courseData.expirationDate]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [alreadyOwnedMessage, setAlreadyOwnedMessage] = useState<string | null>(null);
  const [tempLink, setTempLink] = useState<string | null>(null);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Écouter l'état d'authentification de l'utilisateur
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Vérifier si l'utilisateur connecté possède déjà le cours
  useEffect(() => {
    if (!currentUser || !dataLoaded || !courseData) {
      setAlreadyOwned(false);
      return;
    }

    const checkOwnership = async () => {
      try {
        let targetProductId = "";
        if (courseData.linkedProductId) {
          targetProductId = typeof courseData.linkedProductId === 'string'
            ? courseData.linkedProductId
            : courseData.linkedProductId.id;
        } else {
          targetProductId = courseData.id || "default";
        }

        const enrollments = await getEnrollmentsByUser(currentUser.uid);
        const hasAccess = enrollments.some(e => {
          const eProductId = typeof e.productId === 'string' ? e.productId : e.productId?.id;
          return eProductId === targetProductId;
        });

        setAlreadyOwned(hasAccess);
      } catch (err) {
        console.error("Error checking ownership:", err);
      }
    };

    checkOwnership();
  }, [currentUser, dataLoaded, courseData]);

  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(() => detectCountry());
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, above: false });
  const [countrySearch, setCountrySearch] = useState('');
  const countryBtnRef = useRef<HTMLButtonElement>(null);
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('phone');
  const [modalStep, setModalStep] = useState<'contact' | 'payment' | 'success' | 'verify_code'>('contact');
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);


  // Hook anti-bot
  const { isBlocked, timeLeft, showPopup, handleBotDetected, closePopup } = useBotBlocker();

  // Ouvrir le dropdown en calculant la position fixed
  const openCountryDropdown = () => {
    if (!countryBtnRef.current) return;
    const rect = countryBtnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 260; // ouvre en haut si pas assez de place en bas
    setDropdownPos({
      top: above ? rect.top - 8 : rect.bottom + 4,
      left: rect.left,
      above,
    });
    setShowCountryDropdown(true);
    setCountrySearch('');
  };
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [glowing, setGlowing] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);
  const animFrameRef = useRef<number | undefined>(undefined);

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

  // ── Auto-burst confetti on mount after 1s
  useEffect(() => {
    const t = setTimeout(() => burstConfetti(), 1200);
    return () => clearTimeout(t);
  }, []);

  // ── Animate particles every frame
  useEffect(() => {
    const animate = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y + p.speed,
            x: p.x + Math.sin((p.y / 60) * p.spin) * 1.2,
            opacity: Math.max(0, p.opacity - 0.012),
          }))
          .filter((p) => p.opacity > 0)
      );
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const burstConfetti = useCallback(() => {
    if (!ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const newParticles: Particle[] = Array.from({ length: 48 }, (_, i) => {
      const angle = (i / 48) * 360;
      const speed = 2 + Math.random() * 5;
      const type = i % 5 === 0 ? "emoji" : i % 3 === 0 ? "circle" : "rect";
      return {
        id: particleIdRef.current++,
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 30,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        emoji: type === "emoji" ? CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length] : undefined,
        size: type === "emoji" ? 16 + Math.random() * 10 : 6 + Math.random() * 6,
        angle,
        speed: speed,
        spin: (Math.random() - 0.5) * 4,
        opacity: 1,
        type,
      };
    });
    setParticles((prev) => [...prev, ...newParticles]);
    setGlowing(true);
    setTimeout(() => setGlowing(false), 600);
  }, []);

  // Sticky CTA visibility on scroll
  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const time = formatTime(secondsLeft);

  const handleAccessClick = () => {
    setIsClosing(false);
    setDragY(0);
    setModalStep('contact');
    setShowModal(true);
    setError(null);
    setEmailSent(false);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setDragY(0);
    }, 350);
  };

  // Swipe-to-dismiss handlers
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
    if (dragY > 80) {
      closeModal();
    } else {
      setDragY(0);
    }
  };

  // Step 1 : valider le contact et passer au paiement
  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Vérification du Honeypot anti-bot
    const formData = new FormData(e.currentTarget);
    const honeypotValue = formData.get('username_verification');

    if (honeypotValue && honeypotValue.toString().length > 0) {
      handleBotDetected();
      return; // Bloque silencieusement la suite
    }

    if (contactMethod === 'email' && !email) return;
    
    let cleanPhone = "";
    if (contactMethod === 'phone') {
      if (!phone) return;
      setError(null);

      // Extraction uniquement des chiffres pour analyse de longueur
      let cleanNumber = phone.replace(/\D/g, "");
      
      // Si l'utilisateur a saisi l'indicatif dans l'input (ex: +509 ou 509), on le retire pour la validation de longueur
      const dialDigits = selectedCountry.dial.replace(/\D/g, "");
      if (cleanNumber.startsWith(dialDigits)) {
        cleanNumber = cleanNumber.substring(dialDigits.length);
      }

      // Si l'utilisateur commence par un 0 (ex: France 06...), on l'enlève pour le format international
      if (cleanNumber.startsWith("0")) {
        cleanNumber = cleanNumber.substring(1);
      }

      // Validation de la longueur attendue selon le pays
      const getExpectedDigitsLength = (code: string): number => {
        switch (code) {
          case 'HT': return 8; // Haïti: 8 chiffres (ex: 34567890)
          case 'FR':
          case 'BE':
          case 'CH':
          case 'GP':
          case 'MQ':
          case 'GF':
          case 'RE':
            return 9; // France, Belgique, Suisse, DOM: 9 chiffres (sans le 0 initial)
          case 'US':
          case 'CA':
          case 'DO':
          case 'PR':
          case 'JM':
          case 'TT':
          case 'BB':
          case 'MX':
          case 'CO':
            return 10; // USA, Canada, Rép. Dom, Mexique, Colombie: 10 chiffres
          default:
            return 8; // Défaut: minimum 8 chiffres
        }
      };

      const expectedLength = getExpectedDigitsLength(selectedCountry.code);
      if (cleanNumber.length !== expectedLength) {
        setError(
          selectedCountry.code === 'HT'
            ? `Le numéro pour Haïti doit comporter exactement 8 chiffres (ex: 34567890). Tu as saisi ${cleanNumber.length} chiffre(s).`
            : `Le numéro pour ${selectedCountry.name} doit comporter exactement ${expectedLength} chiffres. Tu as saisi ${cleanNumber.length} chiffre(s).`
        );
        return; // Empêche le clic et prévient
      }

      // Construction du numéro final propre au format Twilio/WhatsApp (+50934567890)
      cleanPhone = `${selectedCountry.dial}${cleanNumber}`;
      setVerifiedPhone(cleanPhone);
    }

    // ─── VÉRIFICATION DE PROPRIÉTÉ POUR COMPTE EXISTANT (SECURE SERVER-SIDE) ───
    setIsLoading(true);
    setError(null);
    try {
      let targetProductId = "";
      if (courseData.linkedProductId) {
        targetProductId = typeof courseData.linkedProductId === 'string'
          ? courseData.linkedProductId
          : courseData.linkedProductId.id;
      } else {
        targetProductId = courseData.id || "default";
      }

      const checkRes = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contactMethod === 'email' ? email : "",
          whatsappNumber: contactMethod === 'phone' ? cleanPhone : "",
          targetProductId
        })
      });

      if (!checkRes.ok) {
        throw new Error("Erreur de communication avec le serveur");
      }

      const checkData = await checkRes.json();

      if (checkData.exists && checkData.ownsCourse) {
        // L'utilisateur existe et possède déjà le cours !
        setTempUserId(checkData.userId);

        try {
          const res = await fetch("/api/auth/temp-link/anonymous-generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: checkData.userId,
              contactMethod: contactMethod,
              whatsappNumber: contactMethod === 'phone' ? cleanPhone : "",
              email: contactMethod === 'email' ? email : ""
            })
          });
          if (res.ok) {
            setVerificationError(null);
            setVerificationCode("");
            setTempLink(null); // Pour la sécurité, on ne connaît pas le lien avant d'avoir validé le code !
          }
        } catch (genErr) {
          console.error("Erreur lors de la génération du code de vérification:", genErr);
        }

        if (contactMethod === 'email') {
          const actionCodeSettings = { url: `${window.location.origin}/dashboard`, handleCodeInApp: true };
          await sendSignInLinkToEmail(auth, email.trim().toLowerCase(), actionCodeSettings);
          localStorage.setItem('emailForSignIn', email.trim().toLowerCase());
          setAlreadyOwnedMessage(
            "Tu possèdes déjà ce cours ! 🎉 Nous venons de t'envoyer un e-mail de connexion sécurisé, ainsi qu'un code à 6 chiffres. Saisis-le ci-dessous pour confirmer ton identité."
          );
        } else {
          setAlreadyOwnedMessage(
            "Tu possèdes déjà ce cours ! 🎉 Pas besoin de payer à nouveau. Nous venons de t'envoyer un code de vérification à 6 chiffres sur WhatsApp. Saisis-le ci-dessous pour accéder directement à ton cours."
          );
        }
        setModalStep('verify_code');
        setIsLoading(false);
        return;
      }

      // Si pas d'accès existant, on passe normalement à l'étape paiement
      setModalStep('payment');
    } catch (err: any) {
      console.error("Erreur lors de la vérification de propriété de compte existant:", err);
      // En cas d'erreur de vérification, on laisse passer au paiement pour ne pas bloquer l'utilisateur
      setModalStep('payment');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── VALIDATION DU CODE DE VÉRIFICATION ───
  const handleVerifyCodeSubmit = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setVerificationError("Le code doit comporter exactement 6 chiffres.");
      return;
    }

    setIsVerifyingCode(true);
    setVerificationError(null);

    try {
      const res = await fetch("/api/auth/temp-link/anonymous-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: tempUserId,
          code: verificationCode.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Code invalide");
      }

      // Succès ! Le serveur nous renvoie le lien d'accès déverrouillé
      setTempLink(data.link);
      setModalStep('success');

    } catch (err: any) {
      console.error("Erreur lors de la validation du code:", err);
      setVerificationError(err.message || "Code de vérification invalide. Veuillez réessayer.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Step 3 : Gérer la création de compte mot de passe-less et la redirection de paiement (SECURE SERVER-SIDE)
  const handlePurchase = async (method: 'moncash' | 'lemonsqueezy') => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Déterminer le productId et le type du produit associé au funnel
      let productId = "";
      let productType = "course"; // défaut
      
      if (courseData.linkedProductId) {
        if (typeof courseData.linkedProductId === 'string') {
          productId = courseData.linkedProductId;
          productType = courseData.linkedProductType || 'course';
        } else {
          productId = courseData.linkedProductId.id;
          productType = courseData.linkedProductId.path.startsWith('ebooks') ? 'ebook' : 'course';
        }
      } else {
        // Fallback sur l'offre actuelle si non spécifié
        productId = courseData.id || "default";
      }

      // 2. Créer l'utilisateur et la commande de manière sécurisée (Server-side)
      const amountValue = method === 'moncash' ? (courseData.priceGourdes || 0) : (courseData.currentPrice || 0);
      const currencyValue = method === 'moncash' ? "HTG" : (courseData.currency || "USD");

      const pendingRes = await fetch("/api/checkout/create-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          whatsappNumber: verifiedPhone,
          contactMethod,
          targetProductId: productId,
          productType,
          amount: amountValue,
          currency: currencyValue,
          headline: courseData.headline,
          videoPoster: courseData.videoPoster || "",
          paymentMethod: method
        })
      });

      if (!pendingRes.ok) {
        const errorData = await pendingRes.json();
        throw new Error(errorData.error || "Échec de l'initialisation de la commande sur le serveur");
      }

      const { userId, userEmail, userName, orderId } = await pendingRes.json();
      console.log("📦 [CHECKOUT] Commande sécurisée initialisée avec succès :", orderId);

      // 3. Procéder au paiement selon la méthode choisie
      if (method === 'moncash') {
        // Flow MonCash (Bazik)
        // Appeler l'API Bazik pour obtenir le lien de redirection de paiement
        const response = await fetch("/api/bazik/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            amount: amountValue,
            description: courseData.headline,
            customerFirstName: userName,
            userId: userId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Échec de l'initialisation du paiement Moncash");
        }

        const redirectUrl = data.redirectUrl || data.redirect_url || data.payment_link;

        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else if (data.payment_token?.redirect_url) {
          window.location.href = data.payment_token.redirect_url;
        } else {
          throw new Error("Lien de redirection MonCash introuvable");
        }

      } else if (method === 'lemonsqueezy') {
        // Flow Lemon Squeezy (Carte / PayPal)
        const response = await fetch("/api/lemonsqueezy/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: productId,
            userId: userId,
            userEmail: userEmail,
            userName: userName
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Échec de la création de la session de paiement");
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          throw new Error("Aucun lien de paiement retourné par Lemon Squeezy");
        }
      }

    } catch (err: any) {
      console.error("❌ [ERREUR PAIEMENT]", err);
      setError(err.message || "Une erreur est survenue lors de l'initialisation du paiement.");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToCta = () => {
    ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans antialiased overflow-x-hidden">
      {/* ── STICKY COUNTDOWN BAR ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-rose-500 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-bold text-white/90 shrink-0">
            {courseData.urgencyText}
          </span>
          {expired ? (
            <span className="text-sm font-black text-white">EXPIRÉ</span>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              {[time.h, time.m, time.s].map((unit, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="bg-black/30 backdrop-blur rounded px-2 py-0.5 text-center">
                    <span className="text-base sm:text-lg font-black tabular-nums leading-none">
                      {unit}
                    </span>
                  </div>
                  {i < 2 && (
                    <span className="text-white font-black text-lg leading-none">:</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <span className="text-[10px] sm:text-xs font-bold bg-white/20 rounded-full px-2 py-0.5 text-white shrink-0">
            {courseData.spotsLeft} places
          </span>
        </div>
      </div>

      {/* ── MAIN CONTENT ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-32">

        {/* BADGE + HEADLINE — full width */}
        <div className="text-center pt-8 pb-6">
          <div className="flex justify-center mb-5">
            <span className="text-xs font-black uppercase tracking-widest bg-gradient-to-r from-amber-400 to-orange-500 text-black px-4 py-1.5 rounded-full animate-pulse">
              {courseData.badge}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black leading-tight tracking-tight mb-3">
            {courseData.headline}
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-white/60 font-medium max-w-2xl mx-auto">
            <Bold text={courseData.subheadline} />
          </p>
        </div>

        {/* ── TWO-COLUMN GRID ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start">
        {/* ═ LEFT COLUMN ═ */}
        <div>

            {/* VIDEO */}
            <div className="relative w-full mb-6 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10 bg-black aspect-video">
          {!videoPlaying ? (
            <div
              className="absolute inset-0 cursor-pointer group flex items-center justify-center"
              onClick={() => setVideoPlaying(true)}
            >
              {courseData.videoPoster ? (
                <img
                  src={courseData.videoPoster}
                  alt="Aperçu du cours"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              ) : null}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="size-16 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-200">
                  <div className="w-0 h-0 border-t-[10px] border-b-[10px] border-l-[18px] border-t-transparent border-b-transparent border-l-black ml-1" />
                </div>
                <span className="text-sm font-bold text-white bg-black/50 backdrop-blur px-3 py-1 rounded-full">
                  Regarde la présentation gratuite
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            </div>
          ) : (
            <VideoPlayer
              url={courseData.videoUrl}
              className="absolute inset-0 w-full h-full"
              roundedClassName="rounded-none"
            />
          )}
            </div>

            {/* SPOTS WARNING */}
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-6">
              <span className="text-amber-400 text-lg shrink-0">⚠️</span>
              <p className="text-sm text-amber-300 font-semibold">
                Il ne reste que{" "}
                <span className="text-amber-400 font-black">
                  {courseData.spotsLeft} places
                </span>{" "}
                à ce prix. L'offre expire dès que le compteur atteint zéro.
              </p>
            </div>

            {/* CTA BLOCK — mobile only */}
            <div className="lg:hidden" ref={ctaRef}>
              <div
                className={`relative bg-gradient-to-b from-white/5 to-white/[0.02] rounded-2xl p-6 shadow-2xl overflow-visible transition-all duration-500 ${
                  glowing
                    ? "border-2 border-amber-400/80 shadow-amber-500/40 shadow-[0_0_40px_10px]"
                    : "border border-white/10"
                }`}
              >
          {/* ── Floating ambient sparkles (always visible) */}
              {[...Array(6)].map((_, i) => (
                <span
                  key={i}
                  className="absolute pointer-events-none select-none text-sm"
                  style={{
                    left: `${10 + i * 15}%`,
                    top: i % 2 === 0 ? "-18px" : "auto",
                    bottom: i % 2 !== 0 ? "-14px" : "auto",
                    animation: `float-sparkle ${1.8 + i * 0.4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                    opacity: 0.7,
                  }}
                >
                  {["✨", "💫", "⭐", "🌟", "✦", "★"][i]}
                </span>
              ))}

          {/* ── Shimmer overlay on button hover */}
          <style>{`
            @keyframes float-sparkle {
              0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
              50% { transform: translateY(-8px) scale(1.2); opacity: 1; }
            }
            @keyframes shimmer {
              0% { background-position: -200% center; }
              100% { background-position: 200% center; }
            }
            @keyframes pulse-ring {
              0% { transform: scale(1); opacity: 0.6; }
              100% { transform: scale(1.08); opacity: 0; }
            }
            @keyframes bounce-price {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.06); }
            }
            .cta-shimmer {
              background: linear-gradient(
                110deg,
                #f59e0b 0%, #f97316 30%, #fde68a 50%, #ef4444 70%, #f59e0b 100%
              );
              background-size: 200% auto;
              animation: shimmer 2.5s linear infinite;
            }
            .price-bounce {
              animation: bounce-price 2s ease-in-out infinite;
            }
            .discount-badge {
              animation: float-sparkle 1.5s ease-in-out infinite;
            }
          `}</style>

              {/* Price */}
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="text-white/40 text-xl font-bold line-through">
                  {courseData.currency}{courseData.originalPrice}
                </span>
                <span className="text-5xl font-black text-white price-bounce drop-shadow-lg">
                  {courseData.currency}{courseData.currentPrice}
                </span>
                <span className="text-xs font-black bg-green-500 text-white px-2 py-1 rounded-full uppercase tracking-wider discount-badge shadow-lg shadow-green-500/30">
                  -{Math.round((1 - courseData.currentPrice / courseData.originalPrice) * 100)}%
                </span>
              </div>
              <p className="text-center text-xs text-white/40 mb-6">
                Paiement unique · Accès à vie
              </p>

              {/* Main CTA button */}
              <div className="relative">
                {!expired && (
                  <div
                    className="absolute inset-0 rounded-xl bg-orange-500/40"
                    style={{ animation: "pulse-ring 1.6s ease-out infinite" }}
                  />
                )}
                <button
                  onClick={() => { burstConfetti(); handleAccessClick(); }}
                  disabled={expired || isBlocked}
                  className={`relative w-full py-4 rounded-xl text-base font-black tracking-tight active:scale-95 shadow-xl transition-transform duration-150 ${
                    (expired || isBlocked)
                      ? "bg-white/10 text-white/30 cursor-not-allowed"
                      : "cta-shimmer text-white shadow-orange-500/40 shadow-2xl"
                  }`}
                >
                  {isBlocked ? "Accès suspendu" : expired ? "Offre expirée" : courseData.ctaText}
                </button>
              </div>
              <p className="text-center text-xs text-white/40 mt-3">
                {courseData.ctaSubtext}
              </p>
              </div>{/* end inner cta */}
            </div>{/* end mobile cta wrapper */}

            {/* BENEFITS */}
            <div className="mb-8">
              <h2 className="text-xl lg:text-2xl font-black mt-8 mb-5">✅ Ce que tu vas apprendre</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courseData.benefits.map((b, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 hover:bg-white/[0.06] transition-colors"
                >
                  <span className="text-2xl shrink-0">{b.icon}</span>
                  <p className="text-sm text-white/80 leading-relaxed">
                    <Bold text={b.text} />
                  </p>
                </div>
              ))}
              </div>
            </div>

            {/* TESTIMONIALS */}
            <div className="mb-8">
              <h2 className="text-xl lg:text-2xl font-black mb-5">🏆 Ils ont déjà transformé leur vie</h2>
              <div className="space-y-4">
            {testimonials && testimonials.map((t, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={t.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name || 'User')}&background=random`}
                      alt={t.name}
                      className="size-10 rounded-full object-cover border-2 border-white/10"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-white/40">{t.role}</p>
                    </div>
                    <div className="ml-auto flex">
                      {"★".repeat(t.stars).split("").map((s, si) => (
                        <span key={si} className="text-amber-400 text-sm">{s}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-white/70 italic leading-relaxed">"{t.text}"</p>
                </div>
              ))}
              </div>
            </div>{/* end testimonials */}

            {/* GUARANTEE — mobile */}
            <div className="lg:hidden bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-5 mb-6 flex gap-4">
              <span className="text-4xl shrink-0">🛡️</span>
              <div>
                <h3 className="font-black text-white mb-1">Garantie 30 jours</h3>
                <p className="text-sm text-white/60 leading-relaxed">Si tu n'es pas satisfait dans les 30 jours, on te rembourse intégralement. Sans questions.</p>
              </div>
            </div>

          </div>{/* end left column */}

          {/* RIGHT COLUMN — desktop sticky sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-16 space-y-5">
              {/* CTA Block desktop */}
              <div
                ref={ctaRef}
                className={`relative bg-gradient-to-b from-white/5 to-white/[0.02] rounded-2xl p-6 shadow-2xl overflow-visible transition-all duration-500 ${
                  glowing
                    ? "border-2 border-amber-400/80 shadow-amber-500/40 shadow-[0_0_40px_10px]"
                    : "border border-white/10"
                }`}
              >
                {[...Array(6)].map((_, i) => (
                  <span key={i} className="absolute pointer-events-none select-none text-sm"
                    style={{ left: `${10+i*15}%`, top: i%2===0?"-18px":"auto", bottom: i%2!==0?"-14px":"auto",
                      animation:`float-sparkle ${1.8+i*0.4}s ease-in-out infinite`, animationDelay:`${i*0.3}s`, opacity:0.7 }}
                  >{["✨","💫","⭐","🌟","✦","★"][i]}</span>
                ))}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <span className="text-white/40 text-xl font-bold line-through">{courseData.currency}{courseData.originalPrice}</span>
                  <span className="text-5xl font-black text-white price-bounce drop-shadow-lg">{courseData.currency}{courseData.currentPrice}</span>
                  <span className="text-xs font-black bg-green-500 text-white px-2 py-1 rounded-full uppercase tracking-wider discount-badge shadow-lg shadow-green-500/30">
                    -{Math.round((1 - courseData.currentPrice / courseData.originalPrice) * 100)}%
                  </span>
                </div>
                <p className="text-center text-xs text-white/40 mb-6">Paiement unique · Accès à vie</p>
                <div className="relative">
                  {!expired && <div className="absolute inset-0 rounded-xl bg-orange-500/40" style={{ animation: "pulse-ring 1.6s ease-out infinite" }} />}
                  <button
                    onClick={() => { burstConfetti(); handleAccessClick(); }}
                    disabled={expired || isBlocked}
                    className={`relative w-full py-4 rounded-xl text-base font-black tracking-tight active:scale-95 shadow-xl transition-transform duration-150 ${
                      (expired || isBlocked) ? "bg-white/10 text-white/30 cursor-not-allowed" : "cta-shimmer text-white shadow-orange-500/40 shadow-2xl"
                    }`}
                  >{isBlocked ? "Accès suspendu" : expired ? "Offre expirée" : courseData.ctaText}</button>
                </div>
                <p className="text-center text-xs text-white/40 mt-3">{courseData.ctaSubtext}</p>
              </div>
              {/* Guarantee desktop */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4 flex gap-3">
                <span className="text-3xl shrink-0">🛡️</span>
                <div>
                  <h3 className="font-black text-white text-sm mb-0.5">Garantie 30 jours</h3>
                  <p className="text-xs text-white/60 leading-relaxed">Pas satisfait ? On te rembourse intégralement, sans questions.</p>
                </div>
              </div>
              {/* Trust badges desktop */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[{icon:"🔒",label:"Paiement\nsécurisé"},{icon:"⚡",label:"Accès\nimmédiat"},{icon:"♾️",label:"Accès\nà vie"}].map((b) => (
                  <div key={b.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="text-xl mb-1">{b.icon}</div>
                    <p className="text-[10px] text-white/50 font-semibold whitespace-pre-line leading-tight">{b.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/20 text-center">
                En cliquant tu acceptes nos <a href="/terms" className="underline">conditions</a> et notre <a href="/privacy" className="underline">politique de confidentialité</a>.
              </p>
            </div>
          </div>

        </div>{/* end grid */}
      </div>

      {/* ── STICKY MOBILE CTA ─── */}
      {hasScrolled && !showModal && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 shadow-2xl flex flex-col gap-2 transition-all duration-300">
          {!expired && !isBlocked && (
            <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-white/50 px-1 max-w-lg mx-auto w-full uppercase">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="size-1.5 bg-amber-400 rounded-full animate-ping shrink-0" />
                ⚠️ Seulement {courseData.spotsLeft} places !
              </span>
              <span className="text-rose-400 font-bold animate-pulse">
                {courseData.urgencyText || "Expire dans :"} {time.h}:{time.m}:{time.s}
              </span>
            </div>
          )}

          <div className="relative w-full max-w-lg mx-auto">
            {!expired && !isBlocked && (
              <div
                className="absolute inset-0 rounded-xl bg-orange-500/40"
                style={{ animation: "pulse-ring 1.6s ease-out infinite" }}
              />
            )}
            <button
              onClick={() => { burstConfetti(); handleAccessClick(); }}
              disabled={expired || isBlocked}
              className={`relative w-full py-4 rounded-xl text-xs sm:text-sm font-black tracking-tight transition-all duration-200 active:scale-95 shadow-xl ${
                (expired || isBlocked)
                  ? "bg-white/10 text-white/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white cta-shimmer"
              }`}
            >
              {isBlocked ? "Accès suspendu" : expired ? "Offre expirée" : `${courseData.ctaText} — ${courseData.currency}${courseData.currentPrice} ${courseData.priceGourdes ? `(${courseData.priceGourdes} HTG)` : ''} →`}
            </button>
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ─── */}
      {showModal && (
        <div
          className={`fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-6 transition-colors duration-300 ${
            isClosing ? 'bg-black/0 backdrop-blur-none' : 'bg-black/70 backdrop-blur-sm'
          }`}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full lg:max-w-lg bg-[#141414] border border-white/10 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-visible"
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
            <style>{`
              @keyframes slideUpModal {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
              @keyframes fadeInModal {
                from { transform: translateY(30px) scale(0.97); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
              }
            `}</style>

            {/* Handle bar — mobile: draggable, desktop: hidden */}
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

              {/* ══ DÉJÀ PROPRIÉTAIRE (CONNECTÉ) ══ */}
              {currentUser && alreadyOwned ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-black text-white mb-2 leading-tight uppercase text-center">
                    Tu possèdes déjà ce cours !
                  </h2>
                  <p className="text-sm text-white/50 mb-8 leading-relaxed max-w-sm mx-auto text-center">
                    Pas besoin de l'acheter une deuxième fois. Tu es déjà connecté et ton accès est actif dans ton espace membre !
                  </p>
                  <button
                    onClick={() => {
                      let targetProductId = "";
                      if (courseData.linkedProductId) {
                        targetProductId = typeof courseData.linkedProductId === 'string'
                          ? courseData.linkedProductId
                          : courseData.linkedProductId.id;
                      } else {
                        targetProductId = courseData.id || "default";
                      }
                      window.location.href = `/course/${targetProductId}`;
                    }}
                    className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">school</span>
                    Accéder à mon cours
                  </button>
                  <button
                    onClick={() => window.location.href = "/dashboard"}
                    className="w-full mt-4 text-xs font-bold text-white/40 hover:text-white transition-colors"
                  >
                    Aller au Tableau de Bord
                  </button>
                </div>
              ) : (
                <>
                  {/* ══ STEP 1 : CONTACT ══ */}
                  {modalStep === 'contact' && (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="size-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                        <span className="text-xl">🚀</span>
                      </div>
                      <div>
                        <h2 className="text-lg lg:text-xl font-black text-white leading-tight">Accès instantané</h2>
                        <p className="text-xs text-white/40">Aucun mot de passe requis</p>
                      </div>
                    </div>
                     {/* X button — desktop only */}
                    <button
                      onClick={closeModal}
                      className="hidden lg:flex size-8 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors shrink-0 ml-2"
                    >
                      <svg className="size-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Toggle téléphone / email */}
                  <div className="flex p-1 bg-white/5 rounded-xl mb-5">
                    <button
                      type="button"
                      onClick={() => { setContactMethod('phone'); setError(null); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                        contactMethod === 'phone'
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <span>📱</span> Téléphone
                    </button>
                    <button
                      type="button"
                      onClick={() => { setContactMethod('email'); setError(null); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                        contactMethod === 'email'
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-md'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <span>✉️</span> Email
                    </button>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-xl mb-4 text-center">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    {/* CHAMP HONEYPOT - Totalement invisible pour les humains mais visible dans le DOM pour les bots */}
                    <div className="absolute opacity-0 -z-50 h-0 w-0 pointer-events-none overflow-hidden" aria-hidden="true">
                      <input 
                        type="text" 
                        name="username_verification" 
                        autoComplete="off" 
                        tabIndex={-1} 
                      />
                    </div>
                    {contactMethod === 'phone' ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest">
                          Numéro de téléphone
                        </label>
                        <div className="flex gap-2">
                          {/* Country selector */}
                          <div className="relative">
                            <button
                              ref={countryBtnRef}
                              type="button"
                              onClick={() => showCountryDropdown ? (setShowCountryDropdown(false)) : openCountryDropdown()}
                              className="h-full min-w-[90px] px-3 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white flex items-center gap-1.5 hover:bg-white/10 transition-colors text-sm font-bold whitespace-nowrap"
                            >
                              <span className="text-base">{selectedCountry.flag}</span>
                              <span className="text-white/70">{selectedCountry.dial}</span>
                              <svg className={`size-3 text-white/40 transition-transform ${showCountryDropdown ? '-rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {showCountryDropdown && typeof window !== 'undefined' && createPortal(
                              <div
                                ref={countryDropdownRef}
                                className="fixed w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden"
                                style={{
                                  left: dropdownPos.left,
                                  ...(dropdownPos.above
                                    ? { bottom: window.innerHeight - dropdownPos.top, top: 'auto' }
                                    : { top: dropdownPos.top }),
                                }}
                              >
                                <div className="p-2 border-b border-white/5">
                                  <input
                                    type="text"
                                    value={countrySearch}
                                    onChange={(e) => setCountrySearch(e.target.value)}
                                    placeholder="Pays ou indicatif (+509, 33...)"
                                    autoFocus
                                    className="w-full px-3 py-2 bg-white/5 rounded-lg text-white text-xs placeholder:text-white/30 focus:outline-none"
                                  />
                                </div>
                                <div className="max-h-56 overflow-y-auto">
                                  {COUNTRIES.filter(c =>
                                    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                    c.dial.includes(countrySearch)
                                  ).map((country) => (
                                    <button
                                      key={country.code}
                                      type="button"
                                      onClick={() => { setSelectedCountry(country); setShowCountryDropdown(false); setCountrySearch(''); }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left ${
                                        selectedCountry.code === country.code ? 'bg-orange-500/10 text-orange-400' : 'text-white/80'
                                      }`}
                                    >
                                      <span className="text-base shrink-0">{country.flag}</span>
                                      <span className="flex-1 truncate">{country.name}</span>
                                      <span className="text-white/40 text-xs shrink-0">{country.dial}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>,
                              document.body
                            )}
                          </div>
                          {/* Phone input */}
                          <input
                            type="tel"
                            value={formatPhone(phone, selectedCountry.code)}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder={
                              selectedCountry.code === 'HT' ? '34 56 7890' :
                              ['US','CA','DO','JM','PR','TT','BB'].includes(selectedCountry.code) ? '809 484 2020' :
                              '## ## ## ##'
                            }
                            required
                            autoFocus
                            className="flex-1 px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all text-sm tracking-wide font-medium"
                          />
                        </div>
                        <p className="text-[11px] text-white/30 pl-1">
                          Tu recevras un message WhatsApp ou SMS avec ton lien d'accès.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest">
                          Adresse e-mail
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ton@email.com"
                          required
                          autoFocus
                          className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all text-sm"
                        />
                        <p className="text-[11px] text-white/30 pl-1">
                          Tu recevras un lien magique par email. Vérifie tes spams.
                        </p>
                      </div>
                    )}

                    <button type="submit"
                      disabled={isBlocked || (contactMethod === 'email' ? !email : !phone)}
                      className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white font-black rounded-xl text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-orange-500/20">
                      {isBlocked ? "Accès suspendu" : "Continuer →"}
                    </button>
                  </form>
                  <div className="flex items-center justify-center gap-4 mt-5">
                    {["🔒 Sécurisé", "⚡ Instantané", "🛡️ Privé"].map((tag) => (
                      <span key={tag} className="text-[10px] text-white/25 font-medium">{tag}</span>
                    ))}
                  </div>
                </>
              )}

              {/* ══ STEP 2 : PAIEMENT ══ */}
              {modalStep === 'payment' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <button onClick={() => { setModalStep('contact'); setError(null); }} className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-bold transition-colors">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                      Retour
                    </button>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Paiement</p>
                    <button onClick={closeModal} className="hidden lg:flex size-7 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors">
                      <svg className="size-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>

                  <div className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                    <span className="text-xs text-white/50">Total</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-sm line-through">{courseData.currency}{courseData.originalPrice}</span>
                      <span className="text-xl font-black text-white">{courseData.currency}{courseData.currentPrice}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-3 rounded-xl mb-4 text-center">
                      {error}
                    </div>
                  )}

                  <p className="text-xs text-white/40 text-center mb-4 font-semibold uppercase tracking-widest">Comment veux-tu payer ?</p>

                  <div className="space-y-3">
                    {selectedCountry.code === 'HT' && (
                      <button onClick={() => handlePurchase('moncash')} disabled={isLoading || isBlocked}
                        className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#e30713]/20 to-[#e30713]/5 border-2 border-[#e30713]/50 hover:border-[#e30713] rounded-2xl transition-all active:scale-95 disabled:opacity-50 group">
                        <img src="/images/moncash-logo.png" alt="MonCash" className="size-12 object-contain rounded-xl shadow-lg shrink-0" />
                        <div className="text-left flex-1">
                          <p className="font-black text-white text-sm">MonCash ({courseData.priceGourdes} HTG)</p>
                          <p className="text-xs text-white/50">Paiement mobile haïtien · Rapide</p>
                        </div>
                        <svg className="size-5 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                      </button>
                    )}

                    <button onClick={() => handlePurchase('lemonsqueezy')} disabled={isLoading || isBlocked}
                      className="w-full flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/[0.06] rounded-2xl transition-all active:scale-95 disabled:opacity-50 group">
                      <div className="size-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                        <span className="text-xl">💳</span>
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-black text-white text-sm">Carte bancaire · PayPal</p>
                        <p className="text-xs text-white/50">Visa, Mastercard, American Express</p>
                      </div>
                      <svg className="size-5 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-white/40 text-xs">
                      <div className="size-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"/>
                      Traitement...
                    </div>
                  )}
                </div>
              )}

              {/* ══ STEP 4 : VÉRIFICATION CODE ══ */}
              {modalStep === 'verify_code' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <button onClick={() => { setModalStep('contact'); setVerificationCode(''); setVerificationError(null); }} className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-bold transition-colors">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                      Retour
                    </button>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Sécurité</p>
                    <button onClick={closeModal} className="hidden lg:flex size-7 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center transition-colors">
                      <svg className="size-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>

                  <div className="text-center py-4">
                    <div className="size-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                      <span className="text-3xl">🔑</span>
                    </div>
                    <h2 className="text-xl font-black text-white mb-2 leading-tight uppercase">
                      Code de vérification
                    </h2>
                    <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-sm mx-auto">
                      {contactMethod === 'email'
                        ? "Un e-mail de connexion sécurisé ainsi qu'un code de vérification ont été générés. Renseigne le code à 6 chiffres ci-dessous pour confirmer ton identité :"
                        : "Nous venons de t'envoyer un code de vérification à 6 chiffres par WhatsApp. Renseigne-le ci-dessous pour confirmer ton identité et obtenir ton lien d'accès :"}
                    </p>

                    <div className="mb-6 text-left">
                      <label className="block text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">
                        Saisis ton code à 6 chiffres :
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').substring(0, 6);
                          setVerificationCode(val);
                        }}
                        className="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-center text-xl font-mono text-white placeholder-white/20 tracking-[0.5em] focus:outline-none focus:border-primary transition-colors"
                      />
                      {verificationError && (
                        <p className="text-[11px] text-red-500 mt-2 font-semibold">
                          ⚠️ {verificationError}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleVerifyCodeSubmit}
                      disabled={isVerifyingCode || verificationCode.length !== 6}
                      className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isVerifyingCode ? (
                        <>
                          <div className="size-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"/>
                          Validation...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg font-bold">verified_user</span>
                          Valider le code
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ══ STEP 3 : SUCCÈS ══ */}
              {modalStep === 'success' && (
                <div className="text-center py-6">
                  {alreadyOwnedMessage ? (
                    <>
                      <div className="size-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                        <span className="text-3xl">🎉</span>
                      </div>
                      <h2 className="text-xl font-black text-white mb-2 leading-tight uppercase text-center">
                        Tu possèdes déjà ce cours !
                      </h2>
                      <p className="text-sm text-white/60 mb-6 leading-relaxed max-w-sm mx-auto text-center">
                        {alreadyOwnedMessage}
                      </p>

                      {tempLink && (
                        <div className="mb-6 text-left">
                          <label className="block text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">Ton lien d'accès unique :</label>
                          <div className="relative">
                            <input
                              readOnly
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white/70 pr-20 focus:outline-none"
                              value={tempLink}
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(tempLink);
                                alert("Lien copié dans le presse-papiers !");
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold rounded-lg transition-colors"
                            >
                              Copier
                            </button>
                          </div>
                          <p className="text-[10px] text-white/30 mt-1.5">
                            *Ce lien est à usage unique et n'expirera jamais tant que tu ne l'auras pas utilisé.
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          window.location.href = tempLink || "/login";
                        }}
                        className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">login</span>
                        Se connecter au cours
                      </button>
                      <button
                        onClick={() => { setModalStep('contact'); setEmail(''); setPhone(''); setAlreadyOwnedMessage(null); setTempLink(null); }}
                        className="w-full mt-4 text-xs font-bold text-white/40 hover:text-white transition-colors"
                      >
                        Retour
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="size-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">{contactMethod === 'phone' ? '📱' : '📬'}</span>
                      </div>
                      <h2 className="text-xl font-black text-white mb-2">
                        {contactMethod === 'phone' ? 'Vérifie tes messages !' : 'Vérifie tes e-mails !'}
                      </h2>
                      <p className="text-sm text-white/50 mb-6 leading-relaxed text-center">
                        {contactMethod === 'phone'
                          ? <><span className="text-white font-bold">{selectedCountry.dial} {phone}</span> — ton lien arrive sous peu.</>
                          : <>Lien envoyé à <span className="text-white font-bold">{email}</span>. Clique dessus pour accéder.</>}
                      </p>
                      <p className="text-xs text-white/30 mb-4 text-center">
                        {contactMethod === 'phone' ? "Vérifie aussi WhatsApp si tu ne l'as pas reçu par SMS." : 'Vérifie aussi tes spams.'}
                      </p>
                      <button onClick={() => { setModalStep('contact'); setEmail(''); setPhone(''); }}
                        className="text-xs text-orange-400 underline hover:text-orange-300 transition-colors">
                        Utiliser une autre méthode
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

            </div>
          </div>
        </div>
      )}
    
      {/* ── CONFETTI PARTICLES LAYER ─── */}
      <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: p.x,
              top: p.y,
              opacity: p.opacity,
              transform: `rotate(${p.angle + p.y * p.spin}deg)`,
              willChange: "transform, opacity",
            }}
          >
            {p.type === "emoji" ? (
              <span style={{ fontSize: p.size }}>{p.emoji}</span>
            ) : p.type === "circle" ? (
              <div
                style={{
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  backgroundColor: p.color,
                  boxShadow: `0 0 6px ${p.color}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: p.size * 0.6,
                  height: p.size * 1.4,
                  backgroundColor: p.color,
                  borderRadius: 2,
                  boxShadow: `0 0 4px ${p.color}`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* POPUP ANTI-BOT */}
      {showPopup && (
        <BotBlockerPopup timeLeft={timeLeft} />
      )}
    </div>
  );
}
