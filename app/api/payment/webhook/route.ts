import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Parse headers and raw body
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

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const razorpaySignature = request.headers.get("x-razorpay-signature");
      const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      if (!razorpaySignature || expectedSignature !== razorpaySignature) {
        return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
      }
    }

    // Utility to find and update transaction by possible IDs
    async function findAndUpdateTransaction(possibleIds: string[], newStatus: string, additionalData: Record<string, any> = {}) {
      let transactionFound = false;
      for (const id of possibleIds) {
        if (!id) continue;
        // Log the ID we are checking
        console.log("Checking transaction with ID:", id);

        let transaction = await convex.query(api.transactions.getTransactionByTxnId, { transactionId: id });
        if (!transaction) {
          transaction = await convex.query(api.transactions.getTransactionByCustomId, { customTransactionId: id });
        }
        if (transaction) {
          console.log("Found transaction:", transaction._id);
          transactionFound = true;
          await convex.mutation(api.transactions.updateTransactionStatus, {
            id: transaction._id,
            status: newStatus,
            ...additionalData,
          });
          break;
        }
      }
      if (!transactionFound) {
        console.warn("No transaction found for any of IDs:", possibleIds);
      }
      return transactionFound;
    }

    const event = payload.event;

    if (event === "payment.captured" || event === "payment.authorized") {
      const payment = payload.payload.payment.entity;
      const possibleIds = [payment.qr_code_id, payment.notes?.transactionId, payment.notes?.machineId].filter(Boolean);
      const transactionFound = await findAndUpdateTransaction(possibleIds, "paid", {
        paymentId: payment.id,
        vpa: payment.vpa || "",
      });
      if (!transactionFound && payment.notes?.machineId) {
        // Create fallback transaction
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
        console.log("Fallback transaction created:", fallbackTransactionId);
      }
    }
    else if (event === "payment.failed") {
      const payment = payload.payload.payment.entity;
      const possibleIds = [payment.qr_code_id, payment.notes?.transactionId].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "failed", {
        failureReason: payment.error_description || "Payment failed",
      });
    }
    else if (event === "payment.cancelled") {
      const payment = payload.payload.payment.entity;
      const possibleIds = [payment.qr_code_id, payment.notes?.transactionId].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "cancelled");
    }
    else if (event === "payment.refunded") {
      const payment = payload.payload.payment.entity;
      const possibleIds = [payment.qr_code_id, payment.notes?.transactionId].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "refunded", {
        refundId: payment.refund_id || "",
        refundStatus: payment.refund_status || "",
      });
    }
    else if (event === "qr_code.closed") {
      const qrCode = payload.payload.qr_code.entity;
      const possibleIds = [
        qrCode.id,
        qrCode.notes?.transactionId,
        qrCode.notes?.machineId
      ].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "closed");
    }
    else if (event === "qr_code.expired") {
      const qrCode = payload.payload.qr_code.entity;
      const possibleIds = [
        qrCode.id,
        qrCode.notes?.transactionId,
        qrCode.notes?.machineId
      ].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "expired");
    }
    else if (event === "qr_code.created") {
      const qrCode = payload.payload.qr_code.entity;
      const possibleIds = [
        qrCode.id,
        qrCode.notes?.transactionId,
        qrCode.notes?.machineId
      ].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "active");
    }
    else if (event === "invoice.expired") {
      const invoice = payload.payload.invoice.entity;
      const possibleIds = [invoice.notes?.transactionId, invoice.notes?.machineId].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "expired");
    }
    else if (event === "order.paid") {
      const order = payload.payload.order.entity;
      const possibleIds = [order.notes?.transactionId, order.notes?.machineId].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "paid");
    }
    else if (event === "subscription.cancelled") {
      const subscription = payload.payload.subscription.entity;
      const possibleIds = [subscription.notes?.transactionId, subscription.notes?.machineId].filter(Boolean);
      await findAndUpdateTransaction(possibleIds, "cancelled");
    }
    else {
      console.log("Unhandled event type:", event);
      console.log("Payload:", JSON.stringify(payload, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 200 });
  }
}
