import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// POST — Pi reports the ESP32's waterLevelLow flag here on every transition.
// waterLevelLow=true  → water tank is low, kiosk shows the maintenance page.
// waterLevelLow=false → tank was refilled, kiosk returns to normal.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { machineId, waterLevelLow, reportedAt } = body

    if (!machineId || typeof waterLevelLow !== "boolean") {
      return NextResponse.json(
        { success: false, error: "machineId and waterLevelLow (boolean) are required" },
        { status: 400 },
      )
    }

    const result = await convex.mutation(api.machines.updateWaterLevel, {
      machineId,
      waterLevelLow,
      reportedAt,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 })
    }

    if (waterLevelLow && !result.previousValue) {
      // TODO: wire up a real notification (push/email) once the audience is decided —
      // e.g. admin role, or whoever owns this machine's kitchen mapping.
      console.warn(`ALERT: Machine ${result.machineName} (${machineId}) has low water level`)
    }

    return NextResponse.json({
      success: true,
      machineId: result.machineId,
      machineName: result.machineName,
      previousValue: result.previousValue,
      waterLevelLow: result.waterLevelLow,
      waterLevelWentLowAt: result.waterLevelWentLowAt,
      waterLevelClearedAt: result.waterLevelClearedAt,
    })
  } catch (error) {
    console.error("Error updating water level:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// GET — dashboard/debug lookup of current waterLevelLow flag for a machine.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get("machineId")

    if (!machineId) {
      return NextResponse.json({ success: false, error: "machineId is required" }, { status: 400 })
    }

    const result = await convex.query(api.machines.getMachineWaterLevel, { machineId })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      machineId: result.machineId,
      machineName: result.machineName,
      waterLevelLow: result.waterLevelLow,
      waterLevelWentLowAt: result.waterLevelWentLowAt,
      waterLevelClearedAt: result.waterLevelClearedAt,
    })
  } catch (error) {
    console.error("Error getting water level:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
