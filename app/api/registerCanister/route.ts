import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json()

    // Validate required fields
    const requiredFields = ["kitchenId", "status", "scanType", "latitude", "longitude"]
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

    // Validate data types
    if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json(
        {
          code: 400,
          message: "Latitude and longitude must be numbers",
        },
        { status: 400 },
      )
    }

    try {
      // Register canister
      const result = await convex.mutation(api.canisters.registerCanister, body)

      return NextResponse.json(
        {
          code: 200,
          message: "Canister registered successfully",
          scanId: result.scanId,
        },
        { status: 200 },
      )
    } catch (error) {
      return NextResponse.json(
        {
          code: 300,
          message: error instanceof Error ? error.message : "Failed to register canister",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        code: 400,
        message: "Exception occurred while registering canister",
      },
      { status: 500 },
    )
  }
}
