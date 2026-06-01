"use client";

import { useState, useEffect } from "react";
import { getOrders, createOrder } from "@/lib/orders";
import { Order } from "@/lib/types";

export default function OrdersDemo() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await getOrders();
            setOrders(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTestOrder = async () => {
        const newOrder: Omit<Order, "id"> = {
            amount: 49.99,
            currency: "EUR",
            createdAt: new Date().toISOString() as any, // Using ISO string for Supabase
            productId: "some-ebook-id" as any,
            productThumbnailUrl: "https://via.placeholder.com/50",
            productTitle: "Mon Super Ebook",
            productType: "ebook",
            status: "paid",
            transactionId: "TX_" + Math.random().toString(36).substr(2, 9),
            userEmail: "client@example.com",
            userId: "some-user-id" as any
        };

        await createOrder(newOrder);
        loadOrders();
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="p-8 border-t mt-8">
            <h1 className="text-2xl font-bold mb-4">Commandes (Orders)</h1>
            <button onClick={handleAddTestOrder} className="bg-green-700 text-white px-4 py-2 rounded mb-6">
                + Créer Commande Test
            </button>

            <div className="space-y-4">
                {orders.map(order => (
                    <div key={order.id} className="border p-4 rounded bg-white shadow flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                                <img src={order.productThumbnailUrl} alt="Product" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="font-bold">{order.productTitle}</h3>
                                <p className="text-sm text-gray-500">{order.productType} | {order.transactionId}</p>
                                <p className="text-xs text-blue-600">{order.userEmail}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-lg">{order.amount} {order.currency}</span>
                            <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-800 uppercase">
                                {order.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
