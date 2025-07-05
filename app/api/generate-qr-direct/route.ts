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

// Function to convert RGB to RGB565 format with proper bit packing
function rgbToRgb565(r: number, g: number, b: number): number {
  // Convert 8-bit RGB values to RGB565 with proper scaling
  const r5 = (r >> 3) & 0x1f // Take top 5 bits of red
  const g6 = (g >> 2) & 0x3f // Take top 6 bits of green
  const b5 = (b >> 3) & 0x1f // Take top 5 bits of blue

  // Pack into 16-bit value: RRRRRGGG GGGBBBBB
  return (r5 << 11) | (g6 << 5) | b5
}

// Function to convert RGB565 to binary (0s and 1s) - corrected for QR codes
function rgb565ToBwBit(rgb565: number): number {
  const red = (rgb565 >> 11) & 0x1f
  const green = (rgb565 >> 5) & 0x3f
  const blue = rgb565 & 0x1f

  const r8 = red << 3
  const g8 = green << 2
  const b8 = blue << 3

  const brightness = Math.floor(0.3 * r8 + 0.59 * g8 + 0.11 * b8)
  // Use a more aggressive threshold for cleaner QR codes
  return brightness > 140 ? 0 : 1
}

// Function to convert image buffer to binary format with split markers
async function convertToBinaryWithMarkers(
  imageBuffer: Buffer,
): Promise<{ binaryArray: number[]; width: number; height: number }> {
  try {
    // Get raw RGB data from the image
    const { data, info } = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true })

    const { width, height, channels } = info
    console.log(`[DEBUG] Converting image: ${width}x${height}, channels: ${channels}`)

    const binaryValues: number[] = []

    // Process each pixel
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i] || 0 // Red
      const g = data[i + 1] || 0 // Green
      const b = data[i + 2] || 0 // Blue
      // Alpha channel (if present) is ignored for RGB565

      // Convert to RGB565
      const rgb565 = rgbToRgb565(r, g, b)

      // Convert RGB565 to binary (0 or 1)
      const binaryBit = rgb565ToBwBit(rgb565)
      binaryValues.push(binaryBit)
    }

    // Add split markers to divide array into 10 parts (markers: 2 through 10)
    const segmentSize = Math.floor(binaryValues.length / 10)

    // Insert markers in reverse order to avoid index shifts
    for (let i = 9; i >= 1; i--) {
      const markerPosition = i * segmentSize
      binaryValues.splice(markerPosition, 0, i + 1) // markers = 2 to 10
    }

    console.log(
      `[DEBUG] Binary conversion complete: ${width}x${height} = ${width * height} pixels, total array length with markers: ${binaryValues.length}`,
    )

    return {
      binaryArray: binaryValues,
      width,
      height,
    }
  } catch (error) {
    console.error("[DEBUG] Error converting to binary:", error)
    throw error
  }
}

