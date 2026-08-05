"use client";

import { useState, useEffect } from "react";
import { getGift } from "@/lib/gifts";
import { Gift } from "@/lib/types";
import KadoForm from "@/components/shared/KadoForm";
import { useParams } from "next/navigation";

export default function EditKadoPage() {
    const params = useParams();
    const id = params.id as string;
    const [gift, setGift] = useState<Gift | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        getGift(id).then(g => {
            setGift(g);
            setLoading(false);
        });
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
    );

    if (!gift) return (
        <div className="text-center py-20 text-black/40 font-medium">Kado introuvable.</div>
    );

    return <KadoForm initialData={gift} giftId={id} />;
}
