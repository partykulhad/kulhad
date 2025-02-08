import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { userId, requestId, status } = await req.json()

    if (!userId || !requestId || status !== "declined") {
      return NextResponse.json({ code: 400, message: "Missing required parameters or invalid status" }, { status: 400 })
    }

    const result = await convex.mutation(api.kitchens.declineAndReassign, {
      userId,
      requestId,
      status,
    })

    if (result.success) {
      return NextResponse.json(
        {
          code: 200,
          message: result.message,
          data: {
            newKitchens: result.newKitchens,
          },
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json({ code: 400, message: result.message }, { status: 400 })
    }
  } catch (error) {
    console.error("Exception in declining kitchen request:", error)
    if (error instanceof Error) {
      return NextResponse.json({ code: 500, message: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ code: 500, message: "An unexpected error occurred" }, { status: 500 })
    }
  }
}

