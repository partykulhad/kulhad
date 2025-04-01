import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Parse the payment failure data from PayU
    const formData = await request.formData()
    const paymentData = Object.fromEntries(formData.entries())

    console.log("Payment failure callback received:", paymentData)

    // Here you would typically:
    // 1. Log the failed payment
    // 2. Update your database with the payment status

    return NextResponse.json({ success: true, message: "Payment failure recorded" })
  } catch (error: unknown) {
    console.error("Error processing payment failure:", error)
    return NextResponse.json(
      { error: "Failed to process payment failure", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// Also handle GET requests for redirect-based flows
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const paymentData = Object.fromEntries(searchParams.entries())

    console.log("Payment failure redirect received:", paymentData)

    // Redirect to a failure page or return a failure response
    return NextResponse.redirect(new URL("/payment/failure", request.url))
  } catch (error: unknown) {
    console.error("Error processing payment failure redirect:", error)
    return NextResponse.redirect(new URL("/payment/error", request.url))
  }
}

