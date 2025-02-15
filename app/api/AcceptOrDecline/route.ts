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

    // Validate required parameters
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

    // Validate parameter types
    if (typeof latitude !== "number" || typeof longitude !== "number" || typeof isProceedNext !== "boolean") {
      return NextResponse.json({ code: 400, message: "Invalid parameter types" }, { status: 400 })
    }

    console.log("Calling Convex mutation updateKitchenStatus")
    const result = await convex.mutation(api.requests.updateKitchenStatus, {
      userId,
      requestId,
      latitude,
      longitude,
      status,
      dateAndTime,
      isProceedNext,
      reason: reason || "",
    })
    console.log("Convex mutation result:", result)

    if (result.success) {
      console.log("Fetching request details")
      const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId })
      console.log("Request details:", requestDetails)

      if (requestDetails && requestDetails.refillerUserId) {
        console.log("Fetching refiller user details")
        const refillerUserDetails = await convex.query(api.appUsers.getUserById, {
          userId: requestDetails.refillerUserId,
        })
        console.log("Refiller user details:", refillerUserDetails)

        if (refillerUserDetails && refillerUserDetails.fcmToken) {
          console.log("Sending notification to refiller")
          const notificationResult = await sendStatusNotification(
            refillerUserDetails.fcmToken,
            requestId,
            status,
            false, // isRefiller is false because the kitchen is updating the status
          )
          console.log("Notification result:", notificationResult)
          if (!notificationResult.success) {
            console.error("Failed to send notification:", notificationResult.message)
          }
        } else {
          console.log("No FCM token found for refiller")
        }
      } else {
        console.log("No refiller user ID found in request details")
      }

      return NextResponse.json(
        {
          code: 200,
          message: `${result.message} and notification sent to refiller`,
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
    console.error("Exception in updating kitchen status:", error)
    if (error instanceof Error) {
      return NextResponse.json(
        {
          code: 400,
          message: `An error occurred: ${error.message}`,
          data: null,
        },
        { status: 400 },
      )
    } else {
      return NextResponse.json(
        {
          code: 400,
          message: "An unknown error occurred while processing the request and sending notification",
          data: null,
        },
        { status: 400 },
      )
    }
  }
}

