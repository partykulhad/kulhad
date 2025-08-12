import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    // Step 1: Parse request body
    let body: any
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

    let scanLogs: any[]
    if (Array.isArray(body)) {
      scanLogs = body
    } else {
      scanLogs = [body]
    }

    // Step 2: Validate that we have scan data
    if (scanLogs.length === 0) {
      return NextResponse.json(
        {
          code: 400,
          message: "No scan data provided",
        },
        { status: 400 },
      )
    }

    // Step 3: Validate required fields for each scan log
    const requiredFields = ["scanId", "status", "scanType", "scanDateTime", "userId", "latitude", "longitude"]
    const validationErrors: string[] = []

    scanLogs.forEach((scanLog, index) => {
      const missingFields = requiredFields.filter((field) => !scanLog[field])

      if (missingFields.length > 0) {
        validationErrors.push(`Scan log ${index + 1}: Missing required fields: ${missingFields.join(", ")}`)
      }

      // Validate data types
      if (typeof scanLog.latitude !== "number" || typeof scanLog.longitude !== "number") {
        validationErrors.push(`Scan log ${index + 1}: Latitude and longitude must be numbers`)
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          code: 400,
          message: validationErrors.join("; "),
        },
        { status: 400 },
      )
    }

    // Step 4: Submit scan details for all logs
    try {
      const results = await Promise.all(
        scanLogs.map((scanLog) =>
          convex.mutation(api.canisters.submitDailyScan, {
            scanId: scanLog.scanId,
            status: scanLog.status,
            scanType: scanLog.scanType,
            scanDateTime: scanLog.scanDateTime,
            userId: scanLog.userId, // Renamed from kitchenId to userId
            latitude: scanLog.latitude,
            longitude: scanLog.longitude,
            orderId: scanLog.orderId || "", // Added optional orderId parameter
          }),
        ),
      )

      return NextResponse.json(
        {
          code: 200,
          message: `${results.length} scan(s) submitted successfully`,
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
