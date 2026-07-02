import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { machineId, version } = body

    if (!machineId || !version) {
      return NextResponse.json({ success: false, error: "Missing machineId or version" }, { status: 400 })
    }

    await convex.mutation(api.otaSuccess.reportSuccess, {
      machineId,
      version,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to report OTA success:", error)
    return NextResponse.json({ success: false, error: "Failed to report OTA success" }, { status: 500 })
  }
}
