/**
 * POST /api/rfid/auth/verify
 *
 * Replaces ukteawallet.com /api/rfid/auth/verify.
 * Kiosk sends { sessionId, cardResponse, machineId }.
 *
 * On success:
 *   - Deducts 1 cup from the card's balance
 *   - Deletes the session
 *   - Returns { success, authenticated, dispensed, remainingBalance, ... }
 */

import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, cardResponse, machineId } = body as {
      sessionId: string;
      cardResponse: string;
      machineId: string;
    };

    if (!sessionId || !machineId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Load session
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

    if (session.step !== 2) {
      return NextResponse.json(
        { success: false, error: "Invalid session step — call /step2 first" },
        { status: 200 }
      );
    }

    // Fetch the tag to confirm it is still valid
    const tag = await convex.query(api.rfidTags.getByCardId, {
      cardId: session.cardId,
    });

    if (!tag || !tag.isActive) {
      await convex.mutation(api.rfidTags.deleteSession, { sessionId });
      return NextResponse.json(
        { success: false, error: "Card deactivated or not found" },
        { status: 200 }
      );
    }

    if (tag.balance <= 0) {
      await convex.mutation(api.rfidTags.deleteSession, { sessionId });
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
        { status: 200 }
      );
    }

    // All checks passed — deduct one dispense and clean up session
    const { balance: newBalance } = await convex.mutation(
      api.rfidTags.consumeDispense,
      { cardId: session.cardId }
    );

    await convex.mutation(api.rfidTags.deleteSession, { sessionId });

    return NextResponse.json({
      success: true,
      authenticated: true,
      dispensed: true,
      remainingBalance: newBalance.toString(),
      businessUnitName: tag.label,
      machineLocation: machineId,
      cardId: session.cardId,
    });
  } catch (err) {
    console.error("[rfid/auth/verify]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
