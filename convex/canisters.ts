import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"

// Helper function to get current date and time
function getCurrentDateTime(): string {
  const now = new Date()
  const day = now.getDate().toString().padStart(2, "0")
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const year = now.getFullYear()
  const hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const seconds = now.getSeconds().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12
  return `${day}/${month}/${year},${displayHours.toString().padStart(2, "0")}:${minutes}:${seconds}${ampm.toLowerCase()}`
}

// Helper function to get current date only
function getCurrentDate(): string {
  const now = new Date()
  const day = now.getDate().toString().padStart(2, "0")
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const year = now.getFullYear()
  return `${day}/${month}/${year}`
}

// Helper function to generate unique log ID
function generateLogId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `LOG_${timestamp}_${random}`
}

// Helper function to generate globally unique scanId
async function generateScanId(ctx: any): Promise<string> {
  // Get ALL existing canisters across all users to find the highest scanId number
  const allCanisters = await ctx.db.query("canisters").collect()

  let maxScanNumber = 0

  // Check all existing scanIds globally to find the highest number
  allCanisters.forEach((canister: { scanId: string }) => {
    if (canister.scanId && canister.scanId.startsWith("KITCHEN_CAN_")) {
      const scanNumber = Number.parseInt(canister.scanId.replace("KITCHEN_CAN_", ""))
      if (!isNaN(scanNumber) && scanNumber > maxScanNumber) {
        maxScanNumber = scanNumber
      }
    }
  })

  // Generate next scanId globally
  const nextScanNumber = maxScanNumber + 1
  return `KITCHEN_CAN_${nextScanNumber}`
}

// Register a new canister
export const registerCanister = mutation({
  args: {
    userId: v.string(), // renamed from kitchenId to userId
    status: v.string(),
    scanType: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if user/kitchen exists
    const kitchen = await ctx.db
      .query("kitchens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first()

    if (!kitchen) {
      throw new ConvexError("Kitchen not found")
    }

    // Auto-generate globally unique scanId
    const scanId = await generateScanId(ctx)

    const currentDateTime = getCurrentDateTime()

    const canisterId = await ctx.db.insert("canisters", {
      scanId,
      kitchenId: args.userId, // using userId instead of kitchenId
      status: args.status,
      scanType: args.scanType,
      latitude: args.latitude,
      longitude: args.longitude,
      registrationDateTime: currentDateTime,
      lastUpdated: currentDateTime,
      isActive: true,
    })

    return { canisterId, scanId }
  },
})

// Get all canisters (for admin view)
export const getAllCanisters = query({
  handler: async (ctx) => {
    const canisters = await ctx.db
      .query("canisters")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect()

    return canisters
  },
})

// Get all canisters for a user
export const getCanistersByUser = query({
  args: { userId: v.string() }, // renamed from kitchenId to userId
  handler: async (ctx, args) => {
    const canisters = await ctx.db
      .query("canisters")
      .withIndex("by_kitchenId", (q) => q.eq("kitchenId", args.userId)) // updated index name
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()

    return canisters
  },
})

// Submit daily scan details - Updated to handle new schema
export const submitDailyScan = mutation({
  args: {
    scanId: v.string(),
    status: v.string(),
    scanType: v.string(),
    scanDateTime: v.string(),
    userId: v.string(), // renamed from kitchenId to userId
    latitude: v.number(),
    longitude: v.number(),
    orderId: v.optional(v.string()), // added optional orderId
  },
  handler: async (ctx, args) => {
    // Extract date from scanDateTime for indexing
    const datePart = args.scanDateTime.split(",")[0] // Gets "28/07/2025" from "28/07/2025,01:15:38pm"

    const logId = generateLogId()

    // Insert into daily scan logs with new schema
    const scanLogId = await ctx.db.insert("dailyScanLogs", {
      scanId: args.scanId,
      userId: args.userId, // using userId instead of kitchenId
      status: args.status,
      scanType: args.scanType,
      scanDateTime: args.scanDateTime,
      latitude: args.latitude,
      longitude: args.longitude,
      orderId: args.orderId || "", // added orderId with default empty string
      date: datePart,
      logId,
    })

    return { logId, scanLogId }
  },
})

// Get daily scan details for a user and date
export const getDailyScanDetails = query({
  args: {
    userId: v.string(), // renamed from kitchenId to userId
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const scanLogs = await ctx.db
      .query("dailyScanLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", args.userId).eq("date", args.date)) // updated index name
      .collect()

    return scanLogs.map((log) => ({
      scanId: log.scanId,
      status: log.status,
      scanType: log.scanType,
      scanDateTime: log.scanDateTime,
      userId: log.userId, // using userId instead of kitchenId
      latitude: log.latitude,
      longitude: log.longitude,
      orderId: log.orderId, // added orderId to response
    }))
  },
})

// Update canister details
export const updateCanister = mutation({
  args: {
    scanId: v.string(),
    status: v.optional(v.string()),
    scanType: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const canister = await ctx.db
      .query("canisters")
      .withIndex("by_scanId", (q) => q.eq("scanId", args.scanId))
      .first()

    if (!canister) {
      throw new ConvexError("Canister not found")
    }

    const { scanId, ...updateFields } = args
    const fieldsToUpdate = Object.fromEntries(Object.entries(updateFields).filter(([_, value]) => value !== undefined))

    if (Object.keys(fieldsToUpdate).length > 0) {
      await ctx.db.patch(canister._id, {
        ...fieldsToUpdate,
        lastUpdated: getCurrentDateTime(),
      })
    }

    return canister._id
  },
})

// Deactivate canister
export const deactivateCanister = mutation({
  args: { scanId: v.string() },
  handler: async (ctx, args) => {
    const canister = await ctx.db
      .query("canisters")
      .withIndex("by_scanId", (q) => q.eq("scanId", args.scanId))
      .first()

    if (!canister) {
      throw new ConvexError("Canister not found")
    }

    await ctx.db.patch(canister._id, {
      isActive: false,
      lastUpdated: getCurrentDateTime(),
    })

    return canister._id
  },
})

// Helper function to get canister details by scanId (useful for debugging)
export const getCanisterByScanId = query({
  args: { scanId: v.string() },
  handler: async (ctx, args) => {
    const canister = await ctx.db
      .query("canisters")
      .withIndex("by_scanId", (q) => q.eq("scanId", args.scanId))
      .first()

    return canister
  },
})
