import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameters: userId or newPassword" },
        { status: 400 },
      )
    }

    await convex.mutation(api.appUsers.changePassword, { userId, newPassword })

    return NextResponse.json(
      {
        code: 200,
        message: "Password updated successfully",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Exception in changing password:", error)
    return NextResponse.json(
      {
        code: 500,
        message: "An error occurred while changing the password",
      },
      { status: 500 },
    )
  }
}

