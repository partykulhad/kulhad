import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

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
    if (status === "NotSubmit" && !reason) {
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
      return NextResponse.json({
        code: 200,
        message: status === "Submit" ? "Submitted status updated" : "Not submitted status updated"
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: `Failed to update ${status === "Submit" ? "submitted" : "not submitted"} status`
      }, { status: 300 });
    }

  } catch (error) {
    console.error('Exception in updating submit status:', error);
    return NextResponse.json({
      code: 400,
      message: "Exception Message"
    }, { status: 400 });
  }
}

