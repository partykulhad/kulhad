import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import sharp from "sharp"
import { createCanvas, loadImage } from "canvas"
import jsQR from "jsqr"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Prepare Razorpay auth header once (outside the handler)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET
const authHeader =
  razorpayKeyId && razorpayKeySecret
    ? `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`
    : null

// Function to extract QR code as hex - optimized for speed
async function extractQRCodeAsHex(imageUrl: string | URL | Request) {
  const qrStartTime = Date.now()
  console.log(`[DEBUG] QR extraction started at ${new Date().toISOString()}`)

  try {
    // Follow any redirects to get the actual image URL
    const fetchStartTime = Date.now()
    console.log(`[DEBUG] Fetching image from URL: ${imageUrl}`)
    const response = await fetch(imageUrl, { redirect: "follow" })
    console.log(`[DEBUG] Image fetch took ${Date.now() - fetchStartTime}ms`)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    // Get the image as a buffer
    const bufferStartTime = Date.now()
    const imageBuffer = Buffer.from(await response.arrayBuffer())
    console.log(`[DEBUG] Converting to buffer took ${Date.now() - bufferStartTime}ms`)

    // Load the image using canvas
    const canvasStartTime = Date.now()
    const image = await loadImage(imageBuffer)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext("2d")
    ctx.drawImage(image, 0, 0)
    console.log(`[DEBUG] Canvas loading took ${Date.now() - canvasStartTime}ms`)

    // Get image data for QR code detection
    const imageDataStartTime = Date.now()
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    console.log(`[DEBUG] Getting image data took ${Date.now() - imageDataStartTime}ms`)

    // Use jsQR to find the QR code
    const qrDetectionStartTime = Date.now()
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height)
    console.log(`[DEBUG] jsQR detection took ${Date.now() - qrDetectionStartTime}ms`)

    if (!qrCode) {
      console.log(`[DEBUG] QR code not found with jsQR, trying fallback method`)
      // If jsQR fails, try to extract the QR code using image processing
      // This approach looks for a square region with high contrast (likely the QR code)
      const sharpStartTime = Date.now()
      const processedImage = await sharp(imageBuffer).grayscale().threshold(128).toBuffer()
      console.log(`[DEBUG] Sharp image processing took ${Date.now() - sharpStartTime}ms`)

      // Create a new canvas with the processed image
      const processedCanvasStartTime = Date.now()
      const processedCanvas = createCanvas(image.width, image.height)
      const processedCtx = processedCanvas.getContext("2d")
      const processedImageObj = await loadImage(processedImage)
      processedCtx.drawImage(processedImageObj, 0, 0)
      console.log(`[DEBUG] Processed canvas creation took ${Date.now() - processedCanvasStartTime}ms`)

      // Look for the QR code in the center area (where it's typically located)
      const centerX = Math.floor(image.width / 2)
      const centerY = Math.floor(image.height / 2)
      const searchRadius = Math.floor(Math.min(image.width, image.height) / 4)

      // Extract a region around the center
      const regionStartTime = Date.now()
      const qrRegion = processedCtx.getImageData(
        centerX - searchRadius,
        centerY - searchRadius,
        searchRadius * 2,
        searchRadius * 2,
      )
      console.log(`[DEBUG] Region extraction took ${Date.now() - regionStartTime}ms`)

      // Convert to buffer and return as hex
      const finalBufferStartTime = Date.now()
      const qrBuffer = await sharp(qrRegion.data, {
        raw: {
          width: qrRegion.width,
          height: qrRegion.height,
          channels: 4,
        },
      })
        .resize(174, 174, { fit: "fill" }) // Resize to exactly 174x174 pixels
        .toBuffer()
      console.log(`[DEBUG] Final buffer processing took ${Date.now() - finalBufferStartTime}ms`)

      const hexResult = qrBuffer.toString("hex")
      console.log(`[DEBUG] Total QR extraction took ${Date.now() - qrStartTime}ms (fallback method)`)
      return hexResult
    }

    // If jsQR found the QR code, extract its location
    console.log(`[DEBUG] QR code found, extracting region`)
    // Calculate the bounding box with padding
    const padding = 10

    // Round all values to integers to avoid Sharp errors
    const minX = Math.floor(
      Math.max(0, Math.min(qrCode.location.topLeftCorner.x, qrCode.location.bottomLeftCorner.x) - padding),
    )

    const minY = Math.floor(
      Math.max(0, Math.min(qrCode.location.topLeftCorner.y, qrCode.location.topRightCorner.y) - padding),
    )

    const maxX = Math.ceil(
      Math.min(image.width, Math.max(qrCode.location.topRightCorner.x, qrCode.location.bottomRightCorner.x) + padding),
    )

    const maxY = Math.ceil(
      Math.min(
        image.height,
        Math.max(qrCode.location.bottomLeftCorner.y, qrCode.location.bottomRightCorner.y) + padding,
      ),
    )

    const width = maxX - minX
    const height = maxY - minY

    // Extract just the QR code region and resize to 174x174
    const extractStartTime = Date.now()
    const qrCodeBuffer = await sharp(imageBuffer)
      .extract({
        left: minX,
        top: minY,
        width,
        height,
      })
      .resize(174, 174, { fit: "fill" }) // Resize to exactly 174x174 pixels
      .toBuffer()
    console.log(`[DEBUG] QR region extraction took ${Date.now() - extractStartTime}ms`)

    // Convert to hex
    const hexResult = qrCodeBuffer.toString("hex")
    console.log(`[DEBUG] Total QR extraction took ${Date.now() - qrStartTime}ms (primary method)`)
    return hexResult
  } catch (error) {
    console.log(`[DEBUG] Error in primary QR extraction: ${error}`)
    // Fallback: try to extract the central portion of the image
    try {
      const fallbackStartTime = Date.now()
      console.log(`[DEBUG] Trying fallback method`)
      const image = await sharp(Buffer.from(await (await fetch(imageUrl)).arrayBuffer()))
      const metadata = await image.metadata()

      if (!metadata.width || !metadata.height) {
        throw new Error("Could not get image dimensions")
      }

      // Calculate a region in the center that's likely to contain the QR code
      const centerX = Math.floor(metadata.width / 2)
      const centerY = Math.floor(metadata.height / 2)

      // QR code is typically square and about 40% of the image height for Razorpay
      const qrSize = Math.floor(metadata.height * 0.4)

      // Ensure all values are integers
      const left = Math.floor(centerX - qrSize / 2)
      const top = Math.floor(centerY - qrSize / 2)
      const size = Math.floor(qrSize)

      const qrBuffer = await image
        .extract({
          left,
          top,
          width: size,
          height: size,
        })
        .resize(174, 174, { fit: "fill" }) // Resize to exactly 174x174 pixels
        .toBuffer()

      const hexResult = qrBuffer.toString("hex")
      console.log(`[DEBUG] Fallback QR extraction took ${Date.now() - fallbackStartTime}ms`)
      console.log(`[DEBUG] Total QR extraction took ${Date.now() - qrStartTime}ms (with fallback)`)
      return hexResult
    } catch (fallbackError) {
      console.log(`[DEBUG] Error in fallback QR extraction: ${fallbackError}`)
      // Last resort: just return the entire image resized to 174x174
      try {
        const lastResortStartTime = Date.now()
        console.log(`[DEBUG] Trying last resort method`)
        const fullImageBuffer = await (await fetch(imageUrl)).arrayBuffer()
        const resizedBuffer = await sharp(Buffer.from(fullImageBuffer))
          .resize(174, 174, { fit: "fill" }) // Resize to exactly 174x174 pixels
          .toBuffer()

        const hexResult = resizedBuffer.toString("hex")
        console.log(`[DEBUG] Last resort QR extraction took ${Date.now() - lastResortStartTime}ms`)
        console.log(`[DEBUG] Total QR extraction took ${Date.now() - qrStartTime}ms (last resort)`)
        return hexResult
      } catch (e) {
        console.log(`[DEBUG] All QR extraction methods failed after ${Date.now() - qrStartTime}ms: ${e}`)
        return "" // Return empty string if all extraction methods fail
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const totalStartTime = Date.now()
  console.log(`[DEBUG] Payment API request started at ${new Date().toISOString()}`)

  try {
    // Parse request body
    const parseStartTime = Date.now()
    const body = await request.json()
    const { machineId, numberOfCups } = body
    console.log(`[DEBUG] Request parsing took ${Date.now() - parseStartTime}ms`)

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
    const machineStartTime = Date.now()
    console.log(`[DEBUG] Fetching machine details for ID: ${machineId}`)
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
    console.log(`[DEBUG] Machine details fetch took ${Date.now() - machineStartTime}ms`)

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
    console.log(`[DEBUG] Making Razorpay API request`)
    const razorpayStartTime = Date.now()
    const response = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(razorpayRequest),
    })
    console.log(`[DEBUG] Razorpay API request took ${Date.now() - razorpayStartTime}ms`)

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
    const parseResponseStartTime = Date.now()
    const razorpayResponse = await response.json()
    const qrCodeId = razorpayResponse.id
    console.log(`[DEBUG] Razorpay response parsing took ${Date.now() - parseResponseStartTime}ms`)

    // Extract the QR code image and convert to hex
    console.log(`[DEBUG] Starting QR code extraction from URL: ${razorpayResponse.image_url}`)
    const qrExtractionStartTime = Date.now()
    const qrHexData = await extractQRCodeAsHex(razorpayResponse.image_url)
    console.log(`[DEBUG] QR code extraction took ${Date.now() - qrExtractionStartTime}ms`)

    // If QR extraction fails completely, don't proceed
    if (!qrHexData) {
      return NextResponse.json({ error: "Failed to extract QR code from image" }, { status: 500 })
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
    const dbStartTime = Date.now()
    console.log(`[DEBUG] Storing transaction in database (non-blocking)`)
    convex
      .mutation(api.transactions.createTransaction, {
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
      })
      .then(() => {
        console.log(`[DEBUG] Database storage completed in ${Date.now() - dbStartTime}ms`)
      })
      .catch((error) => {
        console.error(`[DEBUG] Error storing transaction: ${error}`)
      })

    // Return the clean response
    console.log(`[DEBUG] Total API request processing took ${Date.now() - totalStartTime}ms`)
    return NextResponse.json(transactionData)
  } catch (error: unknown) {
    console.error(`[DEBUG] Error processing payment request after ${Date.now() - totalStartTime}ms:`, error)
    return NextResponse.json(
      {
        error: "Failed to process payment request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
