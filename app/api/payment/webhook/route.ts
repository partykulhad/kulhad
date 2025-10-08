import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Gather and parse headers and body
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const rawBody = await request.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Verify Razorpay webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const razorpaySignature = request.headers.get("x-razorpay-signature");
      const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      if (!razorpaySignature || expectedSignature !== razorpaySignature) {
        return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
      }
    }

    // Transaction matcher/updater utility
    async function findAndUpdateTransaction(possibleIds: string[], newStatus: string, additionalData: Record<string, any> = {}) {
      let transactionFound = false;
      for (const transactionId of possibleIds) {
        if (!transactionId) continue;
        let transaction = await convex.query(api.transactions.getTransactionByTxnId, { transactionId });
        if (!transaction) {
          transaction = await convex.query(api.transactions.getTransactionByCustomId, { customTransactionId: transactionId });
        }
        if (transaction) {
          transactionFound = true;
          await convex.mutation(api.transactions.updateTransactionStatus, {
            id: transaction._id,
            status: newStatus,
            ...additionalData,
          });
          break;
        }
      }
      return transactionFound;
    }

    const event = payload.event;

    // ===== STATUS MAPPING BY EVENT =====

    // Payment/Capture/Authorize
    if (event === "payment.captured" || event === "payment.authorized") {
      const payment = payload.payload.payment.entity;
      const possibleTransactionIds = [payment.qr_code_id, payment.notes?.transactionId, payment.notes?.machineId].filter(Boolean);
      const transactionFound = await findAndUpdateTransaction(possibleTransactionIds, "paid", {
        paymentId: payment.id,
        vpa: payment.vpa || "",
      });
      // Fallback: create if not found
      if (!transactionFound && payment.notes?.machineId) {
        const amount = payment.amount / 100;
        const cups = Number.parseInt(payment.notes.numberOfCups || "1", 10);
        const amountPerCup = amount / cups;
        const fallbackTransactionId = `fallback-${payment.id}`;
        await convex.mutation(api.transactions.createTransaction, {
          transactionId: fallbackTransactionId,
          customTransactionId: payment.notes.transactionId || fallbackTransactionId,
          imageUrl: "",
          amount,
          cups,
          amountPerCup,
          machineId: payment.notes.machineId,
          description: `Fallback transaction for payment ${payment.id}`,
          status: "paid",
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });
      }
    }
    // Payment failed
    else if (event === "payment.failed") {
      const payment = payload.payload.payment.entity;
      const possibleTransactionIds = [payment.qr_code_id, payment.notes?.transactionId].filter(Boolean);
      await findAndUpdateTransaction(possibleTransactionIds, "failed", {
        failureReason: payment.error_description || "Payment failed",
      });
    }
    // Payment cancelled
    else if (event === "payment.cancelled") {
      const payment = payload.payload.payment.entity;
      const possibleTransactionIds = [payment.qr_code_id, payment.notes?.transactionId].filter(Boolean);
      await findAndUpdateTransaction(possibleTransactionIds, "cancelled");
    }
    // Payment refunded
    else if (event === "payment.refunded") {
      const payment = payload.payload.payment.entity;
      const possibleTransactionIds = [payment.qr_code_id, payment.notes?.transactionId].filter(Boolean);
      await findAndUpdateTransaction(possibleTransactionIds, "refunded", {
        refundId: payment.refund_id || "",
        refundStatus: payment.refund_status || "",
      });
    }

    // QR code closed
    else if (event === "qr_code.closed") {
      const qrCode = payload.payload.qr_code.entity;
      await findAndUpdateTransaction([qrCode.id], "closed");
    }
    // QR code expired
    else if (event === "qr_code.expired") {
      const qrCode = payload.payload.qr_code.entity;
      await findAndUpdateTransaction([qrCode.id], "expired");
    }
    // QR code created/active
    else if (event === "qr_code.created") {
      const qrCode = payload.payload.qr_code.entity;
      await findAndUpdateTransaction([qrCode.id], "active");
    }

    // Invoice expired
    else if (event === "invoice.expired") {
      const invoice = payload.payload.invoice.entity;
      const possibleTransactionIds = [invoice.notes?.transactionId, invoice.notes?.machineId].filter(Boolean);
      await findAndUpdateTransaction(possibleTransactionIds, "expired");
    }

    // Order paid
    else if (event === "order.paid") {
      const order = payload.payload.order.entity;
      const possibleTransactionIds = [order.notes?.transactionId, order.notes?.machineId].filter(Boolean);
      await findAndUpdateTransaction(possibleTransactionIds, "paid");
    }

    // Subscription cancelled
    else if (event === "subscription.cancelled") {
      const subscription = payload.payload.subscription.entity;
      const possibleTransactionIds = [subscription.notes?.transactionId, subscription.notes?.machineId].filter(Boolean);
      await findAndUpdateTransaction(possibleTransactionIds, "cancelled");
    }

    // Fallback for unhandled events (optional: log/unhandled handler)

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 200 });
  }
}
