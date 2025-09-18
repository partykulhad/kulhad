import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { machineId, numberOfCups } = body

    // Validate machineId is required
    if (!machineId) {
      return NextResponse.json({ success: false, message: "machineId is required" }, { status: 400 })
    }

    if (numberOfCups === undefined || numberOfCups === null) {
      const result = await convex.query(api.machines.getMachineCups, {
        machineId,
      })

      if (result.success) {
        return NextResponse.json(result, { status: 200 })
      } else {
        return NextResponse.json(result, { status: 404 })
      }
    }

    // Validate numberOfCups is a positive number
    if (typeof numberOfCups !== "number" || numberOfCups <= 0) {
      return NextResponse.json({ success: false, message: "numberOfCups must be a positive number" }, { status: 400 })
    }

    // Call the Convex mutation to reduce cups count
    const result = await convex.mutation(api.machines.reduceCupsCount, {
      machineId,
      numberOfCups,
    })

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Error processing cups request:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
