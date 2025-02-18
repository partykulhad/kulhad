import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { sendStatusNotification } from "@/lib/notificationHelper"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body

    // Validate required fields
    if (!userId || !requestId || !latitude || !longitude || !status || !dateAndTime) {
      return NextResponse.json(
        {
          code: 400,
          message: "Missing required parameters",
        },
        { status: 400 },
      )
    }
    // Validate status
    if (status !== "OrderReady") {
      return NextResponse.json(
        {
          code: 400,
          message: "Invalid status. Expected 'OrderReady'",
        },
        { status: 400 },
      )
    }
    // Call the Convex mutation to update status
    const result = await convex.mutation(api.requests.updateOrderReadyStatus, {
      userId,
      requestId,
      latitude,
      longitude,
      status,
      dateAndTime,
      isProceedNext,
      reason: reason || undefined,
    })

    if (result.success && result.nearbyAgentIds) {
      // Send notifications to all nearby agents
      const notificationPromises = result.nearbyAgentIds.map(async (agentId) => {
        const userDetails = await convex.query(api.appUsers.getUserById, { userId: agentId })
        if (userDetails && userDetails.fcmToken) {
          return sendStatusNotification(
            userDetails.fcmToken,
            requestId,
            "OrderReady",
            false, // isRefiller is false as this is for agents
          )
        }
        return { success: false, message: `FCM token not found for agent: ${agentId}` }
      })

      const notificationResults = await Promise.all(notificationPromises)

      // Log any failed notifications
      notificationResults.forEach((notificationResult, index) => {
        if (!notificationResult.success) {
          console.error(
            `Failed to send notification to agent ${result.nearbyAgentIds![index]}: ${notificationResult.message}`,
          )
        }
      })

      return NextResponse.json(
        {
          code: 200,
          message: "Order Ready status updated and notifications sent",
          nearbyAgentIds: result.nearbyAgentIds,
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json(
        {
          code: 300,
          message: "Failed to update Order Ready status",
        },
        { status: 300 },
      )
    }
  } catch (error) {
    console.error("Exception in updating Order Ready status:", error)
    return NextResponse.json(
      {
        code: 400,
        message: error instanceof Error ? error.message : "Exception in updating Order Ready status",
      },
      { status: 400 },
    )
  }
}

