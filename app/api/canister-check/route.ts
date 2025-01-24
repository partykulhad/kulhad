import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { machineId, canisterLevel } = await req.json()

    if (!machineId || canisterLevel === undefined) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameters: machineId or canisterLevel" },
        { status: 400 },
      )
    }

    const result = await convex.mutation(api.canisterCheck.checkCanisterLevel, {
      machineId,
      canisterLevel,
    })

    if (result.success) {
      return NextResponse.json(
        {
          code: 200,
          message: result.message,
          data: {
            requestId: result.requestId,
          },
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json({ code: 400, message: result.message }, { status: 400 })
    }
  } catch (error) {
    console.error("Exception in checking canister level:", error)
    if (error instanceof Error) {
      return NextResponse.json({ code: 500, message: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ code: 500, message: "An unexpected error occurred" }, { status: 500 })
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const requestId = url.searchParams.get("requestId")

    if (!requestId) {
      return NextResponse.json({ code: 400, message: "Missing required parameter: requestId" }, { status: 400 })
    }

    const result = await convex.query(api.canisterCheck.getRequest, { requestId })

    if (result) {
      return NextResponse.json(
        {
          code: 200,
          data: result,
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json({ code: 404, message: "Request not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Exception in getting request status:", error)
    if (error instanceof Error) {
      return NextResponse.json({ code: 500, message: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ code: 500, message: "An unexpected error occurred" }, { status: 500 })
    }
  }
}

