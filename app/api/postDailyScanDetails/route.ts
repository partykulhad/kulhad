import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    // Step 1: Parse request body
    let body: { [x: string]: any; latitude: any; longitude: any; scanId: any; status: any; scanType: any; scanDateTime: any; kitchenId: any }
    try {
      body = await req.json()
    } catch (error) {
      return NextResponse.json(
        {
          code: 400,
          message: "Invalid JSON in request body",
        },
        { status: 400 },
      )
    }

    // Step 2: Validate required fields
    const requiredFields = ["scanId", "status", "scanType", "scanDateTime", "kitchenId", "latitude", "longitude"]
    const missingFields = requiredFields.filter((field) => !body[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          code: 400,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Step 3: Validate data types
    if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json(
        {
          code: 400,
          message: "Latitude and longitude must be numbers",
        },
        { status: 400 },
      )
    }

    // Step 4: Submit scan details
    try {
      const result = await convex.mutation(api.canisters.submitDailyScan, {
        scanId: body.scanId,
        status: body.status,
        scanType: body.scanType,
        scanDateTime: body.scanDateTime,
        kitchenId: body.kitchenId,
        latitude: body.latitude,
        longitude: body.longitude,
      })

      return NextResponse.json(
        {
          code: 200,
          message: "Scan submitted successfully",
        },
        { status: 200 },
      )
    } catch (error) {
      console.error("Failed to submit scan details:", error)
      return NextResponse.json(
        {
          code: 300,
          message: "Failed to submit scan details",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Exception in postDailyScanDetails:", error)
    return NextResponse.json(
      {
        code: 400,
        message: error instanceof Error ? error.message : "Exception occurred while submitting scan details",
      },
      { status: 500 },
    )
  }
}
