import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { sendStatusNotification } from "@/lib/notificationHelper";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Request Body:", body);

    const { requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body;

    if (!requestId || !latitude || !longitude || !status || !dateAndTime || isProceedNext === undefined) {
      console.error("Missing required parameters");
      return NextResponse.json({ code: 400, message: "Missing required parameters" }, { status: 400 });
    }

    if (status !== "PickedUp") {
      console.error("Invalid status");
      return NextResponse.json({ code: 400, message: "Invalid status. Expected 'PickedUp'" }, { status: 400 });
    }

    // Fetch the request details to get the kitchenUserId
    const requestDetails = await convex.query(api.requests.getRequestByRequestId, { requestId });

    if (!requestDetails || !requestDetails.kitchenUserId) {
      console.error("Request not found or kitchenUserId not available");
      return NextResponse.json({ code: 404, message: "Request not found or kitchenUserId not available" }, { status: 404 });
    }

    const kitchenUserId = requestDetails.kitchenUserId;

    const result = await convex.mutation(api.requests.updateRequestStatus, {
      userId: kitchenUserId, // Use kitchenUserId instead of userId
      requestId,
      latitude,
      longitude,
      status,
      dateAndTime,
      isProceedNext,
      reason: reason || "",
    });
    console.log("Mutation Result:", result);

    if (result.success) {
      const kitchenUserDetails = await convex.query(api.appUsers.getUserById, { userId: kitchenUserId });
      
      if (kitchenUserDetails && kitchenUserDetails.fcmToken) {
        const notificationResult = await sendStatusNotification(kitchenUserDetails.fcmToken, requestId, status);
        if (!notificationResult.success) {
          console.error("Failed to send notification:", notificationResult.message);
        }
      }
      return NextResponse.json(
        {
          code: 200,
          message: "Order picked up status updated and notification sent to kitchen",
        },
        { status: 200 }
      );
    } else {
      console.error("Mutation not successful");
      return NextResponse.json(
        {
          code: 300,
          message: result.message || "Failed to update picked up status",
        },
        { status: 300 }
      );
    }
  } catch (error) {
    console.error("Exception in updating picked up status:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        code: 400,
        message: "Exception in updating picked up status",
      },
      { status: 400 }
    );
  }
}