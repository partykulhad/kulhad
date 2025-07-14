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

// Constants for QR code dimensions
const QR_WIDTH = 174
const QR_HEIGHT = 174

// Function to convert RGB to RGB565 format with proper bit packing
function rgbToRgb565(r: number, g: number, b: number): number {
  const r5 = (r >> 3) & 0x1f // 5 bits for red
  const g6 = (g >> 2) & 0x3f // 6 bits for green
  const b5 = (b >> 3) & 0x1f // 5 bits for blue
  return (r5 << 11) | (g6 << 5) | b5
}

// Function to convert RGB565 to binary using the specified luminance formula
function rgb565ToBinary(rgb565: number): number {
  // Extract RGB565 components
  const red = (rgb565 >> 11) & 0x1f // 5-bit red
  const green = (rgb565 >> 5) & 0x3f // 6-bit green
  const blue = rgb565 & 0x1f // 5-bit blue

  // Convert to 8-bit values using specified conversion factors
  const r8 = red * 8.225 // Red conversion factor
  const g8 = green * 4.047 // Green conversion factor
  const b8 = blue * 8.225 // Blue conversion factor

  // Calculate luminance using formula: Y = 0.299R + 0.587G + 0.114B
  const luminance = 0.299 * r8 + 0.587 * g8 + 0.114 * b8

  // Convert to binary: < 128 = black (1), >= 128 = white (0)
  return luminance < 128 ? 1 : 0
}

// Function to convert image buffer to binary format - exactly 174x174
async function convertToBinary(imageBuffer: Buffer): Promise<number[]> {
  try {
    const { data, info } = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true })
    const { width, height, channels } = info
    console.log(`[DEBUG] Converting image: ${width}x${height}, channels: ${channels}`)

    const binaryValues: number[] = []

    // Process each pixel
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i] || 0
      const g = data[i + 1] || 0
      const b = data[i + 2] || 0

      // Convert RGB to RGB565
      const rgb565 = rgbToRgb565(r, g, b)

      // Convert RGB565 to binary using luminance formula
      const binaryBit = rgb565ToBinary(rgb565)
      binaryValues.push(binaryBit)
    }

    console.log(
      `[DEBUG] Binary conversion complete: ${width}x${height} = ${width * height} pixels, array length: ${binaryValues.length}`,
    )

    // Ensure we have exactly 30276 pixels (174x174)
    if (binaryValues.length !== 30276) {
      console.log(`[DEBUG] WARNING: Expected 30276 pixels, got ${binaryValues.length}`)
    }

    return binaryValues
  } catch (error) {
    console.error("[DEBUG] Error converting to binary:", error)
    throw error
  }
}

// Function to convert flat binary array to row-wise format
function formatBinaryDataAsRows(data: number[]): string {
  const rows: string[] = []

  for (let i = 0; i < QR_HEIGHT; i++) {
    const start = i * QR_WIDTH
    const end = start + QR_WIDTH
    const row = data.slice(start, end)
    const rowString = row.join("")
    rows.push(rowString)
  }

  return rows.join("\n")
}

// Alternative function to return as array of row strings
function formatBinaryDataAsRowArray(data: number[]): string[] {
  const rows: string[] = []

  for (let i = 0; i < QR_HEIGHT; i++) {
    const start = i * QR_WIDTH
    const end = start + QR_WIDTH
    const row = data.slice(start, end)
    const rowString = row.join("")
    rows.push(rowString)
  }

  return rows
}

// Function to find QR code boundaries
function findQRCodeBounds(qrCode: any, imageWidth: number, imageHeight: number) {
  const corners = [
    qrCode.location.topLeftCorner,
    qrCode.location.topRightCorner,
    qrCode.location.bottomRightCorner,
    qrCode.location.bottomLeftCorner,
  ]

  // Find the actual bounding rectangle
  const minX = Math.max(0, Math.min(...corners.map((c: any) => c.x)) - 5)
  const maxX = Math.min(imageWidth, Math.max(...corners.map((c: any) => c.x)) + 5)
  const minY = Math.max(0, Math.min(...corners.map((c: any) => c.y)) - 5)
  const maxY = Math.min(imageHeight, Math.max(...corners.map((c: any) => c.y)) + 5)

  const width = maxX - minX
  const height = maxY - minY

  // Make it square by using the larger dimension
  const size = Math.max(width, height)
  const centerX = minX + width / 2
  const centerY = minY + height / 2

  const finalLeft = Math.max(0, Math.floor(centerX - size / 2))
  const finalTop = Math.max(0, Math.floor(centerY - size / 2))
  const finalSize = Math.min(size, Math.min(imageWidth - finalLeft, imageHeight - finalTop))

  return {
    left: finalLeft,
    top: finalTop,
    width: Math.floor(finalSize),
    height: Math.floor(finalSize),
  }
}

