import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import crypto from "crypto"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    // Get the Razorpay webhook secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("Razorpay webhook secret not configured")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    // Get the Razorpay signature from the headers
    const razorpaySignature = request.headers.get("x-razorpay-signature")
    if (!razorpaySignature) {
      console.error("Razorpay signature missing")
      return NextResponse.json({ error: "Signature missing" }, { status: 400 })
    }

    // Get the raw body
    const rawBody = await request.text()

    // Verify the signature
    const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex")

    if (expectedSignature !== razorpaySignature) {
      console.error("Signature verification failed")
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 })
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody)
    const event = payload.event

    // Handle different webhook events
    if (event === "payment.authorized") {
      const payment = payload.payload.payment.entity
      const qrCodeId = payment.notes?.qr_code_id

      if (qrCodeId) {
        // Update transaction in Convex
        await convex.mutation(api.transactions.updateTransactionPaymentDetails, {
          transactionId: qrCodeId,
          paymentId: payment.id,
          vpa: payment.vpa || "",
          status: "paid",
        })
      }
    } else if (event === "qr_code.closed") {
      const qrCode = payload.payload.qr_code.entity

      // Get the transaction
      const transaction = await convex.query(api.transactions.getTransactionByTxnId, {
        transactionId: qrCode.id,
      })

      if (transaction && transaction.status !== "paid") {
        // Update transaction status to expired
        await convex.mutation(api.transactions.updateTransactionStatus, {
          id: transaction._id,
          status: "expired",
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

