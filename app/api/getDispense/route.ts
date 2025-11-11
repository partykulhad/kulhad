import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const transactionId = searchParams.get("transactionId")

    // Validate required parameter
    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: transactionId" },
        { status: 400 }
      )
    }

    // Call the Convex query
    const result = await convex.query(api.transactions.getDispenseStatus, {
      transactionId,
    })

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (error: any) {
    console.error("Failed to get dispense status:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get dispense status" },
      { status: 500 }
    )
  }
}
