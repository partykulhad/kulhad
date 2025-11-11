import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { machineId, temperature } = await req.json()

    // Validate required parameters
    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: machineId" },
        { status: 400 }
      )
    }

    if (temperature === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: temperature" },
        { status: 400 }
      )
    }

    // Call the Convex mutation with machineId and temperature
    const result = await convex.mutation(api.iot.addIoTData, {
      machineId,
      temperature,
    })

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (error) {
    console.error("Failed to add IoT temperature data:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add IoT temperature data" },
      { status: 500 }
    )
  }
}
