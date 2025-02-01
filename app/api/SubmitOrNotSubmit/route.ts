import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { sendStatusNotification } from "@/lib/notificationHelper";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      userId, 
      requestId, 
      latitude, 
      longitude, 
      status,
      dateAndTime,
      isProceedNext,
      reason 
    } = body;

    // Validate required fields
    if (!userId || !requestId || !latitude || !longitude || !status || !dateAndTime) {
      return NextResponse.json(
        { 
          code: 400, 
          message: "Missing required parameters" 
        },
        { status: 400 }
      );
    }

    // Validate reason when not submitting
    if (status === "NotSubmitted" && !reason) {
      return NextResponse.json(
        {
          code: 400,
          message: "Reason is required when not submitting"
        },
        { status: 400 }
      );
    }

    // Call the Convex mutation to update status
    const result = await convex.mutation(api.requests.updateSubmitStatus, {
      userId,
      requestId,
      latitude,
      longitude,
      status,
      dateAndTime,
      isProceedNext,
      reason: reason || undefined
    });

    if (result.success) {
      // Fetch the request details to get the refillerUserId
      const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId });

      if (requestDetails && requestDetails.refillerUserId) {
        // Fetch refiller user details
        const refillerUserDetails = await convex.query(api.appUsers.getUserById, { userId: requestDetails.refillerUserId });

        if (refillerUserDetails && refillerUserDetails.fcmToken) {
          // Send notification to refiller user
          const notificationResult = await sendStatusNotification(refillerUserDetails.fcmToken, requestId, status, false); // false because it's not a refiller sending the notification
          if (!notificationResult.success) {
            console.error("Failed to send notification:", notificationResult.message);
          }
        }
      }

      return NextResponse.json({
        code: 200,
        message: `${status === "Submitted" ? "Submitted" : "Not submitted"} status updated and notification sent to refiller`
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: `Failed to update ${status === "Submitted" ? "submitted" : "not submitted"} status`
      }, { status: 300 });
    }

  } catch (error) {
    console.error('Exception in updating submit status:', error);
    return NextResponse.json({
      code: 400,
      message: "Exception in updating submit status and sending notification"
    }, { status: 400 });
  }
}