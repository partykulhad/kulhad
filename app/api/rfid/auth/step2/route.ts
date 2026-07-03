/**
 * POST /api/rfid/auth/step2
 *
 * Replaces ukteawallet.com /api/rfid/auth/step2.
 * Kiosk sends { sessionId, cardResponse }.
 *
 * In the real ukteawallet flow, cardResponse is Enc(RndB) from the physical
 * DESFire card.  In our simplified Kulhad flow we don't have the card's AES
 * key, so the kiosk's rfid_aes_auth.py is updated to pass through a simple
 * echo challenge.  The session advances to step 2, and we return a second
 * "APDU command" (the challenge XOR'd with a constant so we have something
 * to verify in /verify).
 */

import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, cardResponse } = body as {
      sessionId: string;
      cardResponse: string;
    };

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing sessionId" },
        { status: 400 }
      );
    }

    // Load the session
    const session = await convex.query(api.rfidTags.getSession, { sessionId });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found or expired" },
        { status: 200 }
      );
    }

    if (Date.now() > session.expiresAt) {
      await convex.mutation(api.rfidTags.deleteSession, { sessionId });
      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 200 }
      );
    }

    if (session.step !== 1) {
      return NextResponse.json(
        { success: false, error: "Invalid session step" },
        { status: 200 }
      );
    }

    // Advance to step 2
    await convex.mutation(api.rfidTags.advanceSession, {
      sessionId,
      step: 2,
    });

    // Return a second APDU-like command — the kiosk echoes this back in /verify
    // We embed the sessionId so /verify can do a round-trip check.
    const apdu2 = `90AF000010${Buffer.from(sessionId.replace(/-/g, "").slice(0, 16)).toString("hex").toUpperCase()}00`;

    return NextResponse.json({
      success: true,
      apduCommand: apdu2,
    });
  } catch (err) {
    console.error("[rfid/auth/step2]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
