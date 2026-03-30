"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    limit,
    orderBy
} from "firebase/firestore";

export default function LinkPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const [status, setStatus] = useState<string>("Vérification de vos accès...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setStatus("Redirection vers la connexion...");
            window.location.href = "/login";
            return;
        }

        const handleRedirect = async () => {
            try {
                const targetProductId = process.env.NEXT_PUBLIC_ID_PRODUCT_KAT_AUDIENCE;
                
                if (!targetProductId) {
                    setError("Configuration manquante : NEXT_PUBLIC_ID_PRODUCT_KAT_AUDIENCE");
                    return;
                }

                const userRef = doc(db, "users", user.uid);

                // 1. Récupération des enrollments de l'utilisateur
                setStatus("Recherche de votre inscription...");
                const enrollmentsRef = collection(db, "enrollments");
                const qEnrollments = query(
                    enrollmentsRef, 
                    where("userId", "==", userRef)
                );

                const enrollmentSnap = await getDocs(qEnrollments);
                
                // On cherche l'inscription qui correspond au productId (soit par ID direct, soit par la référence)
                const enrollmentDoc = enrollmentSnap.docs.find(d => {
                    const pid = d.data().productId;
                    return pid?.id === targetProductId || pid === targetProductId;
                });

                if (!enrollmentDoc) {
                    setStatus("Accès non trouvé pour ce produit.");
                    return;
                }

                const targetProductRef = enrollmentDoc.data().productId;

                // 2. Recherche de la commande (order) correspondante
                setStatus("Récupération des détails de la transaction...");
                const ordersRef = collection(db, "orders");
                
                // RECHERCHE PAR USERID (beaucoup plus efficace)
                // On tente d'abord avec la référence Firestore
                let qOrders = query(
                    ordersRef,
                    where("userId", "==", userRef)
                );

                let orderSnap = await getDocs(qOrders);
                
                // Si vide, on tente avec l'ID en format String
                if (orderSnap.empty) {
                    qOrders = query(
                        ordersRef,
                        where("userId", "==", user.uid)
                    );
                    orderSnap = await getDocs(qOrders);
                }

                // Filtrage fin par productId et status en JavaScript
                const matchedOrder = orderSnap.docs
                    .filter(d => {
                        const data = d.data();
                        const pid = data.productId;
                        const orderStatus = data.status;
                        
                        // Vérification du produit (ID direct ou référence)
                        const isCorrectProduct = pid?.id === targetProductId || pid === targetProductId;
                        
                        return isCorrectProduct && orderStatus === "completed";
                    })
                    .sort((a, b) => {
                        const dateA = a.data().createdAt?.seconds || 0;
                        const dateB = b.data().createdAt?.seconds || 0;
                        return dateB - dateA; // Le plus récent en premier
                    })[0];

                if (!matchedOrder) {
                    setStatus("Commande correspondante non trouvée.");
                    return;
                }

                const orderData = matchedOrder.data();
                const transactionId = orderData.transactionId;
                const paymentMethodRaw = orderData.paymentMethod?.toLowerCase();
                const currency = orderData.currency?.toUpperCase();

                // 3. Calcul du methodpayment selon vos règles
                let methodpayment = "card";

                if (paymentMethodRaw === "card" || paymentMethodRaw === "moncash") {
                    methodpayment = paymentMethodRaw;
                } else if (currency) {
                    if (currency === "HTG") {
                        methodpayment = "moncash";
                    } else {
                        methodpayment = "card";
                    }
                } else if (transactionId) {
                    if (transactionId.startsWith("pay_")) {
                        methodpayment = "card";
                    } else {
                        methodpayment = "moncash";
                    }
                } else {
                    methodpayment = "moncash";
                }

                // 4. Construction de l'URL et Redirection
                const redirectUrl = `https://kat.audiencetype.com/?payment=${transactionId}&user=${user.uid}&methodpayment=${methodpayment}`;
                
                setStatus("Redirection vers kat.audiencetype.com...");
                window.location.href = redirectUrl;

            } catch (err) {
                console.error("Erreur LinkPage:", err);
                setError("Une erreur est survenue lors de la redirection.");
            }
        };

        handleRedirect();
    }, [user, authLoading]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 shadow-sm max-w-md text-center">
                    <p className="font-bold mb-2">Erreur</p>
                    <p>{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-light p-4 text-center">
            <div className="space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                </div>
                <h1 className="text-xl font-medium text-primary animate-pulse">
                    {status}
                </h1>
                <p className="text-gray-500 text-sm">
                    Veuillez patienter pendant que nous préparons votre accès sécurisé.
                </p>
            </div>
        </div>
    );
}
