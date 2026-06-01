"use client"; // Indique que ce composant s'exécute côté client (nécessaire pour useState/useEffect)

import { useState, useEffect } from "react";
import { getEbooks, addEbook, deleteEbook } from "@/lib/ebooks"; // On importe nos fonctions magiques
import { Ebook } from "@/lib/types"; // On importe le type pour que TypeScript nous aide

/**
 * Composant de Démonstration pour les Ebooks
 * 
 * Ce composant montre comment :
 * 1. Récupérer la liste des ebooks au chargement de la page.
 * 2. Afficher ces ebooks.
 * 3. Ajouter un nouvel ebook (exemple simple).
 * 4. Supprimer un ebook.
 */
export default function EbooksDemo() {
    // 1. État pour stocker la liste des livres récupérés de Firestore
    const [ebooks, setEbooks] = useState<Ebook[]>([]);

    // 2. État pour gérer le chargement (pour afficher un petit spinner ou message)
    const [loading, setLoading] = useState(true);

    // 3. useEffect : C'est ici qu'on va chercher les données quand le composant "naît" (au montage)
    useEffect(() => {
        fetchData();
    }, []); // Le tableau vide [] signifie "exécute ça une seule fois au début"

    // Fonction pour charger les données
    const fetchData = async () => {
        try {
            setLoading(true); // On dit "je charge..."
            const data = await getEbooks(); // Appel à notre fonction lib/ebooks.ts
            setEbooks(data); // On met à jour l'état avec les données reçues
        } catch (error) {
            console.error("Oups, erreur de chargement:", error);
        } finally {
            setLoading(false); // On a fini de charger, qu'il y ait erreur ou pas
        }
    };

    // Fonction pour ajouter un exemple de livre
    const handleAddTestEbook = async () => {
        try {
            // Données factices pour l'exemple
            const newEbook = {
                title: "Mon Super Ebook " + Math.floor(Math.random() * 100),
                description: "Un livre incroyable sur...",
                price: 29.99,
                coverImage: "https://via.placeholder.com/150",
                fileUrl: "https://example.com/file.pdf",
                sales: 0,
                status: "draft",
                includedItems: ["PDF", "EPUB"],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await addEbook(newEbook); // Appel à Firestore
            alert("Livre ajouté !");
            fetchData(); // On recharge la liste pour voir le nouveau livre
        } catch (error) {
            console.error("Erreur ajout:", error);
        }
    };

    // Fonction pour supprimer un livre
    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer ce livre ?")) return;

        try {
            await deleteEbook(id); // Appel à Firestore
            // Au lieu de tout recharger, on peut juste enlever le livre de la liste locale (plus rapide visuellement)
            setEbooks((currentEbooks) => currentEbooks.filter((ebook) => ebook.id !== id));
        } catch (error) {
            console.error("Erreur suppression:", error);
        }
    };

    if (loading) return <p>Chargement des livres en cours...</p>;

    return (
        <div className="p-10 space-y-8">
            <h1 className="text-3xl font-bold">Gestion des Ebooks (Démo)</h1>

            {/* Bouton pour tester l'ajout */}
            <button
                onClick={handleAddTestEbook}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                + Ajouter un Ebook Test
            </button>

            {/* Liste des livres */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ebooks.map((ebook) => (
                    <div key={ebook.id} className="border p-4 rounded shadow bg-white">
                        <h2 className="text-xl font-semibold">{ebook.title}</h2>
                        <p className="text-gray-600 mb-2">{ebook.description}</p>
                        <div className="flex justify-between items-center mt-4">
                            <span className="font-bold text-green-600">{ebook.price} €</span>
                            <button
                                onClick={() => ebook.id && handleDelete(ebook.id)}
                                className="text-red-500 hover:text-red-700 text-sm underline"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                ))}

                {ebooks.length === 0 && (
                    <p className="text-gray-500 col-span-3 text-center">Aucun ebook trouvé.</p>
                )}
            </div>
        </div>
    );
}
