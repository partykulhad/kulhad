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

    const requests = await convex.query(api.requests.getMyRequests, { userId });

    if (requests.length > 0) {
      return NextResponse.json({
        code: 200,
        message: "Requests Available",
        requestDetailsList: requests.map(request => ({
          requestId: request.requestId,
          requestStatus: request.kitchenStatus,
          requestDateTime: new Date(request.requestDateTime).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: true 
          }),
          srcAddress: request.srcAddress || null,
          machineId: request.machineId || null,
          srcLatitude: request.srcLatitude || 0.0,
          srcLongitude: request.srcLongitude || 0.0,
          srcContactName: request.srcContactName || "",
          srcContactNumber: request.srcContactNumber || null,
          dstAddress: request.dstAddress || null,
          dstLatitude: request.dstLatitude || 0.0,
          dstLongitude: request.dstLongitude || 0.0,
          dstContactName: request.dstContactName || null,
          dstContactNumber: request.dstContactNumber || null,
          assgnRefillerName: request.assignRefillerName || null,
          assignRefillerContactNumber: request.assignRefillerContactNumber || null
        }))
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: "No Request Available",
        requestDetailsList: []
      }, { status: 300 });
    }
  } catch (error) {
    console.error('Exception in getting requests:', error);
    return NextResponse.json({
      code: 400,
      message: "Exception Message",
      requestDetailsList: []
    }, { status: 400 });
  }
}

