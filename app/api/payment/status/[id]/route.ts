import { NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

type Params = { id: string }

export async function GET(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const transactionId = context.params.id

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 })
    }

    // Get transaction status from Convex
    const transaction = await convex.query(api.transactions.getTransactionStatus, {
      transactionId
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      cups: transaction.cups,
      machineId: transaction.machineId,
      paymentId: transaction.paymentId,
      vpa: transaction.vpa,
      failureReason: transaction.failureReason,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      expiresAt: transaction.expiresAt,
    })
  } catch (error: unknown) {
    console.error("Error getting transaction status:", error)
    return NextResponse.json(
      {
        error: "Failed to get transaction status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

