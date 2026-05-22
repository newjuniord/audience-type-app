import { NextResponse } from "next/server";
import { claimGift } from "@/lib/gifts";

/**
 * POST /api/gifts/claim
 * Body: { giftId, userId, userEmail, userName, invitationCode? }
 * Retourne { result: ClaimResult }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { giftId, userId, userEmail, userName, invitationCode } = body;

        if (!giftId || !userId) {
            return NextResponse.json({ error: "giftId et userId sont requis" }, { status: 400 });
        }

        const result = await claimGift(giftId, userId, userEmail || "", userName || "", invitationCode);

        return NextResponse.json({ result });
    } catch (err: any) {
        console.error("❌ [gifts/claim]", err);
        return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
    }
}
