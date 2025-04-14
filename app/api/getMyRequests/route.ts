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

    console.log(`Fetching requests for userId: ${userId}`)

    const requests = await convex.query(api.requests.getMyRequests, { userId })

    console.log(`Received ${requests.length} requests from Convex`)
    console.log("First request (if any):", requests[0])

    if (requests.length > 0) {
      const mappedRequests = requests.map((request) => ({
        requestId: request.requestId,
        requestStatus: request.requestStatus,
        requestDateTime: new Date(request._creationTime).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
        srcAddress: request.srcAddress ?? null,
        machineId: request.machineId ?? null,
        srcLatitude: request.srcLatitude ?? 0.0,
        srcLongitude: request.srcLongitude ?? 0.0,
        srcContactName: request.srcContactName ?? "",
        teaType:request.teaType ?? "",
        quantity:request.quantity ?? 0.0,
        srcContactNumber: request.srcContactNumber ?? null,
        dstAddress: request.dstAddress ?? null,
        dstLatitude: request.dstLatitude ?? 0.0,
        dstLongitude: request.dstLongitude ?? 0.0,
        dstContactName: request.dstContactName ?? null,
        dstContactNumber: request.dstContactNumber ?? null,
        assgnRefillerName: request.assignRefillerName ?? null,
        assignRefillerContactNumber: request.assignRefillerContactNumber ?? null,
      }))

      console.log("Mapped first request:", mappedRequests[0])

      return NextResponse.json(
        {
          code: 200,
          message: "Requests Available",
          requestDetailsList: mappedRequests,
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json(
        {
          code: 302,
          message: "No Active Requests Available",
          requestDetailsList: [],
        },
        { status: 302 },
      )
    }
  } catch (error) {
    console.error("Exception in getting requests:", error)
    return NextResponse.json(
      {
        code: 400,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        requestDetailsList: [],
      },
      { status: 400 },
    )
  }
}

