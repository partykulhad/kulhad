import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const machineId = searchParams.get("machineId")

    if (!machineId) {
      return NextResponse.json({ success: false, error: "Missing required parameter: machineId" }, { status: 400 })
    }

    // Call the Convex query
    const result = await convex.query(api.machines.getMachineData, { machineId })

    if (!result) {
      return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 })
    }

    // The kiosk hits this endpoint every 60s regardless of state — use it as a
    // heartbeat for live-status detection. Fire-and-forget: never block or fail
    // this response if the heartbeat write has a hiccup.
    convex.mutation(api.machines.touchLastSeen, { machineId }).catch((err) => {
      console.error("Failed to update lastSeenAt:", err)
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          machineId: result.machineId,
          price: result.price || "N/A",
          status: result.status,
          startTime: result.startTime,
          endTime: result.endTime,
          flushTimeMinutes: result.flushTimeMinutes || "N/A",
          mlToDispense: result.mlToDispense || "N/A",
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Failed to get machine data:", error)
    return NextResponse.json({ success: false, error: "Failed to get machine data" }, { status: 500 })
  }
}

