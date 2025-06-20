import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import crypto from "crypto"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  console.log("Webhook received at:", new Date().toISOString())

  try {
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
      console.log(`Header: ${key}: ${value}`)
    })

    const rawBody = await request.text()
    console.log("Webhook raw body length:", rawBody.length)

    let payload
    try {
      payload = JSON.parse(rawBody)
      console.log("Webhook event type:", payload.event)
    } catch (e) {
      console.error("Failed to parse webhook payload:", e)
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("Razorpay webhook secret not configured")
      console.warn("Proceeding without signature verification (not recommended for production)")
    } else {
      const razorpaySignature = request.headers.get("x-razorpay-signature")
      if (!razorpaySignature) {
        console.error("Razorpay signature missing")
        console.warn("Proceeding without signature verification (not recommended for production)")
      } else {
        const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
        if (expectedSignature !== razorpaySignature) {
          console.error("Signature verification failed")
          return NextResponse.json({ error: "Signature verification failed" }, { status: 400 })
        } else {
          console.log("Signature verification successful")
        }
      }
    }

    const event = payload.event
    console.log("Processing event:", event)

    // Helper function to find and update transaction using your existing functions
    async function findAndUpdateTransaction(
      possibleIds: string[],
      newStatus: string,
      additionalData: Record<string, any> = {},
    ) {
      let transactionFound = false

      for (const transactionId of possibleIds) {
        if (!transactionId) continue

        console.log("Checking transaction ID:", transactionId)

        try {
          // Try to find by main transaction ID first
          let transaction = await convex.query(api.transactions.getTransactionByTxnId, {
            transactionId,
          })

          // If not found, try by custom transaction ID
          if (!transaction) {
            transaction = await convex.query(api.transactions.getTransactionByCustomId, {
              customTransactionId: transactionId,
            })
          }

          if (transaction) {
            console.log("Found transaction with ID:", transaction._id)
            transactionFound = true

            // Only update if the current status allows it (don't override 'paid' status unless updating to 'paid')
            if (transaction.status !== "paid" || newStatus === "paid") {
              await convex.mutation(api.transactions.updateTransactionStatus, {
                id: transaction._id,
                status: newStatus,
                ...additionalData,
              })

              console.log(`Transaction updated to status: ${newStatus}`)
            } else {
              console.log("Transaction already paid, not updating status")
            }
            break
          }
        } catch (dbError) {
          console.error(`Error checking transaction ID ${transactionId}:`, dbError)
        }
      }

      return transactionFound
    }

    // Handle successful payments
    if (event === "payment.authorized" || event === "payment.captured") {
      const payment = payload.payload.payment.entity
      console.log("Payment ID:", payment.id)

      const paymentId = payment.id
      const paymentNotes = payment.notes || {}

      console.log("Payment notes:", JSON.stringify(paymentNotes))

      const possibleTransactionIds = [payment.qr_code_id, paymentNotes.transactionId, paymentNotes.machineId].filter(
        Boolean,
      )

      console.log("Possible transaction IDs:", possibleTransactionIds)

      const transactionFound = await findAndUpdateTransaction(possibleTransactionIds, "paid", {
        paymentId: paymentId,
        vpa: payment.vpa || "",
      })

      // Create fallback transaction if not found
      if (!transactionFound && paymentNotes.machineId) {
        try {
          console.log("Creating fallback transaction for machine:", paymentNotes.machineId)

          const amount = payment.amount / 100
          const cups = Number.parseInt(paymentNotes.numberOfCups || "1", 10)
          const amountPerCup = amount / cups

          const fallbackTransactionId = `fallback-${paymentId}`

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
          })

          console.log("Fallback transaction created successfully")
        } catch (fallbackError) {
          console.error("Failed to create fallback transaction:", fallbackError)
        }
      }
    }

    // Handle QR Code Closed (Expired)
    else if (event === "qr_code.closed") {
      const qrCode = payload.payload.qr_code.entity
      console.log("QR code closed:", qrCode.id)

      await findAndUpdateTransaction([qrCode.id], "expired")
    }

    // Handle Payment Failed
    else if (event === "payment.failed") {
      const payment = payload.payload.payment.entity
      console.log("Payment failed:", payment.id)

      const possibleTransactionIds = [payment.qr_code_id, payment.notes?.transactionId].filter(Boolean)

      await findAndUpdateTransaction(possibleTransactionIds, "failed", {
        failureReason: payment.error_description || "Payment failed",
      })
    }

    // Handle Payment Cancelled
    else if (event === "payment.cancelled") {
      const payment = payload.payload.payment.entity
      console.log("Payment cancelled:", payment.id)

      const possibleTransactionIds = [payment.qr_code_id, payment.notes?.transactionId].filter(Boolean)

      await findAndUpdateTransaction(possibleTransactionIds, "cancelled")
    }

    // Handle QR Code Created (ensure status is active)
    else if (event === "qr_code.created") {
      const qrCode = payload.payload.qr_code.entity
      console.log("QR code created:", qrCode.id)

      await findAndUpdateTransaction([qrCode.id], "active")
    }

    // Handle Invoice Expired (if using invoices)
    else if (event === "invoice.expired") {
      const invoice = payload.payload.invoice.entity
      console.log("Invoice expired:", invoice.id)

      const possibleTransactionIds = [invoice.notes?.transactionId, invoice.notes?.machineId].filter(Boolean)

      if (possibleTransactionIds.length > 0) {
        await findAndUpdateTransaction(possibleTransactionIds, "expired")
      }
    }

    // Handle Order Paid (if using orders)
    else if (event === "order.paid") {
      const order = payload.payload.order.entity
      console.log("Order paid:", order.id)

      const possibleTransactionIds = [order.notes?.transactionId, order.notes?.machineId].filter(Boolean)

      if (possibleTransactionIds.length > 0) {
        await findAndUpdateTransaction(possibleTransactionIds, "paid")
      }
    }

    // Handle Subscription Cancelled (if using subscriptions)
    else if (event === "subscription.cancelled") {
      const subscription = payload.payload.subscription.entity
      console.log("Subscription cancelled:", subscription.id)

      const possibleTransactionIds = [subscription.notes?.transactionId, subscription.notes?.machineId].filter(Boolean)

      if (possibleTransactionIds.length > 0) {
        await findAndUpdateTransaction(possibleTransactionIds, "cancelled")
      }
    }

    // Fallback for unhandled events
    else {
      console.log("Unhandled event type:", event)
      console.log("Event payload:", JSON.stringify(payload, null, 2))
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 200 })
  }
}
