import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import crypto from "crypto"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  console.log("Webhook received at:", new Date().toISOString())

  try {
    // Log all headers for debugging
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
      console.log(`Header: ${key}: ${value}`)
    })

    // Get the raw body
    const rawBody = await request.text()
    console.log("Webhook raw body:", rawBody)

    // Parse the webhook payload
    let payload
    try {
      payload = JSON.parse(rawBody)
      console.log("Webhook payload:", JSON.stringify(payload, null, 2))
    } catch (e) {
      console.error("Failed to parse webhook payload:", e)
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    // Get the Razorpay webhook secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("Razorpay webhook secret not configured")
      // Continue processing even without verification in development
      console.warn("Proceeding without signature verification (not recommended for production)")
    } else {
      // Get the Razorpay signature from the headers
      const razorpaySignature = request.headers.get("x-razorpay-signature")
      if (!razorpaySignature) {
        console.error("Razorpay signature missing")
        console.warn("Proceeding without signature verification (not recommended for production)")
      } else {
        // Verify the signature
        const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
        if (expectedSignature !== razorpaySignature) {
          console.error("Signature verification failed")
          console.error("Expected:", expectedSignature)
          console.error("Received:", razorpaySignature)
          return NextResponse.json({ error: "Signature verification failed" }, { status: 400 })
        } else {
          console.log("Signature verification successful")
        }
      }
    }

    const event = payload.event
    console.log("Processing event:", event)

    // Handle different webhook events
    if (event === "payment.authorized" || event === "payment.captured") {
      const payment = payload.payload.payment.entity
      console.log("Payment details:", payment)

      // Try to get transactionId from different possible locations in the notes
      const transactionId = payment.notes?.qr_code_id || payment.notes?.machineId || payment.notes?.transactionId

      if (transactionId) {
        console.log("Found transactionId/machineId:", transactionId)

        try {
          // First, check if the transaction exists
          const transaction = await convex.query(api.transactions.getTransactionByTxnId, {
            transactionId,
          })

          if (transaction) {
            console.log("Found existing transaction:", transaction._id)

            // Update the transaction with payment details
            await convex.mutation(api.transactions.updateTransactionStatus, {
              id: transaction._id,
              status: "paid",
              paymentId: payment.id,
              vpa: payment.vpa || "",
            })

            console.log("Transaction updated successfully")
          } else {
            console.log("Transaction not found, cannot update")
          }
        } catch (dbError) {
          console.error("Database operation failed:", dbError)
          // Continue processing to return 200 to Razorpay
        }
      } else {
        console.error("No transactionId/machineId found in payment notes:", payment.notes)
      }
    } else if (event === "qr_code.closed") {
      const qrCode = payload.payload.qr_code.entity
      console.log("QR code closed:", qrCode)

      try {
        // Get the transaction using the QR code ID as the transaction ID
        const transaction = await convex.query(api.transactions.getTransactionByTxnId, {
          transactionId: qrCode.id,
        })

        if (transaction && transaction.status !== "paid") {
          console.log("Found transaction to expire:", transaction._id)

          // Update transaction status to expired
          await convex.mutation(api.transactions.updateTransactionStatus, {
            id: transaction._id,
            status: "expired",
          })

          console.log("Transaction marked as expired")
        } else if (transaction) {
          console.log("Transaction already paid, not updating status")
        } else {
          console.log("No transaction found for QR code:", qrCode.id)
        }
      } catch (dbError) {
        console.error("Database operation failed:", dbError)
        // Continue processing to return 200 to Razorpay
      }
    } else {
      console.log("Unhandled event type:", event)
    }

    // Always return 200 to Razorpay to acknowledge receipt
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error processing webhook:", error)
    // Still return 200 to Razorpay to prevent retries
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 200 })
  }
}

