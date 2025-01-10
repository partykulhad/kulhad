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
        requestDateTime: order.requestDateTime 
          ? new Date(order.requestDateTime).toLocaleString('en-US', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })
          : null,
        srcAddress: order.srcAddress || null,
        machineId: order.machineId || null,
        srcLatitude: order.srcLatitude || null,
        srcLongitude: order.srcLongitude || null,
        srcContactName: order.srcContactName || null,
        srcContactNumber: order.srcContactNumber || null,
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
        code: 300,
        message: "No Request Available",
        orderDetailsList: []
      }, { status: 300 });
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

