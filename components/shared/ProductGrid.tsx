import Link from "next/link";
import { useState } from "react";
import InvitationCodeModal from "@/components/shared/InvitationCodeModal";

interface Product {
    title: string;
    type: string;
    date: string;
    price: string;
    image: string;
    action: string;
    isInvitationOnly?: boolean;
    invitationCode?: string;
}

const products: Product[] = [
    {
        title: "Principes de Design UI Avancés",
        type: "Course",
        date: "Acheté le 12 oct.",
        price: "$99.00",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGrUI0rf6pBHjJ1nwYZNMxDhAQWxXc0NE0VpCWiMxb9Z4xQMmRfG5L367bBv_tSrtNRnX56n_sYPHwuwTzBQcEL_bsXKaSGPgUAuzOmqhd5rlzsdhhG_tjnyaXHOa-qmMPC69LED0kdCbUOtMgz6EckRzuj5MuAEbnHeXKZA_wYaagLQ2xiSVFeYx6k9M0sdeYKPPg9Hblng5NqYAQqMSid77nAz_-klgyMfWVwMMPnXOkhxJg2TOtcExF6NbzF0uvXirLUvalb38",
        action: "Accéder au contenu"
    },
    {
        title: "Le Manuel du Designer Minimaliste",
        type: "Ebook",
        date: "Acheté le 28 sep.",
        price: "$29.00",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDWaVssRtPoiauWUBXH5kOAx48tVUc_pZXLGWdHoc6ywK1sTqWFq5F06HefnierSh1E7WePO5eLbXuTgcWK6IbIwAnsJ3Z-XIz0Y2t2ZM9YPW2ZnPqYXCfDdszZaGIEqrxBk-w7mitn_CykaNGxQJOKc0sdoZVlIpcGHyXiNfsARc1AUZBluUVweyCiyKhLLhltXTCDakU4Kwu5KOA-uTlpxEO9GkNcwFrdJxC72BnsZya77pQ3R-EZmz_kjwzzP1WZW1D78dlOMiQ",
        action: "Lire l'Ebook"
    },
    {
        title: "Session de Croissance Stratégique 1:1",
        type: "Booking",
        date: "Prévu le 5 nov.",
        price: "$150.00",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB8efdn-6IAPpcgkk0w4y_znT6SHBOPIlHUG1so7zADR20btECioddsL7AQZvVQZPROTxZqsB0T2d870R4KwzxD3Q0LROThkvtlOmz2DfYpEBPzRTMzxF5dkjzxYoPro9wsqc52pOd0UVUM63cUisLXXcGRPM63-_lFfbrXNyYgZmUFk3oqvecJKGe6Acww1Df7nSrIN-kXiGwSu91IkckOc-NG88dwCAxx8o3KAgZeCMhfUYOekm38Az6dQ-L6nwQEvSz0LezgZUU",
        action: "Voir la réservation"
    },
    {
        title: "Motion Design avec After Effects",
        type: "Course",
        date: "Acheté le 15 août",
        price: "$129.00",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwCG1bQtkp2sYC6aNT0X5gY2o70j4JA0pYZ7HkLnNFxWGwNTwIA3ZwgNITLHuLsH2_u523ChXj2UF6ZTcKvrfccNZxqWaxRdHtd6__6yVk1koZYnU7qDlLFu5aQwQXn5XEtFLtUpl6tJ9DiO2SFPZeXIwiKmT9u0BE95veBmG0Krnef6Pf5cSFPOWxSinbl-VX3pvboE7NW2nugW9UUbkBuuexgEIZcgwNOGsuv4WFfKlJKD2tsAsqh_Ay5SsdeVII3X_wEQsWdvg",
        action: "Accéder au contenu"
    }
];

interface ProductGridProps {
    activeFilter: string;
}

export default function ProductGrid({ activeFilter }: ProductGridProps) {
    const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
    const [invitationTarget, setInvitationTarget] = useState<Product | null>(null);

    const filteredProducts = activeFilter === "Tous"
        ? products
        : products.filter(p => {
            if (activeFilter === "Cours") return p.type === "Course";
            if (activeFilter === "Ebooks") return p.type === "Ebook";
            if (activeFilter === "Réservations") return p.type === "Booking";
            return true;
        });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
            {filteredProducts.map((product, index) => {
                const handleAction = () => {
                    if (product.isInvitationOnly && product.invitationCode) {
                        setInvitationTarget(product);
                        setIsInvitationModalOpen(true);
                    }
                };

                return (
                    <div key={index} className="flex flex-col group bg-white dark:bg-white/5 rounded-3xl p-4 border border-primary/5 dark:border-white/5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div
                        className="w-full bg-center bg-no-repeat aspect-[16/10] bg-cover rounded-2xl mb-6 relative overflow-hidden"
                        style={{ backgroundImage: `url("${product.image}")` }}
                    >
                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300" />
                    </div>
                    <div className="px-2 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary/10 dark:bg-white/10 text-primary dark:text-white text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full">
                                {product.type === "Course" ? "Cours" : product.type === "Ebook" ? "Ebook" : "Réservation"}
                            </span>
                            <span className="text-primary/40 dark:text-white/40 text-xs font-medium">
                                {product.date}
                            </span>
                        </div>
                        <h3 className="text-primary dark:text-white text-xl font-bold leading-tight mb-8">
                            {product.title}
                        </h3>
                        <div className="mt-auto">
                            {product.type === "Booking" && (
                                <div className="text-primary dark:text-white text-lg font-bold mb-3 tracking-tight">
                                    {product.price}
                                </div>
                            )}
                            {product.type === "Course" ? (
                                <Link
                                    href={product.isInvitationOnly ? "#" : "/course"}
                                    onClick={(e) => {
                                        if (product.isInvitationOnly) {
                                            e.preventDefault();
                                            handleAction();
                                        }
                                    }}
                                    className="w-full flex items-center justify-center rounded-full h-12 bg-primary text-white text-sm font-bold tracking-tight hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    {product.action}
                                </Link>
                            ) : (
                                <button 
                                    onClick={handleAction}
                                    className="w-full flex items-center justify-center rounded-full h-12 bg-primary text-white text-sm font-bold tracking-tight hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    {product.action}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )})}
            {filteredProducts.length === 0 && (
                <div className="col-span-full flex items-center justify-center py-20">
                    <p className="text-primary/40 uppercase font-bold tracking-widest">Aucun élément trouvé dans cette catégorie</p>
                </div>
            )}
            {invitationTarget && (
                <InvitationCodeModal
                    isOpen={isInvitationModalOpen}
                    onClose={() => {
                        setIsInvitationModalOpen(false);
                        setInvitationTarget(null);
                    }}
                    correctCode={invitationTarget.invitationCode || ""}
                    onSuccess={() => {
                        // For mockup, just alert success
                        alert("Accès autorisé ! Pour le mockup, nous n'ouvrons pas de tiroir.");
                        setIsInvitationModalOpen(false);
                        setInvitationTarget(null);
                    }}
                    productName={invitationTarget.title}
                />
            )}
        </div>
    );
}
