import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const API_URL = "https://kulhad.vercel.app/api/canister-check"

  try {
    const body = await req.json()
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in proxy-canister-check:", error)
    return NextResponse.json({ success: false, error: "Failed to check canister level" }, { status: 500 })
  }
}

