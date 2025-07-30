import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(req: NextRequest) {
  try {
    // Step 1: Validate userId parameter
    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json(
        {
          code: 400,
          message: "Missing userId parameter",
          scanDetailsList: [],
        },
        { status: 400 },
      )
    }

    // Step 2: Validate date parameter
    const date = req.nextUrl.searchParams.get("date")
    if (!date) {
      return NextResponse.json(
        {
          code: 400,
          message: "Missing date parameter",
          scanDetailsList: [],
        },
        { status: 400 },
      )
    }

    // Step 3: Validate date format (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        {
          code: 400,
          message: "Invalid date format. Use DD/MM/YYYY",
          scanDetailsList: [],
        },
        { status: 400 },
      )
    }

    // Step 4: Fetch daily scan details
    let scanDetails
    try {
      scanDetails = await convex.query(api.canisters.getDailyScanDetails, {
        kitchenId: userId,
        date: date,
      })
    } catch (error) {
      return NextResponse.json(
        {
          code: 300,
          message: "Failed to get scan details",
          scanDetailsList: [],
        },
        { status: 500 },
      )
    }

    // Step 5: Return response based on data availability
    if (!scanDetails || scanDetails.length === 0) {
      return NextResponse.json(
        {
          code: 200,
          message: "No scan details available",
          scanDetailsList: [],
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        code: 200,
        message: "Scan details available",
        scanDetailsList: scanDetails,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Failed to fetch daily scan details:", error)
    return NextResponse.json(
      {
        code: 400,
        message: error instanceof Error ? error.message : "Exception occurred while fetching scan details",
        scanDetailsList: [],
      },
      { status: 500 },
    )
  }
}
