import { type NextRequest, NextResponse } from "next/server"

// Prepare Razorpay auth header
const razorpayKeyId = process.env.RAZORPAY_KEY_ID
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET
const authHeader =
  razorpayKeyId && razorpayKeySecret
    ? `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`
    : null

export async function POST(request: NextRequest, { params }: { params: { qrCodeId: string } }) {
  const startTime = Date.now()
  console.log(`[DEBUG] QR Code close request started at ${new Date().toISOString()}`)

  try {
    const { qrCodeId } = params

    console.log(`[DEBUG] Received close request for QR Code ID: ${qrCodeId}`)

    // Validate required parameters
    if (!qrCodeId) {
      return NextResponse.json({ error: "Missing QR Code ID in URL path" }, { status: 400 })
    }

    // Check Razorpay credentials
    if (!authHeader) {
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 })
    }

    // Make request to Razorpay API to close the QR code
    const razorpayCloseUrl = `https://api.razorpay.com/v1/payments/qr_codes/${qrCodeId}/close`

    console.log(`[DEBUG] Making Razorpay close request to: ${razorpayCloseUrl}`)

    const razorpayStartTime = Date.now()
    const response = await fetch(razorpayCloseUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    })

    console.log(`[DEBUG] Razorpay close request took ${Date.now() - razorpayStartTime}ms`)

    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json()
      console.error(`[DEBUG] Razorpay close request failed:`, errorData)

      return NextResponse.json(
        {
          error: "Failed to close QR code",
          details: errorData,
          qrCodeId,
        },
        { status: response.status },
      )
    }

    // Parse the response
    const razorpayResponse = await response.json()
    console.log(`[DEBUG] QR Code ${qrCodeId} closed successfully`)

    // Create response object
    const responseData = {
      success: true,
      message: "QR code closed successfully",
      qrCodeId: qrCodeId,
      status: razorpayResponse.status,
      closedAt: razorpayResponse.closed_at || Math.floor(Date.now() / 1000),
      razorpayResponse: razorpayResponse,
    }

    console.log(`[DEBUG] QR code close request completed in ${Date.now() - startTime}ms`)
    return NextResponse.json(responseData)
  } catch (error: unknown) {
    console.error(`[DEBUG] Error closing QR code after ${Date.now() - startTime}ms:`, error)

    return NextResponse.json(
      {
        error: "Failed to close QR code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
