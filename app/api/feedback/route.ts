import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log(`[DEBUG] Feedback API request started at ${new Date().toISOString()}`)

  try {
    // Parse request body
    const body = await request.json()
    const { customTransactionId, rating } = body

    console.log(`[DEBUG] Received feedback request - Transaction ID: ${customTransactionId}, Rating: ${rating}`)

    // Validate required parameters
    if (!customTransactionId) {
      return NextResponse.json({ error: "Missing required parameter: customTransactionId" }, { status: 400 })
    }

    if (!rating) {
      return NextResponse.json({ error: "Missing required parameter: rating" }, { status: 400 })
    }

    // Validate rating value (assuming 1-5 scale)
    const ratingNumber = Number(rating)
    if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 })
    }

    // Find the transaction by customTransactionId
    console.log(`[DEBUG] Searching for transaction with customTransactionId: ${customTransactionId}`)

    try {
      const transaction = await convex.query(api.transactions.getTransactionByCustomId, {
        customTransactionId: customTransactionId,
      })

      if (!transaction) {
        return NextResponse.json(
          { error: `Transaction not found with customTransactionId: ${customTransactionId}` },
          { status: 404 },
        )
      }

      console.log(`[DEBUG] Found transaction: ${transaction._id}`)

      // Update the rating for the found transaction
      console.log(`[DEBUG] Updating rating to ${ratingNumber} for transaction: ${transaction._id}`)

      const updatedTransaction = await convex.mutation(api.transactions.updateTransactionRating, {
        transactionId: transaction._id,
        rating: ratingNumber,
      })

      console.log(`[DEBUG] Transaction rating updated successfully`)

      // Create response object
      const responseData = {
        success: true,
        message: "Feedback submitted successfully",
        customTransactionId: customTransactionId,
        rating: ratingNumber,
        transactionId: transaction._id,
        updatedAt: Date.now(),
      }

      console.log(`[DEBUG] Feedback request completed in ${Date.now() - startTime}ms`)
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
    console.error(`[DEBUG] Error processing feedback request after ${Date.now() - startTime}ms:`, error)

    return NextResponse.json(
      {
        error: "Failed to process feedback request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
