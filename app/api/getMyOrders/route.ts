import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameter: userId" },
        { status: 400 }
      );
    }

    const orders = await convex.query(api.requests.getMyOrders, { userId });

    if (orders.length > 0) {
      const formattedOrders = orders.map(order => ({
        requestId: order.requestId || null,
        requestStatus: order.requestStatus || null,
        requestDateTime: order.requestDateTime || null,
        srcAddress: order.srcAddress || null,
        machineId: order.machineId || null,
        srcLatitude: order.srcLatitude || null,
        srcLongitude: order.srcLongitude || null,
        srcContactName: order.srcContactName || null,
        srcContactNumber: order.srcContactNumber || null,
        teaType:order.teaType ?? "",
        quantity:order.quantity ?? 0.0,
        dstAddress: order.dstAddress || null,
        dstLatitude: order.dstLatitude || null,
        dstLongitude: order.dstLongitude || null,
        dstContactName: order.dstContactName || null,
        dstContactNumber: order.dstContactNumber || null,
        assgnRefillerName: order.assignRefillerName || null,
        assignRefillerContactNumber: order.assignRefillerContactNumber || null
      }));

      return NextResponse.json({
        code: 200,
        message: "Orders Available",
        orderDetailsList: formattedOrders
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 302,
        message: "No Active Orders Available",
        orderDetailsList: []
      }, { status: 302 });
    }
  } catch (error) {
    console.error('Exception in getting orders:', error);
    return NextResponse.json({
      code: 400,
      message: "Exception Message",
      orderDetailsList: []
    }, { status: 400 });
  }
}

