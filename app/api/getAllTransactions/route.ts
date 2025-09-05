import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    // Get all transactions from the database
    const transactions = await convex.query(api.transactions.getAllTransactions)

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
    })
  } catch (error) {
    console.error("Failed to fetch transactions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
      },
      { status: 500 },
    )
  }
}
