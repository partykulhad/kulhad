import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { sendStatusNotification } from "@/lib/notificationHelper";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body;

    if (!userId || !requestId || !latitude || !longitude || !status || !dateAndTime || isProceedNext === undefined) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Check if reason is provided when not refilled
    if (!isProceedNext && !reason) {
      return NextResponse.json(
        { code: 400, message: "Reason is required when not refilled" },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.requests.updateRequestStatus, {
      userId,
      requestId,
      latitude,
      longitude,
      status,
      dateAndTime,
      isProceedNext,
      reason: reason || ""
    });

    if (result.success) {
      // Fetch the request details to get the kitchenUserId
      const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId });

      if (requestDetails && requestDetails.kitchenUserId) {
        // Fetch kitchen user details
        const kitchenUserDetails = await convex.query(api.appUsers.getUserById, { userId: requestDetails.kitchenUserId });

        if (kitchenUserDetails && kitchenUserDetails.fcmToken) {
          // Send notification to kitchen user
          const notificationResult = await sendStatusNotification(kitchenUserDetails.fcmToken, requestId, status, true); // Assuming true for isRefiller
          if (!notificationResult.success) {
            console.error("Failed to send notification:", notificationResult.message);
          }
        }
      }

      return NextResponse.json({
        code: 200,
        message: result.message + " and notification sent to kitchen"
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: result.message
      }, { status: 300 });
    }

  } catch (error) {
    console.error('Exception in updating status:', error);
    return NextResponse.json({
      code: 400,
      message: "Exception in updating status and sending notification"
    }, { status: 400 });
  }
}