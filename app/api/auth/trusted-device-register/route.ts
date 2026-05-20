import { NextResponse } from "next/server";
import { registerTrustedDevice } from "@/lib/trusted-device";

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: "userId requis" }, { status: 400 });
        }

        const response = NextResponse.json({ success: true });
        await registerTrustedDevice(userId, req, response);
        return response;
    } catch (error: any) {
        console.error("Error in trusted-device-register:", error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
