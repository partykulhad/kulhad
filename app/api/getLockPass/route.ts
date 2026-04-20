import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { machineId, lockPass } = await req.json()

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: machineId" },
        { status: 400 },
      )
    }

    if (!lockPass) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: lockPass" },
        { status: 400 },
      )
    }

    if (typeof machineId !== "string" || typeof lockPass !== "string") {
      return NextResponse.json(
        { success: false, error: "machineId and lockPass must be string values" },
        { status: 400 },
      )
    }

    const result = await convex.query(api.machines.getLockPass, {
      machineId,
      lockPass,
    })

    return NextResponse.json(result, { status: result.status ?? 200 })
  } catch (error: any) {
    console.error("Failed to validate lock pass:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to validate lock pass" },
      { status: 500 },
    )
  }
}
