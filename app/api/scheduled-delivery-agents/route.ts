import type { NextRequest } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { sendStatusNotification, isValidFCMToken } from "@/lib/notificationHelper"
import { NextResponse } from "next/server"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

async function handleScheduledDeliveryAgents(req: NextRequest) {
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
    const machines = await convex.query(api.machines.getAllActiveMachines)

    if (!machines || machines.length === 0) {
      return NextResponse.json({ code: 404, message: "No machines found" }, { status: 404 })
    }

    console.log(`Processing ${machines.length} machines for scheduled delivery agent requests`)

    // Process each machine
    const results = await Promise.all(
      machines.map(async (machine) => {
        try {
          console.log(`Processing machine: ${machine.id}`)

          // Create a request for this machine with OrderReady status
          const result = await convex.mutation(api.deliveryAgents.createOrderReadyRequest, {
            machineId: machine.id,
          })

          let notificationResults: any[] = []

          // Send notifications if request was created
          if (result.success && result.requestId && result.nearbyAgentIds && result.nearbyAgentIds.length > 0) {
            console.log(
              `Sending notifications for request ${result.requestId} to ${result.nearbyAgentIds.length} delivery agents`,
            )

            // Send notifications to all delivery agents
            const notificationPromises = result.nearbyAgentIds.map(async (agentId) => {
              try {
                const agentDetails = await convex.query(api.appUsers.getUserById, { userId: agentId })

                if (!agentDetails) {
                  console.warn(`Agent details not found for userId: ${agentId}`)
                  return {
                    agentId,
                    success: false,
                    message: `Agent details not found for user: ${agentId}`,
                  }
                }

                if (!agentDetails.fcmToken) {
                  console.warn(`FCM token not found for agent: ${agentId}`)
                  return {
                    agentId,
                    success: false,
                    message: `FCM token not found for agent: ${agentId}`,
                  }
                }

                // Validate FCM token format
                if (!isValidFCMToken(agentDetails.fcmToken)) {
                  console.warn(`Invalid FCM token format for agent: ${agentId}`)
                  return {
                    agentId,
                    success: false,
                    message: `Invalid FCM token format for agent: ${agentId}`,
                  }
                }

                const notificationResult = await sendStatusNotification(
                  agentDetails.fcmToken,
                  result.requestId!,
                  "OrderReady",
                  true, // isDeliveryAgent is true
                )

                return {
                  agentId,
                  success: notificationResult.success,
                  message: notificationResult.message,
                  shouldRemoveToken: notificationResult.shouldRemoveToken || false,
                }
              } catch (error) {
                console.error(`Error processing notification for agent ${agentId}:`, error)
                return {
                  agentId,
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
                  `Failed to send notification to agent ${notificationResult.agentId}: ${notificationResult.message}`,
                )

                // TODO: If shouldRemoveToken is true, you might want to update the user's FCM token in the database
                if (notificationResult.shouldRemoveToken) {
                  console.warn(`Consider removing invalid FCM token for agent: ${notificationResult.agentId}`)
                }
              } else {
                console.log(`Successfully sent notification to agent: ${notificationResult.agentId}`)
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
            searchDistance: result.searchDistance || 0,
            nearbyAgentsCount: result.nearbyAgentIds?.length || 0,
            notificationResults: notificationResults.map((nr) => ({
              agentId: nr.agentId,
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
            requestId: null,
            searchDistance: 0,
            nearbyAgentsCount: 0,
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

    // Calculate search distance statistics
    const searchDistanceStats = results.reduce(
      (stats, r) => {
        if (r.searchDistance > 0) {
          stats[`${r.searchDistance}km`] = (stats[`${r.searchDistance}km`] || 0) + 1
        }
        return stats
      },
      {} as Record<string, number>,
    )

    console.log(`Completed processing: ${successful} successful machines, ${failed} failed machines`)
    console.log(`Notifications: ${successfulNotifications}/${totalNotifications} successful`)
    console.log(`Search distance breakdown:`, searchDistanceStats)

    return NextResponse.json(
      {
        code: 200,
        message: `Processed ${results.length} machines: ${successful} successful, ${failed} failed. Notifications: ${successfulNotifications}/${totalNotifications} sent successfully.`,
        data: results,
        summary: {
          totalMachines: results.length,
          successfulMachines: successful,
          failedMachines: failed,
          totalNotifications,
          successfulNotifications,
          failedNotifications: totalNotifications - successfulNotifications,
          searchDistanceBreakdown: searchDistanceStats,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Exception in scheduled delivery agents:", error)
    if (error instanceof Error) {
      return NextResponse.json({ code: 500, message: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ code: 500, message: "An unexpected error occurred" }, { status: 500 })
    }
  }
}

// Handle GET requests (used by Vercel cron jobs)
export async function GET(req: NextRequest) {
  console.log("Delivery agents cron job triggered via GET request")
  return handleScheduledDeliveryAgents(req)
}

// Handle POST requests (for manual testing)
export async function POST(req: NextRequest) {
  console.log("Manual delivery agents request triggered via POST")
  return handleScheduledDeliveryAgents(req)
}
