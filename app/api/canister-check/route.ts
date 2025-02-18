import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { sendStatusNotification } from "@/lib/notificationHelper"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { machineId, canisterLevel } = await req.json()

    if (!machineId || canisterLevel === undefined) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameters: machineId or canisterLevel" },
        { status: 400 },
      )
    }

    const result = await convex.mutation(api.canister.checkCanisterLevel, {
      machineId,
      canisterLevel,
    })

    if (result.success && result.requestId && result.kitchenUserIds) {
      // Send notifications to all kitchen users
      const notificationPromises = result.kitchenUserIds.map(async (userId) => {
        const userDetails = await convex.query(api.appUsers.getUserById, { userId })
        if (userDetails && userDetails.fcmToken) {
          return sendStatusNotification(
            userDetails.fcmToken,
            result.requestId!,
            "Pending",
            false, // isRefiller is false as this is a new request
          )
        }
        return { success: false, message: `FCM token not found for user: ${userId}` }
      })

      const notificationResults = await Promise.all(notificationPromises)

      // Log any failed notifications
      notificationResults.forEach((notificationResult, index) => {
        if (!notificationResult.success) {
          console.error(
            `Failed to send notification to user ${result.kitchenUserIds![index]}: ${notificationResult.message}`,
          )
        }
      })

      return NextResponse.json(
        {
          code: 200,
          message: "Request created, nearby kitchens identified, and notifications sent",
          data: {
            requestId: result.requestId,
            kitchenUserIds: result.kitchenUserIds,
          },
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json(
        {
          code: 400,
          message: result.message || "Failed to create request or identify kitchens",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Exception in checking canister level:", error)
    if (error instanceof Error) {
      return NextResponse.json({ code: 500, message: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ code: 500, message: "An unexpected error occurred" }, { status: 500 })
    }
  }
}

