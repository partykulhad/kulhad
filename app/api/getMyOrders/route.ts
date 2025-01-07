import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameter: agentUserId" },
        { status: 400 }
      );
    }

    const orders = await convex.query(api.requests.getMyOrders, { userId });

    if (orders.length > 0) {
      return NextResponse.json({
        code: 200,
        message: "Orders Available",
        ordersDetailsList: orders
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: "No Request Available",
        ordersDetailsList: []
      }, { status: 300 });
    }
  } catch (error) {
    console.error('Exception in getting orders:', error);
    return NextResponse.json({
      code: 400,
      message: "Exception Message",
      ordersDetailsList: []
    }, { status: 400 });
  }
}

