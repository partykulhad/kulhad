import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"
import { firebaseAdmin } from "@/lib/firebaseAdmin"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Request Body:", body);

    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body;

    if (!userId || !requestId || !latitude || !longitude || !status || !dateAndTime || isProceedNext === undefined) {
      console.error("Missing required parameters");
      return NextResponse.json({ code: 400, message: "Missing required parameters" }, { status: 400 });
    }

    // Mutation
    const result = await convex.mutation(api.requests.updateRequestStatus, {
      userId,
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
      // Fetch the user's FCM token
      const user = await convex.query(api.appUsers.getUserById, { userId });
      console.log("Fetched User:", user);

      if (user && user.fcmToken) {
        // Prepare notification
        const message = {
          notification: {
            title: "Request Status Updated",
            body: `Your request status has been updated to: ${status}`,
          },
          token: user.fcmToken,
        };
        console.log("Notification Message:", message);

        try {
          // Send notification
          await firebaseAdmin.messaging().send(message);
          console.log("Notification sent successfully");
        } catch (error) {
          console.error("Error sending notification:", JSON.stringify(error));
        }
      } else {
        console.error("User not found or FCM token missing");
      }

      return NextResponse.json(
        {
          code: 200,
          message: result.message,
        },
        { status: 200 }
      );
    } else {
      console.error("Mutation not successful");
      return NextResponse.json(
        {
          code: 300,
          message: result.message,
        },
        { status: 300 }
      );
    }
  } catch (error) {
    console.error("Exception in updating status:", error);
    return NextResponse.json(
      {
        code: 400,
        message: "Exception Message",
      },
      { status: 400 }
    );
  }
}


