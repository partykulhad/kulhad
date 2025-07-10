import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest, { params }: { params: { transactionId: string } }) {
  const startTime = Date.now()
  console.log(`[DEBUG] Transaction status GET request started at ${new Date().toISOString()}`)

  try {
    const { transactionId } = params

    console.log(`[DEBUG] Received status check request for Transaction ID: ${transactionId}`)

    // Validate required parameters
    if (!transactionId) {
      return NextResponse.json({ error: "Missing Transaction ID in URL path" }, { status: 400 })
    }

    // Get transaction status from database
    console.log(`[DEBUG] Querying transaction status for ID: ${transactionId}`)

    try {
      const transactionStatus = await convex.query(api.transactions.getTransactionStatus, {
        transactionId: transactionId,
      })

      if (!transactionStatus) {
        return NextResponse.json(
          { error: `Transaction not found with transactionId: ${transactionId}` },
          { status: 404 },
        )
      }

      console.log(`[DEBUG] Found transaction with status: ${transactionStatus.status}`)

      // Determine message based on status
      let message = "unknown"
      if (transactionStatus.status === "paid") {
        message = "paid"
      } else if (transactionStatus.status === "active") {
        message = "active"
      } else if (transactionStatus.status === "expired" || transactionStatus.status === "closed") {
        message = "expired"
      } else {
        message = transactionStatus.status // Return the actual status if it's something else
      }

      // Create response object
      const responseData = {
        success: true,
        message: message,
        transactionId: transactionStatus.transactionId,
        customTransactionId: transactionStatus.customTransactionId,
        status: transactionStatus.status,
        amount: transactionStatus.amount,
        machineId: transactionStatus.machineId,
        cups: transactionStatus.cups,
        description: transactionStatus.description,
        createdAt: transactionStatus.createdAt,
        expiresAt: transactionStatus.expiresAt,
        // isExpired: transactionStatus.isExpired,
        rating: transactionStatus.rating,
        processingTime: `${Date.now() - startTime}ms`,
      }

      console.log(`[DEBUG] Transaction status request completed in ${Date.now() - startTime}ms`)
      return NextResponse.json(responseData)
    } catch (dbError) {
      console.error(`[DEBUG] Database error:`, dbError)
      return NextResponse.json(
        {
          error: "Database operation failed",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }
  } catch (error: unknown) {
    console.error(`[DEBUG] Error processing transaction status request after ${Date.now() - startTime}ms:`, error)

    return NextResponse.json(
      {
        error: "Failed to process transaction status request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
