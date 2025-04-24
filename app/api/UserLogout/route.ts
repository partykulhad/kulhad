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

    // Call the Convex mutation to handle user logout
    const result = await convex.mutation(api.appUsers.logoutUser, {
      userId,
      fcmToken,
      userDevice,
      appVersion,
    })
    return NextResponse.json({ code: result.code, message: result.message }, { status: 200 })
  } catch (error) {
    console.error("Failed to process user logout:", error)
    return NextResponse.json({ code: 500, message: "Failed to process user logout" }, { status: 500 }) 
  }
}