// Function to extract QR code and convert to binary with exact 174x174 output
async function extractQRCodeAsBinary(imageUrl: string | URL | Request): Promise<number[]> {
  const qrStartTime = Date.now()
  console.log(`[DEBUG] QR extraction started at ${new Date().toISOString()}`)

  try {
    // Fetch the image
    console.log(`[DEBUG] Fetching image from URL: ${imageUrl}`)
    const response = await fetch(imageUrl, { redirect: "follow" })
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    const imageBuffer = Buffer.from(await response.arrayBuffer())

    // Step 1: Enhance the original image for better QR detection
    const enhancedImage = await sharp(imageBuffer)
      .resize(800, 800, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .sharpen()
      .normalize()
      .toBuffer()

    // Step 2: Load image for QR detection
    const image = await loadImage(enhancedImage)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext("2d")
    ctx.drawImage(image, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Step 3: Detect QR code with jsQR
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    let qrBuffer: Buffer

    if (qrCode) {
      console.log(`[DEBUG] QR code detected successfully`)
      // Get precise QR code boundaries
      const bounds = findQRCodeBounds(qrCode, image.width, image.height)
      console.log(
        `[DEBUG] QR bounds: left=${bounds.left}, top=${bounds.top}, width=${bounds.width}, height=${bounds.height}`,
      )

      // Extract the exact QR code region and resize to exactly 174x174
      qrBuffer = await sharp(enhancedImage)
        .extract({
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
        })
        .resize(174, 174, {
          kernel: sharp.kernel.nearest,
          fit: "fill",
        })
        .toBuffer()
    } else {
      console.log(`[DEBUG] QR code not detected, using center extraction method`)
      // Fallback: Extract center region
      const metadata = await sharp(enhancedImage).metadata()
      if (!metadata.width || !metadata.height) {
        throw new Error("Could not get image dimensions")
      }

      // Calculate center square region (60% of image)
      const centerX = Math.floor(metadata.width / 2)
      const centerY = Math.floor(metadata.height / 2)
      const size = Math.floor(Math.min(metadata.width, metadata.height) * 0.6)
      const left = Math.max(0, centerX - Math.floor(size / 2))
      const top = Math.max(0, centerY - Math.floor(size / 2))
      const actualSize = Math.min(size, Math.min(metadata.width - left, metadata.height - top))

      qrBuffer = await sharp(enhancedImage)
        .extract({
          left,
          top,
          width: actualSize,
          height: actualSize,
        })
        .resize(174, 174, {
          kernel: sharp.kernel.nearest,
          fit: "fill",
        })
        .toBuffer()
    }

    // Step 4: Verify the final image is exactly 174x174
    const finalMetadata = await sharp(qrBuffer).metadata()
    console.log(`[DEBUG] Final QR image dimensions: ${finalMetadata.width}x${finalMetadata.height}`)

    if (finalMetadata.width !== 174 || finalMetadata.height !== 174) {
      console.log(`[DEBUG] Correcting final image size to 174x174`)
      qrBuffer = await sharp(qrBuffer)
        .resize(174, 174, {
          kernel: sharp.kernel.nearest,
          fit: "fill",
        })
        .toBuffer()
    }

    // Step 5: Convert to binary using the specified luminance formula
    const binaryArray = await convertToBinary(qrBuffer)

    // Verify we have exactly 174*174 = 30276 pixels
    const expectedPixels = 174 * 174 // 30276
    console.log(`[DEBUG] Binary array length: ${binaryArray.length}, expected: ${expectedPixels}`)

    if (binaryArray.length !== expectedPixels) {
      console.log(
        `[DEBUG] WARNING: Binary array length mismatch. Got ${binaryArray.length}, expected ${expectedPixels}`,
      )
    }

    console.log(`[DEBUG] Total QR extraction took ${Date.now() - qrStartTime}ms`)
    return binaryArray
  } catch (error) {
    console.log(`[DEBUG] Error in QR extraction: ${error}`)
    // Last resort: Simple processing
    try {
      console.log(`[DEBUG] Trying last resort method`)
      const fullImageBuffer = await (await fetch(imageUrl)).arrayBuffer()
      const qrBuffer = await sharp(Buffer.from(fullImageBuffer))
        .resize(174, 174, {
          kernel: sharp.kernel.nearest,
          fit: "fill",
        })
        .toBuffer()

      const binaryArray = await convertToBinary(qrBuffer)
      console.log(`[DEBUG] Last resort method completed`)
      return binaryArray
    } catch (e) {
      console.log(`[DEBUG] All QR extraction methods failed: ${e}`)
      return []
    }
  }
}

export async function POST(request: NextRequest) {
  const totalStartTime = Date.now()
  console.log(`[DEBUG] Payment API request started at ${new Date().toISOString()}`)

  try {
    const body = await request.json()
    const { machineId, numberOfCups } = body

    if (!machineId || !numberOfCups) {
      return NextResponse.json({ error: "Missing required parameters: machineId or numberOfCups" }, { status: 400 })
    }

    if (!authHeader) {
      return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 })
    }

    const uniqueTransactionId = `${machineId}-${Date.now()}`
    const closeBy = Math.floor(Date.now() / 1000) + 1800

    console.log(`[DEBUG] Fetching machine details for ID: ${machineId}`)
    const machine = await convex.query(api.machines.getMachineById, { machineId })

    if (!machine) {
      return NextResponse.json({ error: `Machine not found with ID: ${machineId}` }, { status: 404 })
    }

    let amountPerCup: number
    if (typeof machine.price === "number") {
      amountPerCup = machine.price
    } else if (typeof machine.price === "string") {
      amountPerCup = Number.parseFloat(machine.price)
    } else {
      return NextResponse.json({ error: `Price not found for machine: ${machineId}` }, { status: 400 })
    }

    if (isNaN(amountPerCup) || amountPerCup <= 0) {
      return NextResponse.json(
        { error: `Invalid price value for machine: ${machineId}, price: ${machine.price}` },
        { status: 400 },
      )
    }

    const calculatedAmount = amountPerCup * Number.parseInt(numberOfCups)
    const amountInPaise = Math.round(calculatedAmount * 100)

    const razorpayRequest = {
      type: "upi_qr",
      name: `Coffee Machine ${machineId}`,
      usage: "single_use",
      fixed_amount: true,
      description: `${numberOfCups} cup(s) of coffee from Machine ${machineId}`,
      close_by: closeBy,
      payment_amount: amountInPaise,
      notes: {
        machineId,
        numberOfCups: numberOfCups.toString(),
        transactionId: uniqueTransactionId,
        amountPerCup: String(amountPerCup),
      },
    }

    console.log(`[DEBUG] Making Razorpay API request`)
    const response = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(razorpayRequest),
    })

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

    const razorpayResponse = await response.json()
    const qrCodeId = razorpayResponse.id

    console.log(`[DEBUG] Starting QR code extraction from URL: ${razorpayResponse.image_url}`)
    const qrBinaryData = await extractQRCodeAsBinary(razorpayResponse.image_url)

    if (!qrBinaryData || qrBinaryData.length === 0) {
      return NextResponse.json({ error: "Failed to extract QR code from image" }, { status: 500 })
    }

    // Ensure exactly 30276 binary values (174x174)
    if (qrBinaryData.length !== 30276) {
      return NextResponse.json(
        { error: `Invalid QR binary data length: ${qrBinaryData.length}, expected: 30276` },
        { status: 500 },
      )
    }

    // Format binary data as horizontal rows
    const qrBinaryRows = formatBinaryDataAsRowArray(qrBinaryData)
    const qrBinaryString = formatBinaryDataAsRows(qrBinaryData)

    const transactionData = {
      success: true,
      id: qrCodeId,
      imageUrl: razorpayResponse.image_url,
      // qrBinaryData: qrBinaryData, // Original flat array for backward compatibility
      // qrBinaryRows: qrBinaryRows, // Array of 174 strings, each 174 characters long
      qrBinaryString: qrBinaryString, // Single string with newlines separating rows
      // qrImageWidth: 174,
      // qrImageHeight: 174,
      // qrPixelFormat: "BINARY_LUMINANCE",
      // amount: razorpayResponse.payment_amount / 100,
      // description: razorpayResponse.description,
      // status: razorpayResponse.status,
      // createdAt: razorpayResponse.created_at,
      // expiresAt: razorpayResponse.close_by,
      // machineId,
      // numberOfCups,
      // amountPerCup,
      transactionId: uniqueTransactionId,
      // conversionFormula: "RGB→RGB565→8bit(R×8.225,G×4.047,B×8.225)→Y=0.299R+0.587G+0.114B→Binary(Y<128=1,Y≥128=0)",
    }

    // Store transaction in database (non-blocking)
    convex
      .mutation(api.transactions.createTransaction, {
        transactionId: qrCodeId,
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
      .catch((error) => {
        console.error(`[DEBUG] Error storing transaction: ${error}`)
      })

    console.log(`[DEBUG] Total API request processing took ${Date.now() - totalStartTime}ms`)
    return NextResponse.json(transactionData)
  } catch (error: unknown) {
    console.error(`[DEBUG] Error processing payment request:`, error)
    return NextResponse.json(
      {
        error: "Failed to process payment request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
