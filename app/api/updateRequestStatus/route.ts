import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = body;

    if (!userId || !requestId || !latitude || !longitude || !status || !dateAndTime) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameters" },
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
      reason
    });

    if (result.success) {
      return NextResponse.json({
        code: 200,
        message: `${status} status updated`
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: `Failed to update ${status} status`
      }, { status: 300 });
    }
  } catch (error) {
    console.error('Exception in updating request status:', error);
    return NextResponse.json({
      code: 400,
      message: "Exception Message"
    }, { status: 400 });
  }
}

