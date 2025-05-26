import type { NextRequest } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { sendStatusNotification, isValidFCMToken } from "@/lib/notificationHelper"
import { NextResponse } from "next/server"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

async function handleScheduledRequest(req: NextRequest) {
  try {
    // Check for authorization token
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

    console.log(`Processing ${machines.length} machines for scheduled requests`)

    // Process each machine
    const results = await Promise.all(
      machines.map(async (machine) => {
        try {
          console.log(`Processing machine: ${machine.id}`)

          // For each machine, create a request with canisterLevel set to 0 to ensure it triggers
          const result = await convex.mutation(api.canister.checkCanisterLevel, {
            machineId: machine.id,
            canisterLevel: 0, // Force request creation
          })

          let notificationResults: any[] = []

          // Send notifications if request was created
          if (result.success && result.requestId && result.kitchenUserIds && result.kitchenUserIds.length > 0) {
            console.log(
              `Sending notifications for request ${result.requestId} to ${result.kitchenUserIds.length} kitchen users`,
            )

            // Send notifications to all kitchen users
            const notificationPromises = result.kitchenUserIds.map(async (userId) => {
              try {
                const userDetails = await convex.query(api.appUsers.getUserById, { userId })

                if (!userDetails) {
                  console.warn(`User details not found for userId: ${userId}`)
                  return {
                    userId,
                    success: false,
                    message: `User details not found for user: ${userId}`,
                  }
                }

                if (!userDetails.fcmToken) {
                  console.warn(`FCM token not found for user: ${userId}`)
                  return {
                    userId,
                    success: false,
                    message: `FCM token not found for user: ${userId}`,
                  }
                }

                // Validate FCM token format
                if (!isValidFCMToken(userDetails.fcmToken)) {
                  console.warn(`Invalid FCM token format for user: ${userId}`)
                  return {
                    userId,
                    success: false,
                    message: `Invalid FCM token format for user: ${userId}`,
                  }
                }

                const notificationResult = await sendStatusNotification(
                  userDetails.fcmToken,
                  result.requestId!,
                  "Pending",
                  false, // isRefiller is false as this is a new request
                )

                return {
                  userId,
                  success: notificationResult.success,
                  message: notificationResult.message,
                  shouldRemoveToken: notificationResult.shouldRemoveToken || false,
                }
              } catch (error) {
                console.error(`Error processing notification for user ${userId}:`, error)
                return {
                  userId,
                  success: false,
                  message: error instanceof Error ? error.message : "Unknown error",
                }
              }
            })

            notificationResults = await Promise.all(notificationPromises)

            // Log notification results
            notificationResults.forEach((notificationResult) => {
              if (!notificationResult.success) {
                console.error(
                  `Failed to send notification to user ${notificationResult.userId}: ${notificationResult.message}`,
                )

                // TODO: If shouldRemoveToken is true, you might want to update the user's FCM token in the database
                if (notificationResult.shouldRemoveToken) {
                  console.warn(`Consider removing invalid FCM token for user: ${notificationResult.userId}`)
                }
              } else {
                console.log(`Successfully sent notification to user: ${notificationResult.userId}`)
              }
            })
          } else {
            console.log(`No notifications to send for machine ${machine.id}: ${result.message}`)
          }

          return {
            machineId: machine.id,
            success: result.success,
            requestId: result.requestId,
            message: result.message,
            notificationResults: notificationResults.map((nr) => ({
              userId: nr.userId,
              success: nr.success,
              message: nr.message,
            })),
          }
        } catch (error) {
          console.error(`Error processing machine ${machine.id}:`, error)
          return {
            machineId: machine.id,
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
            notificationResults: [],
          }
        }
      }),
    )

    // Count successful and failed requests
    const successful = results.filter((r) => r.success).length
    const failed = results.length - successful

    // Count notification statistics
    const totalNotifications = results.reduce((sum, r) => sum + r.notificationResults.length, 0)
    const successfulNotifications = results.reduce(
      (sum, r) => sum + r.notificationResults.filter((nr) => nr.success).length,
      0,
    )

    console.log(`Completed processing: ${successful} successful requests, ${failed} failed requests`)
    console.log(`Notifications: ${successfulNotifications}/${totalNotifications} successful`)

    return NextResponse.json(
      {
        code: 200,
        message: `Processed ${results.length} machines: ${successful} successful, ${failed} failed. Notifications: ${successfulNotifications}/${totalNotifications} sent successfully.`,
        data: results,
        summary: {
          totalMachines: results.length,
          successfulRequests: successful,
          failedRequests: failed,
          totalNotifications,
          successfulNotifications,
          failedNotifications: totalNotifications - successfulNotifications,
        },
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

// Handle GET requests (used by Vercel cron jobs)
export async function GET(req: NextRequest) {
  console.log("Cron job triggered via GET request")
  return handleScheduledRequest(req)
}

// Handle POST requests (for manual testing)
export async function POST(req: NextRequest) {
  console.log("Manual request triggered via POST")
  return handleScheduledRequest(req)
}
