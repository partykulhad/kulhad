import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get("machineId")

    // Validate required fields
    if (!machineId) {
      return NextResponse.json({ success: false, error: "machineId is required" }, { status: 400 })
    }

    // Call the Convex query to get machine status
    const result = await convex.query(api.machines.getMachineStatus, {
      machineId,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        machineId: result.machineId,
        status: result.status,
        machineName: result.machineName,
      },
    })
  } catch (error) {
    console.error("Error getting machine status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
