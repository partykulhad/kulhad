import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const machineId = searchParams.get("machineId")

    // Validate required parameter
    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: machineId" },
        { status: 400 }
      )
    }

    // Call the Convex query
    const result = await convex.query(api.machines.getCupStatus, {
      machineId,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      )
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Failed to get cup status:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get cup status" },
      { status: 500 }
    )
  }
}