// Improved function to extract QR code with better quality
async function extractQRCodeAsBinary(imageUrl: string | URL | Request) {
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

    // First, let's enhance the image quality and extract QR code more precisely
    const enhancedStartTime = Date.now()

    // Process the image to enhance QR code detection
    const enhancedImage = await sharp(imageBuffer)
      .resize(800, 800, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
      })
      .sharpen() // Sharpen the image
      .normalize() // Normalize contrast
      .toBuffer()

    console.log(`[DEBUG] Image enhancement took ${Date.now() - enhancedStartTime}ms`)

    // Load the enhanced image using canvas
    const canvasStartTime = Date.now()
    const image = await loadImage(enhancedImage)
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
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert", // Don't try to invert colors
    })
    console.log(`[DEBUG] jsQR detection took ${Date.now() - qrDetectionStartTime}ms`)

    let qrBuffer: Buffer

    if (qrCode) {
      console.log(`[DEBUG] QR code found, extracting precise region`)

      // Calculate the bounding box with minimal padding
      const padding = 5

      // Round all values to integers to avoid Sharp errors
      const minX = Math.floor(
        Math.max(0, Math.min(qrCode.location.topLeftCorner.x, qrCode.location.bottomLeftCorner.x) - padding),
      )

      const minY = Math.floor(
        Math.max(0, Math.min(qrCode.location.topLeftCorner.y, qrCode.location.topRightCorner.y) - padding),
      )

      const maxX = Math.ceil(
        Math.min(
          image.width,
          Math.max(qrCode.location.topRightCorner.x, qrCode.location.bottomRightCorner.x) + padding,
        ),
      )

      const maxY = Math.ceil(
        Math.min(
          image.height,
          Math.max(qrCode.location.bottomLeftCorner.y, qrCode.location.bottomRightCorner.y) + padding,
        ),
      )

      const width = maxX - minX
      const height = maxY - minY

      // Extract just the QR code region
      const extractStartTime = Date.now()
      qrBuffer = await sharp(enhancedImage)
        .extract({
          left: minX,
          top: minY,
          width,
          height,
        })
        .resize(174, 174, {
          kernel: sharp.kernel.nearest, // Use nearest neighbor for crisp pixels
          fit: "fill",
        })
        .threshold(140) // Apply binary threshold for clean black/white
        .toBuffer()
      console.log(`[DEBUG] QR region extraction took ${Date.now() - extractStartTime}ms`)
    } else {
      console.log(`[DEBUG] QR code not found with jsQR, using center extraction`)

      // Fallback: extract center region and apply aggressive processing
      const metadata = await sharp(enhancedImage).metadata()

      if (!metadata.width || !metadata.height) {
        throw new Error("Could not get image dimensions")
      }

      // Calculate center region (typically where QR codes are located)
      const centerX = Math.floor(metadata.width / 2)
      const centerY = Math.floor(metadata.height / 2)
      const qrSize = Math.floor(Math.min(metadata.width, metadata.height) * 0.6) // 60% of smaller dimension

      const left = Math.floor(centerX - qrSize / 2)
      const top = Math.floor(centerY - qrSize / 2)

      qrBuffer = await sharp(enhancedImage)
        .extract({
          left: Math.max(0, left),
          top: Math.max(0, top),
          width: Math.min(qrSize, metadata.width - Math.max(0, left)),
          height: Math.min(qrSize, metadata.height - Math.max(0, top)),
        })
        .resize(174, 174, {
          kernel: sharp.kernel.nearest, // Use nearest neighbor for crisp pixels
          fit: "fill",
        })
        .threshold(140) // Apply binary threshold for clean black/white
        .toBuffer()
    }

    // Convert to binary with markers
    const binaryConversionStart = Date.now()
    const binaryResult = await convertToBinaryWithMarkers(qrBuffer)
    console.log(`[DEBUG] Binary conversion took ${Date.now() - binaryConversionStart}ms`)

    console.log(`[DEBUG] Total QR extraction took ${Date.now() - qrStartTime}ms`)
    return binaryResult.binaryArray
  } catch (error) {
    console.log(`[DEBUG] Error in QR extraction: ${error}`)

    // Last resort: simple center extraction with aggressive processing
    try {
      const lastResortStartTime = Date.now()
      console.log(`[DEBUG] Trying last resort method`)

      const fullImageBuffer = await (await fetch(imageUrl)).arrayBuffer()
      const resizedBuffer = await sharp(Buffer.from(fullImageBuffer))
        .resize(400, 400, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .sharpen()
        .normalize()
        .resize(174, 174, {
          kernel: sharp.kernel.nearest,
          fit: "fill",
        })
        .threshold(140)
        .toBuffer()

      // Convert to binary with markers
      const binaryResult = await convertToBinaryWithMarkers(resizedBuffer)
      console.log(`[DEBUG] Last resort QR extraction took ${Date.now() - lastResortStartTime}ms`)
      console.log(`[DEBUG] Total QR extraction took ${Date.now() - qrStartTime}ms (last resort)`)
      return binaryResult.binaryArray
    } catch (e) {
      console.log(`[DEBUG] All QR extraction methods failed after ${Date.now() - qrStartTime}ms: ${e}`)
      return [] // Return empty array if all extraction methods fail
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

    // Extract the QR code image and convert to binary array
    console.log(`[DEBUG] Starting QR code extraction from URL: ${razorpayResponse.image_url}`)
    const qrExtractionStartTime = Date.now()
    const qrBinarySplitData = await extractQRCodeAsBinary(razorpayResponse.image_url)
    console.log(`[DEBUG] QR code extraction took ${Date.now() - qrExtractionStartTime}ms`)

    // If QR extraction fails completely, don't proceed
    if (!qrBinarySplitData || qrBinarySplitData.length === 0) {
      return NextResponse.json({ error: "Failed to extract QR code from image" }, { status: 500 })
    }

    // Create a clean response object
    const transactionData = {
      success: true,
      id: qrCodeId,
      imageUrl: razorpayResponse.image_url,
      qrBinarySplitData: qrBinarySplitData, // Binary array with split markers (0s, 1s, and markers 2-10)
      qrImageWidth: 174, // Fixed width for QR code
      qrImageHeight: 174, // Fixed height for QR code
      qrPixelFormat: "BINARY", // Specify the pixel format as binary
      amount: razorpayResponse.payment_amount / 100, // Convert back to rupees for display
      description: razorpayResponse.description,
      status: razorpayResponse.status,
      createdAt: razorpayResponse.created_at,
      expiresAt: razorpayResponse.close_by,
      machineId,
      numberOfCups,
      amountPerCup,
      transactionId: uniqueTransactionId, // Include our unique transaction ID in the response
      qrDataFormat: "BINARY_WITH_MARKERS", // Specify the format type
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
        // Don't store qrBinarySplitData in the database as per requirements
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
