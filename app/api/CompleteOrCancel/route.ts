import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { sendStatusNotification } from "@/lib/notificationHelper"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body

    if (!userId || !requestId || !latitude || !longitude || !status || !dateAndTime || isProceedNext === undefined) {
      return NextResponse.json({ code: 400, message: "Missing required parameters" }, { status: 400 })
    }

    // Check if reason is provided when cancelling
    if (!isProceedNext && !reason) {
      return NextResponse.json({ code: 400, message: "Reason is required when cancelling" }, { status: 400 })
    }

    const result = await convex.mutation(api.requests.updateCompleteOrCancel, {
      userId,
      requestId,
      latitude,
      longitude,
      status,
      dateAndTime,
      isProceedNext,
      reason: reason || "",
    })

    if (result.success) {
      // Fetch the request details to get the refillerUserId and kitchenUserId
      const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId })

      if (requestDetails) {
        const { refillerUserId, kitchenUserId } = requestDetails

        // Determine which user to notify based on who initiated the action
        let userToNotify: string | undefined

        if (userId === refillerUserId) {
          userToNotify = Array.isArray(kitchenUserId) ? kitchenUserId[0] : kitchenUserId
        } else {
          userToNotify = refillerUserId
        }

        if (userToNotify) {
          // Fetch user details for notification
          const userDetails = await convex.query(api.appUsers.getUserById, { userId: userToNotify })

          if (userDetails && userDetails.fcmToken) {
            // Send notification
            const notificationResult = await sendStatusNotification(
              userDetails.fcmToken,
              requestId,
              status,
              userId === refillerUserId, // isRefiller is true if the action was initiated by the refiller
            )
            if (!notificationResult.success) {
              console.error("Failed to send notification:", notificationResult.message)
            }
          } else {
            console.log(`FCM token not found for user: ${userToNotify}`)
          }
        } else {
          console.log("No user to notify found")
        }
      } else {
        console.log(`Request details not found for requestId: ${requestId}`)
      }

      const statusMessage =
        status === "Cancelled" || !isProceedNext ? "Cancelled status updated" : "Completed status updated"

      return NextResponse.json(
        {
          code: 200,
          message: `${statusMessage} and notification sent`,
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json(
        {
          code: 301,
          message: result.message,
        },
        { status: 301 },
      )
    }
  } catch (error) {
    console.error("Exception in updating status:", error)
    return NextResponse.json(
      {
        code: 400,
        message: error instanceof Error ? error.message : "Exception in updating status and sending notification",
      },
      { status: 400 },
    )
  }
}

