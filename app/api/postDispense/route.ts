import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { transactionId, dispenseStatus } = await req.json()

    // Validate required parameters
    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: transactionId" },
        { status: 400 }
      )
    }

    if (!dispenseStatus) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: dispenseStatus" },
        { status: 400 }
      )
    }

    // Call the Convex mutation
    const result = await convex.mutation(api.transactions.updateDispenseStatus, {
      transactionId,
      dispenseStatus,
    })

    return NextResponse.json(
      { success: true, message: "Dispense status updated successfully", data: result },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Failed to update dispense status:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update dispense status" },
      { status: 500 }
    )
  }
}
