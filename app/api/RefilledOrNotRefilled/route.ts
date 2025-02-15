import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { sendStatusNotification } from "@/lib/notificationHelper"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("Received request body:", body)

    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body

    if (
      !userId ||
      !requestId ||
      latitude === undefined ||
      longitude === undefined ||
      !status ||
      !dateAndTime ||
      isProceedNext === undefined
    ) {
      console.error("Missing required parameters")
      return NextResponse.json({ code: 400, message: "Missing required parameters" }, { status: 400 })
    }

    // Check if reason is provided when not refilled
    if (!isProceedNext && !reason) {
      console.error("Reason is required when not refilled")
      return NextResponse.json({ code: 400, message: "Reason is required when not refilled" }, { status: 400 })
    }

    console.log("Calling updateRequestStatus mutation")
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
    console.log("updateRequestStatus mutation result:", result)

    if (result.success) {
      console.log("Fetching request details")
      const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId })
      console.log("Request details:", requestDetails)

      if (requestDetails && requestDetails.kitchenUserId) {
        let kitchenId: string
        if (Array.isArray(requestDetails.kitchenUserId)) {
          if (requestDetails.kitchenUserId.length === 0) {
            console.error("KitchenUserId array is empty")
            return NextResponse.json({ code: 400, message: "KitchenUserId array is empty" }, { status: 400 })
          }
          kitchenId = requestDetails.kitchenUserId[0]
        } else {
          kitchenId = requestDetails.kitchenUserId
        }

        console.log("Fetching kitchen user details")
        const kitchenUserDetails = await convex.query(api.appUsers.getUserById, { userId: kitchenId })
        console.log("Kitchen user details:", kitchenUserDetails)

        if (kitchenUserDetails && kitchenUserDetails.fcmToken) {
          console.log("Sending notification to kitchen user")
          const notificationResult = await sendStatusNotification(kitchenUserDetails.fcmToken, requestId, status, true) // Assuming true for isRefiller
          console.log("Notification result:", notificationResult)
          if (!notificationResult.success) {
            console.error("Failed to send notification:", notificationResult.message)
          }
        } else {
          console.log("Kitchen user FCM token not found")
        }
      } else {
        console.log("No kitchen user ID found in request details")
      }

      return NextResponse.json(
        {
          code: 200,
          message: result.message + " and notification sent to kitchen",
        },
        { status: 200 },
      )
    } else {
      console.error("Mutation not successful:", result.message)
      return NextResponse.json(
        {
          code: 300,
          message: result.message,
        },
        { status: 300 },
      )
    }
  } catch (error) {
    console.error("Exception in updating status:", error)
    return NextResponse.json(
      {
        code: 400,
        message: error instanceof Error ? error.message : "Exception in updating status and sending notification",
        error: error instanceof Error ? error.stack : undefined,
      },
      { status: 400 },
    )
  }
}

