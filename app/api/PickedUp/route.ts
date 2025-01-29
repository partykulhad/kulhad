import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("Request Body:", body)

    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body

    if (!userId || !requestId || !latitude || !longitude || !status || !dateAndTime || isProceedNext === undefined) {
      console.error("Missing required parameters")
      return NextResponse.json({ code: 400, message: "Missing required parameters" }, { status: 400 })
    }

    // Validate status
    if (status !== "PickedUp") {
      console.error("Invalid status")
      return NextResponse.json({ code: 400, message: "Invalid status. Expected 'PickedUp'" }, { status: 400 })
    }

    // Mutation
    const result = await convex.mutation(api.requests.updateRequestStatus, {
      userId,
      requestId,
      latitude,
      longitude,
      status,
      dateAndTime,
      isProceedNext,
      reason: reason || "",
    })
    console.log("Mutation Result:", result)

    if (result.success) {
      return NextResponse.json(
        {
          code: 200,
          message: "Order picked up status updated",
        },
        { status: 200 },
      )
    } else {
      console.error("Mutation not successful")
      return NextResponse.json(
        {
          code: 300,
          message: result.message || "Failed to update picked up status",
        },
        { status: 300 },
      )
    }
  } catch (error) {
    console.error("Exception in updating picked up status:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        code: 400,
        message: "Exception in updating picked up status",
      },
      { status: 400 },
    )
  }
}

