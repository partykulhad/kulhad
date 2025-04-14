import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ code: 400, message: "Missing required parameter: userId" }, { status: 400 })
    }

    const requests = await convex.query(api.requests.getMyRequestsHistory, { userId })

    if (requests.length > 0) {
      return NextResponse.json(
        {
          code: 200,
          message: "Request History Available",
          requestHistoryList: requests.map((request) => ({
            requestId: request.requestId,
            requestStatus: request.requestStatus,
            requestDateTime: request.requestDateTime,
            srcAddress: request.srcAddress,
            machineId: request.machineId,
            teaType:request.teaType ?? "",
            quantity:request.quantity ?? 0.0,
            srcLatitude: request.srcLatitude,
            srcLongitude: request.srcLongitude,
            srcContactName: request.srcContactName,
            srcContactNumber: request.srcContactNumber,
            dstAddress: request.dstAddress,
            dstLatitude: request.dstLatitude,
            dstLongitude: request.dstLongitude,
            dstContactName: request.dstContactName,
            dstContactNumber: request.dstContactNumber,
            assgnRefillerName: request.assgnRefillerName,
            assignRefillerContactNumber: request.assignRefillerContactNumber,
          })),
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json(
        {
          code: 302,
          message: "No Request History Available",
          requestHistoryList: [],
        },
        { status: 302 },
      )
    }
  } catch (error) {
    console.error("Exception in getting request history:", error)
    return NextResponse.json(
      {
        code: 400,
        message: "Exception Message",
        requestHistoryList: [],
      },
      { status: 400 },
    )
  }
}

