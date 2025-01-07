import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

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
      return NextResponse.json({
        code: 200,
        message: result.message
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
      message: "Exception Message"
    }, { status: 400 });
  }
}

