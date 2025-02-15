import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { sendStatusNotification } from "@/lib/notificationHelper"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body

    console.log("Received request body:", body)

    if (
      !userId ||
      !requestId ||
      latitude === undefined ||
      longitude === undefined ||
      !status ||
      !dateAndTime ||
      isProceedNext === undefined
    ) {
      return NextResponse.json({ code: 400, message: "Missing required parameters" }, { status: 400 })
    }

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

    console.log("Update request status result:", result)

    if (result.success) {
      // Fetch the request details to get the kitchenUserId
      const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId })
      console.log("Request details:", requestDetails)

      if (requestDetails && requestDetails.kitchenUserId) {
        let kitchenId: string
        if (Array.isArray(requestDetails.kitchenUserId)) {
          kitchenId = requestDetails.kitchenUserId[0] // Take the first kitchen ID if it's an array
        } else {
          kitchenId = requestDetails.kitchenUserId
        }

        // Fetch kitchen user details
        const kitchenUserDetails = await convex.query(api.appUsers.getUserById, { userId: kitchenId })
        console.log("Kitchen user details:", kitchenUserDetails)

        if (kitchenUserDetails && kitchenUserDetails.fcmToken) {
          // Send notification to kitchen user
          const notificationResult = await sendStatusNotification(kitchenUserDetails.fcmToken, requestId, status)
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

