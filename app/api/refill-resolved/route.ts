import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// POST — Pi calls this once cups go back above CANISTER_ALERT_THRESHOLD,
// closing any still-open refill request(s) for this machine so the
// dashboard's Refill Requests alert clears automatically.
export async function POST(request: NextRequest) {
  try {
    const { machineId } = await request.json()

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "machineId is required" },
        { status: 400 },
      )
    }

    const result = await convex.mutation(api.canister.resolveOpenRequests, { machineId })

    return NextResponse.json({ success: true, resolvedCount: result.resolvedCount })
  } catch (error) {
    console.error("Error resolving refill requests:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
