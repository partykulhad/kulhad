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

    const orders = await convex.query(api.requests.getMyOrdersHistory, { userId })

    if (orders.length > 0) {
      return NextResponse.json(
        {
          code: 200,
          message: "Order History Available",
          orderHistoryList: orders.map((order) => ({
            requestId: order.requestId,
            requestStatus: order.requestStatus,
            requestDateTime: order.requestDateTime,
            srcAddress: order.srcAddress,
            machineId: order.machineId,
            srcLatitude: order.srcLatitude,
            srcLongitude: order.srcLongitude,
            srcContactName: order.srcContactName,
            srcContactNumber: order.srcContactNumber,
            dstAddress: order.dstAddress,
            dstLatitude: order.dstLatitude,
            dstLongitude: order.dstLongitude,
            dstContactName: order.dstContactName,
            dstContactNumber: order.dstContactNumber,
            assgnRefillerName: order.assgnRefillerName,
            assignRefillerContactNumber: order.assignRefillerContactNumber,
          })),
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json(
        {
          code: 302,
          message: "No Order History Available",
          orderHistoryList: [],
        },
        { status: 302 },
      )
    }
  } catch (error) {
    console.error("Exception in getting order history:", error)
    return NextResponse.json(
      {
        code: 400,
        message: "Exception Message",
        orderHistoryList: [],
      },
      { status: 400 },
    )
  }
}

