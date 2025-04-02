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
    console.log("Webhook raw body length:", rawBody.length)

    // Parse the webhook payload
    let payload
    try {
      payload = JSON.parse(rawBody)
      console.log("Webhook event type:", payload.event)
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
      console.log("Payment ID:", payment.id)

      // Extract payment details
      const paymentId = payment.id
      const paymentNotes = payment.notes || {}

      // Log all available notes for debugging
      console.log("Payment notes:", JSON.stringify(paymentNotes))

      // Try multiple possible fields for transaction ID
      const possibleTransactionIds = [
        payment.qr_code_id, // QR code ID directly from payment
        paymentNotes.transactionId, // Our custom transaction ID
        paymentNotes.machineId, // Machine ID as fallback
      ].filter(Boolean) // Remove undefined/null values

      console.log("Possible transaction IDs:", possibleTransactionIds)

      // Try each possible transaction ID
      let transactionFound = false

      for (const transactionId of possibleTransactionIds) {
        if (!transactionId) continue

        console.log("Checking transaction ID:", transactionId)

        try {
          // First try to find by transactionId (QR code ID)
          let transaction = await convex.query(api.transactions.getTransactionByTxnId, {
            transactionId,
          })

          // If not found and we're checking a custom ID, try by customTransactionId
          if (!transaction && transactionId === paymentNotes.transactionId) {
            transaction = await convex.query(api.transactions.getTransactionByCustomId, {
              customTransactionId: transactionId,
            })
          }

          if (transaction) {
            console.log("Found transaction with ID:", transaction._id)
            transactionFound = true

            // Update the transaction with payment details
            await convex.mutation(api.transactions.updateTransactionStatus, {
              id: transaction._id,
              status: "paid",
              paymentId: paymentId,
              vpa: payment.vpa || "",
            })

            console.log("Transaction updated successfully")
            break // Exit the loop once we've found and updated a transaction
          }
        } catch (dbError) {
          console.error(`Error checking transaction ID ${transactionId}:`, dbError)
        }
      }

      if (!transactionFound) {
        console.error("Transaction not found for any possible ID")

        // If we have a machineId, try to create a fallback transaction
        if (paymentNotes.machineId) {
          try {
            console.log("Creating fallback transaction for machine:", paymentNotes.machineId)

            const amount = payment.amount / 100 // Convert from paise to rupees
            const cups = Number.parseInt(paymentNotes.numberOfCups || "1", 10)
            const amountPerCup = amount / cups

            const fallbackTransactionId = `fallback-${paymentId}`

            await convex.mutation(api.transactions.createTransaction, {
              transactionId: fallbackTransactionId,
              customTransactionId: paymentNotes.transactionId || fallbackTransactionId,
              imageUrl: "", // No QR image for fallback
              amount: amount,
              cups: cups,
              amountPerCup: amountPerCup,
              machineId: paymentNotes.machineId,
              description: `Fallback transaction for payment ${paymentId}`,
              status: "paid", // Already paid
              expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
            })

            console.log("Fallback transaction created successfully")
          } catch (fallbackError) {
            console.error("Failed to create fallback transaction:", fallbackError)
          }
        }
      }
    } else if (event === "qr_code.closed") {
      const qrCode = payload.payload.qr_code.entity
      console.log("QR code closed:", qrCode.id)

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

