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

// Helper function to generate sequential scanId for a kitchen
async function generateScanId(ctx: any, kitchenId: string): Promise<string> {
  // Get all existing canisters for this kitchen to find the highest scanId number
  const existingCanisters = await ctx.db
    .query("canisters")
    .withIndex("by_kitchenId", (q: { eq: (arg0: string, arg1: string) => any }) => q.eq("kitchenId", kitchenId))
    .collect()

  let maxScanNumber = 0

  // Check all existing scanIds to find the highest number
  existingCanisters.forEach((canister: { scanId: string }) => {
    if (canister.scanId && canister.scanId.startsWith("KITCHEN_CAN_")) {
      const scanNumber = Number.parseInt(canister.scanId.replace("KITCHEN_CAN_", ""))
      if (!isNaN(scanNumber) && scanNumber > maxScanNumber) {
        maxScanNumber = scanNumber
      }
    }
  })

  // Generate next scanId
  const nextScanNumber = maxScanNumber + 1
  return `KITCHEN_CAN_${nextScanNumber}`
}

// Register a new canister
export const registerCanister = mutation({
  args: {
    kitchenId: v.string(),
    status: v.string(),
    scanType: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if kitchen exists
    const kitchen = await ctx.db
      .query("kitchens")
      .filter((q) => q.eq(q.field("userId"), args.kitchenId))
      .first()

    if (!kitchen) {
      throw new ConvexError("Kitchen not found")
    }

    // Auto-generate scanId
    const scanId = await generateScanId(ctx, args.kitchenId)

    const currentDateTime = getCurrentDateTime()

    const canisterId = await ctx.db.insert("canisters", {
      scanId,
      kitchenId: args.kitchenId,
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

// Get all canisters for a kitchen
export const getCanistersByKitchen = query({
  args: { kitchenId: v.string() },
  handler: async (ctx, args) => {
    const canisters = await ctx.db
      .query("canisters")
      .withIndex("by_kitchenId", (q) => q.eq("kitchenId", args.kitchenId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()

    return canisters
  },
})

// Submit daily scan details
export const submitDailyScan = mutation({
  args: {
    scanId: v.string(),
    status: v.string(),
    scanType: v.string(),
    scanDateTime: v.string(),
    kitchenId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify canister exists
    const canister = await ctx.db
      .query("canisters")
      .withIndex("by_scanId", (q) => q.eq("scanId", args.scanId))
      .first()

    if (!canister) {
      throw new ConvexError("Canister not found")
    }

    // Verify kitchen matches
    if (canister.kitchenId !== args.kitchenId) {
      throw new ConvexError("Canister does not belong to this kitchen")
    }

    // Extract date from scanDateTime for indexing
    const datePart = args.scanDateTime.split(",")[0] // Gets "28/07/2025" from "28/07/2025,01:15:38pm"

    const logId = generateLogId()

    // Insert into daily scan logs
    const scanLogId = await ctx.db.insert("dailyScanLogs", {
      ...args,
      date: datePart,
      logId,
    })

    // Update canister's last updated time and status
    await ctx.db.patch(canister._id, {
      status: args.status,
      lastUpdated: args.scanDateTime,
    })

    return { logId, scanLogId }
  },
})

// Get daily scan details for a kitchen and date
export const getDailyScanDetails = query({
  args: {
    kitchenId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const scanLogs = await ctx.db
      .query("dailyScanLogs")
      .withIndex("by_kitchenId_date", (q) => q.eq("kitchenId", args.kitchenId).eq("date", args.date))
      .collect()

    return scanLogs.map((log) => ({
      scanId: log.scanId,
      status: log.status,
      scanType: log.scanType,
      scanDateTime: log.scanDateTime,
      kitchenId: log.kitchenId,
      latitude: log.latitude,
      longitude: log.longitude,
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
