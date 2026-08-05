import { Order } from "./types";

let ordersMemory: Order[] = [
    {
        id: "ord-1",
        userId: "user-admin-123",
        productTitle: "Fòmasyon Konplè sou IA & Prompt Engineering",
        productId: "course-ia-mastery",
        amount: 149,
        currency: "USD",
        status: "paid",
        paymentMethod: "Card",
        productThumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        productType: "course",
        transactionId: "tx-12345",
        userEmail: "admin@djrakademi.net",
        createdAt: new Date().toISOString()
    }
];

export const getOrders = async (): Promise<Order[]> => {
    return ordersMemory;
};

export const getOrdersByUser = async (userId: string, limitCount?: number): Promise<Order[]> => {
    const userOrders = ordersMemory.filter(o => o.userId === userId);
    return limitCount ? userOrders.slice(0, limitCount) : userOrders;
};

export const createOrder = async (orderData: Omit<Order, "id">): Promise<string> => {
    const id = crypto.randomUUID();
    const newOrder: Order = {
        ...orderData,
        id,
        createdAt: orderData.createdAt || new Date().toISOString()
    };
    ordersMemory.unshift(newOrder);
    return id;
};

export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
    const order = ordersMemory.find(o => o.id === id);
    if (order) {
        order.status = status;
    }
};
