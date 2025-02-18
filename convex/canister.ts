import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import type { Doc } from "./_generated/dataModel"

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

    const machineLat = Number.parseFloat(machine.gisLatitude)
    const machineLon = Number.parseFloat(machine.gisLongitude)

    if (isNaN(machineLat) || isNaN(machineLon)) {
      throw new ConvexError("Invalid machine coordinates")
    }

    const customRequestId = await generateRequestId(ctx)

    // Create initial request with basic information
    const requestId = await ctx.db.insert("requests", {
      requestId: customRequestId,
      machineId: machineId,
      requestStatus: "Pending",
      kitchenStatus: "Pending",
      agentStatus: "Pending",
      requestDateTime: new Date().toISOString(),
      dstAddress: machine.address.building +
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
      agentUserId: ""
    })

    // Search for nearby kitchens
    const radiusRanges = [2, 3, 4, 5] // km
    let foundKitchens = false
    const foundKitchenUserIds: string[] = []

    for (const radius of radiusRanges) {
      const nearbyKitchens = await findNearbyKitchens(ctx, machineLat, machineLon, radius)

      if (nearbyKitchens.length > 0) {
        foundKitchens = true

        // Store found kitchens in requestStatusUpdates and collect user IDs
        for (const kitchen of nearbyKitchens) {
          await ctx.db.insert("requestStatusUpdates", {
            requestId: customRequestId,
            userId: kitchen.userId,
            status: "Pending",
            latitude: kitchen.latitude,
            longitude: kitchen.longitude,
            dateAndTime: new Date().toISOString(),
            isProceedNext: false,
          })
          foundKitchenUserIds.push(kitchen.userId)
        }

        break // Exit the loop if kitchens are found
      }
    }

    if (!foundKitchens) {
      // Update the request status if no kitchens were found
      await ctx.db.patch(requestId, { requestStatus: "No Kitchens Found" })
      return {
        success: false,
        message: "No nearby kitchens found",
        requestId: customRequestId,
        kitchenUserIds: [],
      }
    }

    // Update the request with found kitchen user IDs
    await ctx.db.patch(requestId, { kitchenUserId: foundKitchenUserIds })

    return {
      success: true,
      message: "Request created and nearby kitchens identified",
      requestId: customRequestId,
      kitchenUserIds: foundKitchenUserIds,

    }
  },
})

async function findNearbyKitchens(
  ctx: any,
  machineLat: number,
  machineLon: number,
  radius: number,
): Promise<Doc<"kitchens">[]> {
  const kitchens = await ctx.db.query("kitchens").collect()
  const onlineKitchens = kitchens.filter((kitchen: Doc<"kitchens">) => kitchen.status === "online")

  const nearbyKitchens = onlineKitchens.filter((kitchen: Doc<"kitchens">) => {
    const distance = calculateDistance(machineLat, machineLon, kitchen.latitude, kitchen.longitude)
    return distance <= radius
  })

  return nearbyKitchens
}

