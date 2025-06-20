import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  console.log("Webhook received at:", new Date().toISOString());

  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
      console.log(`Header: ${key}: ${value}`);
    });

    const rawBody = await request.text();
    console.log("Webhook raw body length:", rawBody.length);

    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log("Webhook event type:", payload.event);
    } catch (e) {
      console.error("Failed to parse webhook payload:", e);
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Razorpay webhook secret not configured");
      console.warn("Proceeding without signature verification (not recommended for production)");
    } else {
      const razorpaySignature = request.headers.get("x-razorpay-signature");
      if (!razorpaySignature) {
        console.error("Razorpay signature missing");
        console.warn("Proceeding without signature verification (not recommended for production)");
      } else {
        const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
        if (expectedSignature !== razorpaySignature) {
          console.error("Signature verification failed");
          return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
        } else {
          console.log("Signature verification successful");
        }
      }
    }

    const event = payload.event;
    console.log("Processing event:", event);

    // Handle payment captured or authorized
    if (event === "payment.authorized" || event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      console.log("Payment ID:", payment.id);

      const paymentId = payment.id;
      const paymentNotes = payment.notes || {};

      console.log("Payment notes:", JSON.stringify(paymentNotes));

      const possibleTransactionIds = [
        payment.qr_code_id,
        paymentNotes.transactionId,
        paymentNotes.machineId,
      ].filter(Boolean);

      console.log("Possible transaction IDs:", possibleTransactionIds);

      let transactionFound = false;

      for (const transactionId of possibleTransactionIds) {
        if (!transactionId) continue;

        console.log("Checking transaction ID:", transactionId);

        try {
          let transaction = await convex.query(api.transactions.getTransactionByTxnId, {
            transactionId,
          });

          if (!transaction && transactionId === paymentNotes.transactionId) {
            transaction = await convex.query(api.transactions.getTransactionByCustomId, {
              customTransactionId: transactionId,
            });
          }

          if (transaction) {
            console.log("Found transaction with ID:", transaction._id);
            transactionFound = true;

            await convex.mutation(api.transactions.updateTransactionStatus, {
              id: transaction._id,
              status: "paid",
              paymentId: paymentId,
              vpa: payment.vpa || "",
            });

            console.log("Transaction updated successfully");
            break;
          }
        } catch (dbError) {
          console.error(`Error checking transaction ID ${transactionId}:`, dbError);
        }
      }

      if (!transactionFound) {
        console.error("Transaction not found for any possible ID");

        if (paymentNotes.machineId) {
          try {
            console.log("Creating fallback transaction for machine:", paymentNotes.machineId);

            const amount = payment.amount / 100;
            const cups = Number.parseInt(paymentNotes.numberOfCups || "1", 10);
            const amountPerCup = amount / cups;

            const fallbackTransactionId = `fallback-${paymentId}`;

            await convex.mutation(api.transactions.createTransaction, {
              transactionId: fallbackTransactionId,
              customTransactionId: paymentNotes.transactionId || fallbackTransactionId,
              imageUrl: "",
              amount: amount,
              cups: cups,
              amountPerCup: amountPerCup,
              machineId: paymentNotes.machineId,
              description: `Fallback transaction for payment ${paymentId}`,
              status: "paid",
              expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            });

            console.log("Fallback transaction created successfully");
          } catch (fallbackError) {
            console.error("Failed to create fallback transaction:", fallbackError);
          }
        }
      }
    }

    // Handle QR Code Closed → Expired
    else if (event === "qr_code.closed") {
      const qrCode = payload.payload.qr_code.entity;
      console.log("QR code closed:", qrCode.id);

      try {
        const transaction = await convex.query(api.transactions.getTransactionByTxnId, {
          transactionId: qrCode.id,
        });

        if (transaction && transaction.status !== "paid") {
          console.log("Found transaction to expire:", transaction._id);

          await convex.mutation(api.transactions.updateTransactionStatus, {
            id: transaction._id,
            status: "expired",
          });

          console.log("Transaction marked as expired");
        } else if (transaction) {
          console.log("Transaction already paid, not updating status");
        } else {
          console.log("No transaction found for QR code:", qrCode.id);
        }
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
      }
    }

    // Handle Payment Failed
    else if (event === "payment.failed") {
      const payment = payload.payload.payment.entity;
      console.log("Payment failed:", payment.id);

      const transactionId = payment.qr_code_id || payment.notes?.transactionId;
      if (!transactionId) {
        console.warn("No transaction ID found for failed payment");
      } else {
        try {
          const transaction = await convex.query(api.transactions.getTransactionByTxnId, {
            transactionId,
          });

          if (transaction && transaction.status !== "paid") {
            console.log("Updating failed transaction:", transaction._id);

            await convex.mutation(api.transactions.updateTransactionStatus, {
              id: transaction._id,
              status: "failed",
            });

            console.log("Transaction marked as failed");
          }
        } catch (err) {
          console.error("Error updating failed transaction:", err);
        }
      }
    }

    // Fallback for unhandled events
    else {
      console.log("Unhandled event type:", event);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 200 });
  }
}
