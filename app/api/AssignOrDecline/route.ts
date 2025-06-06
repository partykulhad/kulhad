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

    // If status is "Assigned", we need to calculate the distance
    let distanceData = {}

    if (status === "Assigned") {
      // Fetch the request details to get the kitchen and destination coordinates
      const requestDetails = await convex.query(api.requests.getRequestByRequestI, { requestId })

      if (requestDetails) {
        // Get kitchen coordinates
        let kitchenCoordinates = null

        if (requestDetails.kitchenUserId) {
          // Handle both string and array cases for kitchenUserId
          const kitchenId = Array.isArray(requestDetails.kitchenUserId)
            ? requestDetails.kitchenUserId[0] // Take the first kitchen ID if it's an array
            : requestDetails.kitchenUserId

          if (kitchenId) {
            // Fetch kitchen details to get coordinates
            const kitchenDetails = await convex.query(api.kitchens.getKitchenByUserId, { userId: kitchenId })

            if (kitchenDetails && kitchenDetails.latitude && kitchenDetails.longitude) {
              kitchenCoordinates = {
                latitude: kitchenDetails.latitude,
                longitude: kitchenDetails.longitude,
              }
            }
          }
        }

        // Get destination coordinates from the request
        // According to your schema, use dstLatitude and dstLongitude
        const destinationCoordinates = {
          latitude: requestDetails.dstLatitude,
          longitude: requestDetails.dstLongitude,
        }

        // If we have all coordinates, calculate the distance
        if (kitchenCoordinates && destinationCoordinates.latitude && destinationCoordinates.longitude) {
          // Import the distance calculation function
          const { calculateTotalTripDistance } = await import("@/lib/distanceCalculator")

          // Calculate total trip distance
          const totalDistance = calculateTotalTripDistance(
            latitude, // Agent's current latitude
            longitude, // Agent's current longitude
            kitchenCoordinates.latitude,
            kitchenCoordinates.longitude,
            destinationCoordinates.latitude,
            destinationCoordinates.longitude,
          )

          // Add distance to the data to be sent to the mutation
          distanceData = { totalDistance }
        }
      }
    }

    const result = await convex.mutation(api.requests.updateAgentStatus, {
      userId,
      requestId,
      latitude,
      longitude,
      status,
      dateAndTime,
      isProceedNext,
      reason: reason || "",
      ...distanceData, // Include the calculated distance if available
    })

    if (result.success) {
      // Fetch the request details to get the kitchenUserId
      const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId })

      if (requestDetails && requestDetails.kitchenUserId) {
        // Handle both string and array cases for kitchenUserId
        const kitchenId = Array.isArray(requestDetails.kitchenUserId)
          ? requestDetails.kitchenUserId[0] // Take the first kitchen ID if it's an array
          : requestDetails.kitchenUserId

        if (kitchenId) {
          // Fetch kitchen user details
          const kitchenUserDetails = await convex.query(api.appUsers.getUserById, { userId: kitchenId })

          if (kitchenUserDetails && kitchenUserDetails.fcmToken) {
            // Send notification to kitchen user
            const notificationResult = await sendStatusNotification(
              kitchenUserDetails.fcmToken,
              requestId,
              status,
              true, // isRefiller is true because the agent (refiller) is updating the status
            )
            if (!notificationResult.success) {
              console.error("Failed to send notification:", notificationResult.message)
            }
          } else {
            console.log("Kitchen user FCM token not found")
          }
        } else {
          console.log("No valid kitchen ID found")
        }
      } else {
        console.log("No kitchen user ID found in request details")
      }

      return NextResponse.json(
        {
          code: 200,
          message: `${result.message} and notification sent to kitchen`,
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
    console.error("Exception in updating agent status:", error)
    return NextResponse.json(
      {
        code: 400,
        message: error instanceof Error ? error.message : "Exception in updating agent status and sending notification",
      },
      { status: 400 },
    )
  }
}
