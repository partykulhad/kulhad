import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { userId, fcmToken, userDevice, appVersion } = await req.json()

    if (!userId || !fcmToken || !userDevice || !appVersion) {
      return NextResponse.json({ code: 400, message: "Missing required parameters" }, { status: 400 })
    }

    // Call the Convex mutation to update or add FCM token
    const result = await convex.mutation(api.appUsers.updateFCMToken, {
      userId,
      fcmToken,
      userDevice,
      appVersion,
    })

    return NextResponse.json({ code: result.code, message: result.message }, { status: result.code })
  } catch (error) {
    console.error("Failed to update FCM Token:", error)
    return NextResponse.json({ code: 500, message: "Failed to update FCM Token" }, { status: 500 })
  }
}

