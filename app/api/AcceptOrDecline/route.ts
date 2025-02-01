import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { sendStatusNotification } from "@/lib/notificationHelper";
import admin from '@/lib/firebaseAdmin';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body;

    // Validate required parameters
    if (!userId || !requestId || latitude === undefined || longitude === undefined || !status || !dateAndTime || isProceedNext === undefined) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Validate parameter types
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || typeof isProceedNext !== 'boolean') {
      return NextResponse.json(
        { code: 400, message: "Invalid parameter types" },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.requests.updateKitchenStatus, {
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
      // Fetch the request details to get the refillerUserId
      const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId });

      if (requestDetails && requestDetails.refillerUserId) {
        // Fetch refiller user details
        const refillerUserDetails = await convex.query(api.appUsers.getUserById, { userId: requestDetails.refillerUserId });

        if (refillerUserDetails && refillerUserDetails.fcmToken) {
          // Send notification to refiller user
          const notificationResult = await sendStatusNotification(
            refillerUserDetails.fcmToken, 
            requestId, 
            status, 
            false // isRefiller is false because the kitchen is updating the status
          );
          if (!notificationResult.success) {
            console.error("Failed to send notification:", notificationResult.message);
          }
        }
      }

      return NextResponse.json({
        code: 200,
        message: `${result.message} and notification sent to refiller`
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: result.message
      }, { status: 300 });
    }

  } catch (error) {
    console.error('Exception in updating kitchen status:', error);
    return NextResponse.json({
      code: 400,
      message: "An error occurred while processing the request and sending notification",
      data: null
    }, { status: 400 });
  }
}