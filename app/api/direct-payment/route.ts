import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Prepare Razorpay auth header once (outside the handler)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET
const authHeader =
  razorpayKeyId && razorpayKeySecret
    ? `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`
    : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { machineId, numberOfCups } = body

    // Early validation
    if (!machineId || !numberOfCups) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    if (!authHeader) {
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 })
    }

    // Fetch machine data
    const machine = await convex.query(api.machines.getMachineById, { machineId })

    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 })
    }

    // Validate price exists and is valid
    if (!machine.price) {
      return NextResponse.json({ error: "Price not configured for machine" }, { status: 400 })
    }

    const amountPerCup = typeof machine.price === "number" ? machine.price : Number.parseFloat(machine.price)

    if (isNaN(amountPerCup) || amountPerCup <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 })
    }

    const amountInPaise = Math.round(amountPerCup * Number.parseInt(numberOfCups) * 100)
    const uniqueTransactionId = `${machineId}-${Date.now()}`

    const razorpayRequest = {
      type: "upi_qr",
      name: `Coffee Machine ${machineId}`,
      usage: "single_use",
      fixed_amount: true,
      description: `${numberOfCups} cup(s) from Machine ${machineId}`,
      close_by: Math.floor(Date.now() / 1000) + 151,
      payment_amount: amountInPaise,
      notes: {
        machineId,
        numberOfCups: numberOfCups.toString(),
        transactionId: uniqueTransactionId,
        amountPerCup: String(amountPerCup),
      },
    }

    // Single Razorpay API call - returns all needed data including image_content
    const createResponse = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(razorpayRequest),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      return NextResponse.json({ error: "Failed to create QR code", details: errorData }, { status: createResponse.status })
    }

    const razorpayResponse = await createResponse.json()

    // Store transaction asynchronously (fire-and-forget)
    convex
      .mutation(api.transactions.createTransaction, {
        transactionId: razorpayResponse.id,
        customTransactionId: uniqueTransactionId,
        imageUrl: razorpayResponse.image_url,
        amount: razorpayResponse.payment_amount / 100,
        cups: Number(numberOfCups),
        amountPerCup: amountPerCup,
        machineId: machineId,
        description: razorpayResponse.description,
        status: razorpayResponse.status,
        expiresAt: razorpayResponse.close_by * 1000,
      })
      .catch((error) => console.error("DB Error:", error))

    // Return immediately with essential data
    return NextResponse.json({
      id: razorpayResponse.id,
      imageUrl: razorpayResponse.image_url,
      imageContent: razorpayResponse.image_content,
      amount: razorpayResponse.payment_amount / 100,
      status: razorpayResponse.status,
      expiresAt: razorpayResponse.close_by,
      machineId,
      numberOfCups,
      transactionId: uniqueTransactionId,
    })
  } catch (error: unknown) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to process payment", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
