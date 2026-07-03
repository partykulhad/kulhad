/**
 * POST /api/rfid/auth/start
 *
 * Replaces the ukteawallet.com /api/rfid/auth/start endpoint.
 * The kiosk sends { cardId, keyNumber, machineId }.
 *
 * For dispensing cards   → returns { success, sessionId, apduCommand, cardCategory:"dispensing" }
 * For maintenance cards  → returns { success, cardCategory:"maintenance", action, message, duration }
 * For unknown/blocked    → returns { success:false, error }
 *
 * The "APDU command" in our simplified flow is just a server-generated
 * random challenge encoded as a hex string.  The kiosk treats it as an
 * opaque payload and echoes it back in /step2, letting us verify the
 * round-trip without requiring the kiosk to own an AES key or do crypto.
 */

import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { randomBytes, randomUUID } from "crypto";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, machineId } = body as {
      cardId: string;
      keyNumber?: number;
      machineId: string;
    };

    if (!cardId || !machineId) {
      return NextResponse.json(
        { success: false, error: "Missing cardId or machineId" },
        { status: 400 }
      );
    }

    const normalizedCardId = cardId.toUpperCase().trim();

    // Look up the card in the registry
    const tag = await convex.query(api.rfidTags.getByCardId, {
      cardId: normalizedCardId,
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Card not registered" },
        { status: 200 }        // 200 so the kiosk doesn't retry — just fail cleanly
      );
    }

    if (!tag.isActive) {
      return NextResponse.json(
        { success: false, error: "Card is deactivated" },
        { status: 200 }
      );
    }

    // Machine restriction check (if allowedMachines is set and non-empty)
    if (
      tag.allowedMachines &&
      tag.allowedMachines.length > 0 &&
      !tag.allowedMachines.includes(machineId)
    ) {
      return NextResponse.json(
        { success: false, error: "Card not authorized for this machine" },
        { status: 200 }
      );
    }

    // ── Maintenance card ──────────────────────────────────────────────────────
    if (tag.role === "maintenance") {
      // Touch last-used in background (fire-and-forget)
      convex.mutation(api.rfidTags.touchLastUsed, { cardId: normalizedCardId })
        .catch(() => {});

      return NextResponse.json({
        success: true,
        authenticated: true,
        cardCategory: "maintenance",
        action: tag.maintenanceAction || "solenoid_open",
        message: tag.maintenanceMessage || "Maintenance mode activated",
        duration: tag.maintenanceDuration ?? 10,
        cardId: normalizedCardId,
      });
    }

    // ── Dispensing card ───────────────────────────────────────────────────────
    if (tag.balance <= 0) {
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
        { status: 200 }
      );
    }

    // Generate a random challenge (acts as APDU1 in our simplified flow)
    const challenge = randomBytes(8).toString("hex").toUpperCase();
    const sessionId = randomUUID();

    await convex.mutation(api.rfidTags.createSession, {
      sessionId,
      cardId: normalizedCardId,
      machineId,
      challenge,
    });

    // The kiosk expects an "apduCommand" hex string — we send our challenge
    return NextResponse.json({
      success: true,
      sessionId,
      apduCommand: `90AA000008${challenge}00`,  // Wrap challenge in APDU-like envelope
      cardCategory: "dispensing",
      cardId: normalizedCardId,
    });
  } catch (err) {
    console.error("[rfid/auth/start]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
