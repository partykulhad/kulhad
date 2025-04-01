import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { machineId, amountPerCup, numberOfCups } = body

    // Validate required parameters
    if (!machineId || !amountPerCup || !numberOfCups) {
      return NextResponse.json(
        { error: "Missing required parameters: machineId, amountPerCup, or numberOfCups" },
        { status: 400 },
      )
    }

    // Calculate total amount
    const calculatedAmount = Number.parseFloat(amountPerCup) * Number.parseInt(numberOfCups)

    // Convert to paise (multiply by 100) as Razorpay requires amount in paise
    const amountInPaise = Math.round(calculatedAmount * 100)

    // Get Razorpay credentials from environment variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 })
    }

    // Create authorization header for Razorpay API
    const authHeader = `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`

    // Set expiry time (30 minutes from now)
    const closeBy = Math.floor(Date.now() / 1000) + 1800 // 30 minutes in seconds

    // Prepare request body for Razorpay API
    const razorpayRequest = {
      type: "upi_qr",
      name: `Coffee Machine ${machineId}`,
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amountInPaise,
      description: `${numberOfCups} cup(s) of coffee from Machine ${machineId}`,
      close_by: closeBy,
      notes: {
        machineId: machineId,
        numberOfCups: numberOfCups.toString(),
        amountPerCup: amountPerCup.toString(),
      },
    }

    // Make request to Razorpay API
    const response = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(razorpayRequest),
    })

    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json()
      console.error("Razorpay API error:", errorData)
      return NextResponse.json(
        {
          error: "Failed to create Razorpay QR code",
          details: errorData,
        },
        { status: response.status },
      )
    }

    // Parse the response
    const razorpayResponse = await response.json()

    // Create a clean response object
    const transactionData = {
      success: true,
      id: razorpayResponse.id,
      imageUrl: razorpayResponse.image_url,
      amount: razorpayResponse.payment_amount / 100, // Convert back to rupees for display
      description: razorpayResponse.description,
      status: razorpayResponse.status,
      createdAt: razorpayResponse.created_at,
      expiresAt: razorpayResponse.close_by,
      machineId,
      numberOfCups,
      amountPerCup,
    }

    // Store transaction in Convex
    await convex.mutation(api.transactions.createTransaction, {
      transactionId: razorpayResponse.id,
      imageUrl: razorpayResponse.image_url,
      amount: razorpayResponse.payment_amount / 100,
      cups: Number(numberOfCups),
      amountPerCup: Number(amountPerCup),
      machineId: machineId,
      description: razorpayResponse.description,
      status: razorpayResponse.status,
      expiresAt: razorpayResponse.close_by,
    })

    // Return the clean response
    return NextResponse.json(transactionData)
  } catch (error: unknown) {
    console.error("Error processing payment request:", error)
    return NextResponse.json(
      {
        error: "Failed to process payment request",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 },
    )
  }
}

