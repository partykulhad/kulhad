import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { machineId, cup_present } = await req.json()

    // Validate required parameters
    if (!machineId) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameter: machineId" },
        { status: 400 }
      )
    }

    if (cup_present === undefined) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameter: cup_present" },
        { status: 400 }
      )
    }

    // Validate cup_present is a boolean
    if (typeof cup_present !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "cup_present must be a boolean value" },
        { status: 400 }
      )
    }

    // Call the Convex mutation
    const result = await convex.mutation(api.machines.updateCupStatus, {
      machineId,
      cup_present,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Failed to update cup status:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update cup status" },
      { status: 500 }
    )
  }
}
