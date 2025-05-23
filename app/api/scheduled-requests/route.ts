import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { sendStatusNotification } from "@/lib/notificationHelper"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    // Check for authorization token (optional but recommended)
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ code: 401, message: "Invalid token" }, { status: 401 })
    }

    // Get all machines
    const machines = await convex.query(api.machines.list)

    if (!machines || machines.length === 0) {
      return NextResponse.json({ code: 404, message: "No machines found" }, { status: 404 })
    }

    // Process each machine
    const results = await Promise.all(
      machines.map(async (machine) => {
        try {
          // For each machine, create a request with canisterLevel set to 0 to ensure it triggers
          const result = await convex.mutation(api.canister.checkCanisterLevel, {
            machineId: machine.id,
            canisterLevel: 0, // Force request creation
          })

          // Send notifications if request was created
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
          }

          return {
            machineId: machine.id,
            success: result.success,
            requestId: result.requestId,
            message: result.message,
          }
        } catch (error) {
          console.error(`Error processing machine ${machine.id}:`, error)
          return {
            machineId: machine.id,
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
          }
        }
      }),
    )

    // Count successful and failed requests
    const successful = results.filter((r) => r.success).length
    const failed = results.length - successful

    return NextResponse.json(
      {
        code: 200,
        message: `Processed ${results.length} machines: ${successful} successful, ${failed} failed`,
        data: results,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Exception in scheduled requests:", error)
    if (error instanceof Error) {
      return NextResponse.json({ code: 500, message: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ code: 500, message: "An unexpected error occurred" }, { status: 500 })
    }
  }
}
