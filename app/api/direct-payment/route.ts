import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import sharp from 'sharp'
import QRCode from 'qrcode'

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Function to generate QR code and convert to hex
async function generateQRCodeAsHex(upiString: string) {
  try {
    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(upiString, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
      width: 300,
    });
    
    // Convert the buffer to hex string
    return qrBuffer.toString('hex');
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Function to generate UPI payment string
function generateUPIString(params: {
  vpa: string;
  name: string;
  amount: number;
  transactionId: string;
  description: string;
}) {
  const { vpa, name, amount, transactionId, description } = params;
  
  // Format according to UPI specifications
  // https://developers.google.com/pay/india/api/web/create-payment-uri
  const upiParams = new URLSearchParams();
  upiParams.append('pa', vpa); // payee address (VPA)
  upiParams.append('pn', name); // payee name
  upiParams.append('am', amount.toString()); // amount
  upiParams.append('tr', transactionId); // transaction reference
  upiParams.append('tn', description); // transaction note
  upiParams.append('cu', 'INR'); // currency code
  
  return `upi://pay?${upiParams.toString()}`;
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

    // Get Razorpay VPA from environment variables
    const razorpayVpa = process.env.RAZORPAY_VPA
    const merchantName = process.env.MERCHANT_NAME || "Coffee Machine"

    if (!razorpayVpa) {
      return NextResponse.json({ error: "Razorpay VPA not configured" }, { status: 500 })
    }

    // Generate a unique transaction ID
    const uniqueTransactionId = `${machineId}-${Date.now()}`
    console.log("Generated unique transaction ID:", uniqueTransactionId)

    // Set expiry time (30 minutes from now)
    const closeBy = Math.floor(Date.now() / 1000) + 1800 // 30 minutes in seconds

    // Generate UPI payment string
    const description = `${numberOfCups} cup(s) of coffee from Machine ${machineId}`
    const upiString = generateUPIString({
      vpa: razorpayVpa,
      name: `${merchantName} ${machineId}`,
      amount: calculatedAmount,
      transactionId: uniqueTransactionId,
      description: description,
    });

    console.log("Generated UPI string:", upiString);

    // Generate QR code from UPI string and convert to hex
    const qrHexData = await generateQRCodeAsHex(upiString);
    console.log("QR code generated successfully");

    // Generate a data URL for the QR code to include in the response
    const qrBuffer = Buffer.from(qrHexData, 'hex');
    const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;

    // Create a clean response object
    const transactionData = {
      success: true,
      id: uniqueTransactionId,
      imageUrl: qrDataUrl,
      qrHexData: qrHexData,
      upiString: upiString,
      amount: calculatedAmount,
      description: description,
      status: "active",
      createdAt: Math.floor(Date.now() / 1000),
      expiresAt: closeBy,
      machineId,
      numberOfCups,
      amountPerCup,
      transactionId: uniqueTransactionId,
    }

    // Store transaction in Convex
    const dbTransaction = await convex.mutation(api.transactions.createTransaction, {
      transactionId: uniqueTransactionId,
      customTransactionId: uniqueTransactionId,
      imageUrl: qrDataUrl,
     // upiString: upiString,
      amount: calculatedAmount,
      cups: Number(numberOfCups),
      amountPerCup: amountPerCup,
      machineId: machineId,
      description: description,
      status: "active",
      expiresAt: closeBy * 1000, // Convert to milliseconds
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