import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper function to generate custom request ID
async function generateRequestId(ctx: any): Promise<string> {
  const prefix = "REQ"
  const lastRequest = await ctx.db.query("requests").order("desc").first()

  let counter = 1
  if (lastRequest && lastRequest.requestId) {
    const lastCounter = Number.parseInt(lastRequest.requestId.split("-")[1])
    counter = isNaN(lastCounter) ? 1 : lastCounter + 1
  }

  return `${prefix}-${counter.toString().padStart(4, "0")}`
}

export const checkCanisterLevel = mutation({
  args: { machineId: v.string(), canisterLevel: v.number() },
  handler: async (ctx, args) => {
    const { machineId, canisterLevel } = args

    if (canisterLevel > 20) {
      return { success: true, message: "Canister level is above threshold" }
    }

    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      throw new ConvexError("Machine not found")
    }

    // Check if kitchenId exists in the machine record
    if (!machine.kitchenId) {
      return {
        success: false,
        message: "No kitchen mapped to this machine",
        requestId: null,
        kitchenUserIds: [],
      }
    }

    const machineLat = Number.parseFloat(machine.gisLatitude)
    const machineLon = Number.parseFloat(machine.gisLongitude)

    if (isNaN(machineLat) || isNaN(machineLon)) {
      throw new ConvexError("Invalid machine coordinates")
    }

    const customRequestId = await generateRequestId(ctx)

    // Get the kitchenId from the machine record
    // It could be a single string or an array of strings
    const kitchenIds = Array.isArray(machine.kitchenId) ? machine.kitchenId : [machine.kitchenId]

    // Get the kitchen user IDs from the kitchens table
    const kitchenUserIds: string[] = []

    for (const kitchenId of kitchenIds) {
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q) => q.eq(q.field("userId"), kitchenId))
        .first()

      if (kitchen && kitchen.userId && kitchen.status === "online") {
        kitchenUserIds.push(kitchen.userId)
      }
    }

    // If no online kitchens found
    if (kitchenUserIds.length === 0) {
      // Update the request status if no kitchens were found
      const requestId = await ctx.db.insert("requests", {
        requestId: customRequestId,
        machineId: machineId,
        requestStatus: "No Kitchens Found",
        kitchenStatus: "Pending",
        agentStatus: "Pending",
        requestDateTime: new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
        dstAddress:
          machine.address.building +
          ", " +
          machine.address.floor +
          ", " +
          machine.address.area +
          ", " +
          machine.address.district +
          ", " +
          machine.address.state,
        dstLatitude: machineLat,
        dstLongitude: machineLon,
        kitchenUserId: [],
        agentUserId: "",
      })

      return {
        success: false,
        message: "No online kitchens found for this machine",
        requestId: customRequestId,
        kitchenUserIds: [],
      }
    }

    // Create initial request with basic information
    const requestId = await ctx.db.insert("requests", {
      requestId: customRequestId,
      machineId: machineId,
      requestStatus: "Pending",
      kitchenStatus: "Pending",
      agentStatus: "Pending",
      requestDateTime: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      dstAddress:
        machine.address.building +
        ", " +
        machine.address.floor +
        ", " +
        machine.address.area +
        ", " +
        machine.address.district +
        ", " +
        machine.address.state,
      dstLatitude: machineLat,
      dstLongitude: machineLon,
      kitchenUserId: kitchenUserIds,
      agentUserId: "",
    })

    // Store mapped kitchens in requestStatusUpdates
    for (const kitchenId of kitchenIds) {
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q) => q.eq(q.field("userId"), kitchenId))
        .first()

      if (kitchen && kitchen.userId && kitchen.status === "online") {
        await ctx.db.insert("requestStatusUpdates", {
          requestId: customRequestId,
          userId: kitchen.userId,
          status: "Pending",
          latitude: kitchen.latitude,
          longitude: kitchen.longitude,
          dateAndTime: new Date().toISOString(),
          isProceedNext: false,
        })
      }
    }

    return {
      success: true,
      message: "Request created and mapped kitchens identified",
      requestId: customRequestId,
      kitchenUserIds: kitchenUserIds,
    }
  },
})
