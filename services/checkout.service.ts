import { Product } from "@/types/product";

export interface CheckoutOptions {
    paymentMethod: "lemonsqueezy" | "plopplop";
    userEmail?: string;
    userName?: string;
    method?: "moncash" | "natcash";
}

export class CheckoutService {
    async initializeCheckout(product: Product, options: CheckoutOptions) {
        if (options.paymentMethod === "plopplop") {
            const res = await fetch("/api/payment/plopplop/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    productType: product.type || "course",
                    method: options.method || "moncash",
                    userEmail: options.userEmail,
                    userName: options.userName,
                }),
            });
            return await res.json();
        } else {
            const res = await fetch("/api/payment/lemon-squeezy/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    productType: product.type || "course",
                    userEmail: options.userEmail,
                    userName: options.userName,
                }),
            });
            return await res.json();
        }
    }
}

export const checkoutService = new CheckoutService();
