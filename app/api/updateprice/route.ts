import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { machineId, price } = await req.json()

    // Validate required parameters
    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: machineId" },
        { status: 400 }
      )
    }

    if (!price) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: price" },
        { status: 400 }
      )
    }

    // Validate price is a string
    if (typeof price !== "string") {
      return NextResponse.json(
        { success: false, error: "price must be a string value" },
        { status: 400 }
      )
    }

    // Call the Convex mutation
    const result = await convex.mutation(api.machines.updateMachinePrice, {
      machineId,
      price,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      )
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Failed to update machine price:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update machine price" },
      { status: 500 }
    )
  }
}
