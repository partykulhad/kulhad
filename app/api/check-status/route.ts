import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Get QR code ID from query parameters
    const qrCodeId = request.nextUrl.searchParams.get("qr_code_id")

    if (!qrCodeId) {
      return NextResponse.json({ error: "Missing required parameter: qr_code_id" }, { status: 400 })
    }

    // Get Razorpay credentials from environment variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 })
    }

    // Create authorization header for Razorpay API
    const authHeader = `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`

    // Make request to Razorpay API to check QR code status
    const response = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrCodeId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    })

    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json()
      console.error("Razorpay API error:", errorData)
      return NextResponse.json(
        {
          error: "Failed to check QR code status",
          details: errorData,
        },
        { status: response.status },
      )
    }

    // Parse the response
    const statusResponse = await response.json()

    // Return the status response
    return NextResponse.json({
      success: true,
      qrCode: {
        id: statusResponse.id,
        status: statusResponse.status,
        paymentsReceived: statusResponse.payments_count_received,
        amountReceived: statusResponse.payments_amount_received / 100, // Convert to rupees
      },
      // Include the full Razorpay response for reference
      razorpayResponse: statusResponse,
    })
  } catch (error: unknown) {
    console.error("Error checking payment status:", error)
    return NextResponse.json(
      {
        error: "Failed to check payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

