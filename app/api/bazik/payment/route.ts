import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, orderId, description, customerFirstName, userId } = body;

        if (!amount || !orderId || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const BAZIK_USER_ID = process.env.BAZIK_USER_ID?.trim();
        const BAZIK_SECRET_KEY = process.env.BAZIK_SECRET_KEY?.trim();
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim();

        console.log("🔍 [BAZIK DEBUG] Env Check - USER_ID:", BAZIK_USER_ID ? "PRESENT" : "MISSING", "SECRET_KEY:", BAZIK_SECRET_KEY ? "PRESENT" : "MISSING", "BASE_URL:", BASE_URL);

        if (!BAZIK_USER_ID || !BAZIK_SECRET_KEY) {
            console.error("Missing Bazik credentials in environment variables");
            return NextResponse.json({ error: "Server configuration error: Credentials missing" }, { status: 500 });
        }

        // 1. Get Access Token
        const tokenResponse = await fetch("https://api.bazik.io/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userID: BAZIK_USER_ID,
                secretKey: BAZIK_SECRET_KEY,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.token) {
            console.error("Bazik Token Error:", tokenData);
            return NextResponse.json({ error: "Failed to authenticate with payment provider" }, { status: 502 });
        }

        const accessToken = tokenData.token;

        // 2. Create Payment
        const paymentPayload = {
            gdes: amount, // Amount in Gourdes
            userID: userId, // User's ID from our system (as requested)
            customerFirstName: customerFirstName || "Client",
            description: description || "Paiement Moncash",
            referenceId: orderId,
            successUrl: `${BASE_URL}/dashboard?payment=success`,
            errorUrl: `${BASE_URL}/dashboard?payment=error`,
            webhookUrl: `${BASE_URL}/api/bazik/webhook`, // Can be ngrok url for testing
        };

        const paymentResponse = await fetch("https://api.bazik.io/moncash/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify(paymentPayload),
        });

        const paymentData = await paymentResponse.json();
        console.log("📦 [BAZIK API RESPONSE]:", JSON.stringify(paymentData, null, 2));

        if (!paymentResponse.ok) {
            console.error("Bazik Payment Creation Error:", paymentData);
            return NextResponse.json({ error: "Failed to create payment link" }, { status: 502 });
        }

        // The API returns 'redirectUrl' or similar field. Assuming 'redirectUrl' based on request description.
        // User said: "return redirectUrl to frontend"
        // Let's log it to be safe during dev if needed, but for now return the whole object or just url.
        return NextResponse.json(paymentData);

    } catch (error: any) {
        console.error("Bazik API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
