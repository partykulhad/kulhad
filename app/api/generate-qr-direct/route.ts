import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import sharp from 'sharp'

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Function to extract QR code as hex
async function extractQRCodeAsHex(imageUrl: string | URL | Request) {
  try {
    // Follow any redirects to get the actual image URL
    const response = await fetch(imageUrl, { redirect: 'follow' });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Process the image with sharp
    const processedImage = await sharp(Buffer.from(imageBuffer))
      .toBuffer();
    
    // Convert the buffer to hex string
    return processedImage.toString('hex');
  } catch (error) {
    console.error('Error extracting QR code:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { machineId, numberOfCups } = body

    // Validate required parameters
    if (!machineId || !numberOfCups) {
      return NextResponse.json({ error: "Missing required parameters: machineId or numberOfCups" }, { status: 400 })
    }

    // Fetch machine details from the database to get the price
    const machine = await convex.query(api.machines.getMachineById, {
      machineId,
    })

    if (!machine) {
      return NextResponse.json({ error: `Machine not found with ID: ${machineId}` }, { status: 404 })
    }

    // Get the price from the machine details and convert to number if it's a string
    let amountPerCup: number

    if (typeof machine.price === "number") {
      amountPerCup = machine.price
    } else if (typeof machine.price === "string") {
      // Convert string price to number
      amountPerCup = Number.parseFloat(machine.price)
    } else {
      return NextResponse.json({ error: `Price not found for machine: ${machineId}` }, { status: 400 })
    }

    // Validate the converted price
    if (isNaN(amountPerCup) || amountPerCup <= 0) {
      return NextResponse.json(
        { error: `Invalid price value for machine: ${machineId}, price: ${machine.price}` },
        { status: 400 },
      )
    }

    console.log(`Using price ${amountPerCup} from machine ${machineId} (original: ${machine.price})`)

    // Calculate total amount
    const calculatedAmount = amountPerCup * Number.parseInt(numberOfCups)

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

    // Generate a unique transaction ID that will be used both in Razorpay and our database
    const uniqueTransactionId = `${machineId}-${Date.now()}`

    console.log("Generated unique transaction ID:", uniqueTransactionId)

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
        amountPerCup: String(amountPerCup),
        transactionId: uniqueTransactionId, // Add our unique transaction ID to notes
      },
    }

    console.log("Sending request to Razorpay:", JSON.stringify(razorpayRequest))

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
    console.log("Razorpay response:", JSON.stringify(razorpayResponse))

    // Extract the QR code image and convert to hex
    console.log("Extracting QR code from:", razorpayResponse.image_url);
    const qrHexData = await extractQRCodeAsHex(razorpayResponse.image_url);
    console.log("QR code extracted successfully");

    // We'll use the Razorpay QR code ID as our transaction ID in the database
    const qrCodeId = razorpayResponse.id

    console.log("Using QR code ID as transaction ID:", qrCodeId)

    // Create a clean response object
    const transactionData = {
      success: true,
      id: qrCodeId,
      imageUrl: razorpayResponse.image_url,
      qrHexData: qrHexData, // Include the hex data in the response
      amount: razorpayResponse.payment_amount / 100, // Convert back to rupees for display
      description: razorpayResponse.description,
      status: razorpayResponse.status,
      createdAt: razorpayResponse.created_at,
      expiresAt: razorpayResponse.close_by,
      machineId,
      numberOfCups,
      amountPerCup,
      transactionId: uniqueTransactionId, // Include our unique transaction ID in the response
    }

    // Store transaction in Convex with BOTH IDs
    // This is crucial - we store both the QR code ID and our unique transaction ID
    const dbTransaction = await convex.mutation(api.transactions.createTransaction, {
      transactionId: qrCodeId, // Primary ID - the QR code ID from Razorpay
      customTransactionId: uniqueTransactionId, // Our custom ID as a secondary reference
      imageUrl: razorpayResponse.image_url,
      //qrHexData: qrHexData, // Also store the hex data in the database
      amount: razorpayResponse.payment_amount / 100,
      cups: Number(numberOfCups),
      amountPerCup: amountPerCup,
      machineId: machineId,
      description: razorpayResponse.description,
      status: razorpayResponse.status,
      expiresAt: razorpayResponse.close_by * 1000, // Convert to milliseconds
    })

    console.log("Transaction stored in database:", dbTransaction)

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