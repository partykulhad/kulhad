import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import sharp from 'sharp'
import { createCanvas, loadImage } from 'canvas'
import jsQR from 'jsqr'

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Prepare Razorpay auth header once (outside the handler)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET
const authHeader = razorpayKeyId && razorpayKeySecret 
  ? `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`
  : null

// Function to extract QR code as hex - optimized for speed
async function extractQRCodeAsHex(imageUrl: string | URL | Request) {
  try {
    // Follow any redirects to get the actual image URL
    const response = await fetch(imageUrl, { redirect: 'follow' });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get the image as a buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Load the image using canvas
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // Get image data for QR code detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Use jsQR to find the QR code
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (!qrCode) {
      // If jsQR fails, try to extract the QR code using image processing
      // This approach looks for a square region with high contrast (likely the QR code)
      const processedImage = await sharp(imageBuffer)
        .grayscale()
        .threshold(128)
        .toBuffer();
      
      // Create a new canvas with the processed image
      const processedCanvas = createCanvas(image.width, image.height);
      const processedCtx = processedCanvas.getContext('2d');
      const processedImageObj = await loadImage(processedImage);
      processedCtx.drawImage(processedImageObj, 0, 0);
      
      // Look for the QR code in the center area (where it's typically located)
      const centerX = Math.floor(image.width / 2);
      const centerY = Math.floor(image.height / 2);
      const searchRadius = Math.floor(Math.min(image.width, image.height) / 4);
      
      // Extract a region around the center
      const qrRegion = processedCtx.getImageData(
        centerX - searchRadius, 
        centerY - searchRadius, 
        searchRadius * 2, 
        searchRadius * 2
      );
      
      // Convert to buffer and return as hex
      const qrBuffer = await sharp(qrRegion.data, {
        raw: {
          width: qrRegion.width,
          height: qrRegion.height,
          channels: 4
        }
      })
      .resize(174, 174, { fit: 'fill' }) // Resize to exactly 174x174 pixels
      .toBuffer();
      
      return qrBuffer.toString('hex');
    }
    
    // If jsQR found the QR code, extract its location
    // Calculate the bounding box with padding
    const padding = 10;
    
    // Round all values to integers to avoid Sharp errors
    const minX = Math.floor(Math.max(0, Math.min(
      qrCode.location.topLeftCorner.x,
      qrCode.location.bottomLeftCorner.x
    ) - padding));
    
    const minY = Math.floor(Math.max(0, Math.min(
      qrCode.location.topLeftCorner.y,
      qrCode.location.topRightCorner.y
    ) - padding));
    
    const maxX = Math.ceil(Math.min(image.width, Math.max(
      qrCode.location.topRightCorner.x,
      qrCode.location.bottomRightCorner.x
    ) + padding));
    
    const maxY = Math.ceil(Math.min(image.height, Math.max(
      qrCode.location.bottomLeftCorner.y,
      qrCode.location.bottomRightCorner.y
    ) + padding));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Extract just the QR code region and resize to 174x174
    const qrCodeBuffer = await sharp(imageBuffer)
      .extract({ 
        left: minX, 
        top: minY, 
        width, 
        height 
      })
      .resize(174, 174, { fit: 'fill' }) // Resize to exactly 174x174 pixels
      .toBuffer();
    
    // Convert to hex
    return qrCodeBuffer.toString('hex');
  } catch (error) {
    // Fallback: try to extract the central portion of the image
    try {
      const image = await sharp(Buffer.from(await (await fetch(imageUrl)).arrayBuffer()));
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error("Could not get image dimensions");
      }
      
      // Calculate a region in the center that's likely to contain the QR code
      const centerX = Math.floor(metadata.width / 2);
      const centerY = Math.floor(metadata.height / 2);
      
      // QR code is typically square and about 40% of the image height for Razorpay
      const qrSize = Math.floor(metadata.height * 0.4);
      
      // Ensure all values are integers
      const left = Math.floor(centerX - qrSize/2);
      const top = Math.floor(centerY - qrSize/2);
      const size = Math.floor(qrSize);
      
      const qrBuffer = await image
        .extract({
          left,
          top,
          width: size,
          height: size
        })
        .resize(174, 174, { fit: 'fill' }) // Resize to exactly 174x174 pixels
        .toBuffer();
      
      return qrBuffer.toString('hex');
    } catch (fallbackError) {
      // Last resort: just return the entire image resized to 174x174
      try {
        const fullImageBuffer = await (await fetch(imageUrl)).arrayBuffer();
        const resizedBuffer = await sharp(Buffer.from(fullImageBuffer))
          .resize(174, 174, { fit: 'fill' }) // Resize to exactly 174x174 pixels
          .toBuffer();
        return resizedBuffer.toString('hex');
      } catch (e) {
        return ""; // Return empty string if all extraction methods fail
      }
    }
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

    // Check Razorpay credentials early
    if (!authHeader) {
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 })
    }

    // Generate a unique transaction ID
    const uniqueTransactionId = `${machineId}-${Date.now()}`
    
    // Set expiry time (30 minutes from now)
    const closeBy = Math.floor(Date.now() / 1000) + 1800 // 30 minutes in seconds

    // Start fetching machine details early
    const machinePromise = convex.query(api.machines.getMachineById, { machineId })

    // Prepare request body for Razorpay API while waiting for machine details
    const razorpayRequestBase = {
      type: "upi_qr",
      name: `Coffee Machine ${machineId}`,
      usage: "single_use",
      fixed_amount: true,
      description: `${numberOfCups} cup(s) of coffee from Machine ${machineId}`,
      close_by: closeBy,
      notes: {
        machineId,
        numberOfCups: numberOfCups.toString(),
        transactionId: uniqueTransactionId,
      },
    }

    // Get machine details
    const machine = await machinePromise

    if (!machine) {
      return NextResponse.json({ error: `Machine not found with ID: ${machineId}` }, { status: 404 })
    }

    // Get the price from the machine details
    let amountPerCup: number

    if (typeof machine.price === "number") {
      amountPerCup = machine.price
    } else if (typeof machine.price === "string") {
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

    // Calculate total amount and convert to paise
    const calculatedAmount = amountPerCup * Number.parseInt(numberOfCups)
    const amountInPaise = Math.round(calculatedAmount * 100)

    // Complete the Razorpay request with price information
    const razorpayRequest = {
      ...razorpayRequestBase,
      payment_amount: amountInPaise,
      notes: {
        ...razorpayRequestBase.notes,
        amountPerCup: String(amountPerCup),
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
    const qrCodeId = razorpayResponse.id

    // Extract the QR code image and convert to hex
    // This is still needed as per requirements
    const qrHexData = await extractQRCodeAsHex(razorpayResponse.image_url)
    
    // If QR extraction fails completely, don't proceed
    if (!qrHexData) {
      return NextResponse.json(
        { error: "Failed to extract QR code from image" },
        { status: 500 }
      )
    }

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

    // Store transaction in Convex without waiting for it to complete
    // This makes the response faster while still ensuring data is stored
    convex.mutation(api.transactions.createTransaction, {
      transactionId: qrCodeId,
      customTransactionId: uniqueTransactionId,
      imageUrl: razorpayResponse.image_url,
      // Don't store qrHexData in the database as per requirements
      amount: razorpayResponse.payment_amount / 100,
      cups: Number(numberOfCups),
      amountPerCup: amountPerCup,
      machineId: machineId,
      description: razorpayResponse.description,
      status: razorpayResponse.status,
      expiresAt: razorpayResponse.close_by * 1000,
    }).catch(error => {
      // Just log the error but don't block the response
      console.error("Error storing transaction:", error)
    })

    // Return the clean response
    return NextResponse.json(transactionData)
  } catch (error: unknown) {
    console.error("Error processing payment request:", error)
    return NextResponse.json(
      {
        error: "Failed to process payment request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}