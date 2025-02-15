import { action, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { api } from "./_generated/api"

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

    const nearestKitchen = await findNearestKitchen(ctx, machineLat, machineLon)

    if (!nearestKitchen) {
      throw new ConvexError("No online kitchen found")
    }

    const customRequestId = await generateRequestId(ctx)

    const requestId = await ctx.db.insert("requests", {
      requestId: customRequestId,
      machineId: machineId,
      kitchenUserId: nearestKitchen.userId,
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
      dstContactName: machine.name,
      agentUserId: ""
    })

    // Schedule the action to handle kitchen and agent responses
    await ctx.scheduler.runAfter(0, api.canisterCheck.processRequest, { requestId })

    return {
      success: true,
      message: "Request created and scheduled for processing",
      requestId: customRequestId,
    }
  },
})

export const processRequest = action({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const { requestId } = args
    const request = await ctx.runQuery(api.canisterCheck.getRequest, { requestId })

    if (!request) {
      throw new ConvexError("Request not found")
    }

    switch (request.requestStatus) {
      case "Pending":
        if (request.kitchenStatus === "Pending") {
          // Wait for kitchen response
          await ctx.scheduler.runAfter(20000, api.canisterCheck.processRequest, { requestId })
        } else if (request.kitchenStatus === "Accepted" && request.agentStatus === "Pending") {
          await handleAgentSearch(ctx, requestId, request)
        } else if (request.kitchenStatus === "Rejected") {
          await handleKitchenRejection(ctx, requestId, request)
        }
        break
      case "Accepted":
      case "Failed":
        // Request is completed, no further action needed
        break
    }
  },
})

async function handleAgentSearch(ctx: any, requestId: Id<"requests">, request: any) {
  const kitchen = await ctx.runQuery(api.canisterCheck.getKitchen, { kitchenId: request.kitchenUserId })
  if (!kitchen) {
    throw new ConvexError("Kitchen not found")
  }

  const nearestAgent = await ctx.runQuery(api.canisterCheck.findNearestAgent, {
    kitchenLat: kitchen.latitude,
    kitchenLon: kitchen.longitude,
  })

  if (!nearestAgent) {
    await ctx.runMutation(api.canisterCheck.updateRequestStatus, {
      requestId,
      status: "Failed",
      message: "No online delivery agent found",
    })
  } else {
    await ctx.runMutation(api.canisterCheck.updateRequest, {
      requestId,
      updates: {
        agentUserId: nearestAgent.userId,
        agentStatus: "Pending",
        srcAddress: kitchen.address,
        srcLatitude: kitchen.latitude,
        srcLongitude: kitchen.longitude,
        srcContactName: kitchen.manager,
        srcContactNumber: kitchen.managerMobile,
      },
    })
    // Schedule the next check for agent response
    await ctx.scheduler.runAfter(20000, api.canisterCheck.processRequest, { requestId })
  }
}

async function handleKitchenRejection(ctx: any, requestId: Id<"requests">, request: any) {
  const machine = await ctx.runQuery(api.canisterCheck.getMachine, { machineId: request.machineId })
  if (!machine) {
    throw new ConvexError("Machine not found")
  }

  const nextKitchen = await ctx.runQuery(api.canisterCheck.findNextNearestKitchen, {
    machineLat: Number.parseFloat(machine.gisLatitude),
    machineLon: Number.parseFloat(machine.gisLongitude),
    excludeKitchenId: request.kitchenUserId,
  })

  if (!nextKitchen) {
    await ctx.runMutation(api.canisterCheck.updateRequestStatus, {
      requestId,
      status: "Failed",
      message: "No other online kitchen found",
    })
  } else {
    await ctx.runMutation(api.canisterCheck.updateRequest, {
      requestId,
      updates: {
        kitchenUserId: nextKitchen.userId,
        kitchenStatus: "Pending",
      },
    })
    // Schedule the next check for kitchen response
    await ctx.scheduler.runAfter(20000, api.canisterCheck.processRequest, { requestId })
  }
}

export const updateKitchenStatus = mutation({
  args: { requestId: v.id("requests"), status: v.string() },
  handler: async (ctx, args) => {
    const { requestId, status } = args
    await ctx.db.patch(requestId, { kitchenStatus: status })
    // Trigger the processRequest action to handle the status change
    await ctx.scheduler.runAfter(0, api.canisterCheck.processRequest, { requestId })
  },
})

export const updateAgentStatus = mutation({
  args: { requestId: v.id("requests"), status: v.string() },
  handler: async (ctx, args) => {
    const { requestId, status } = args
    await ctx.db.patch(requestId, { agentStatus: status })
    if (status === "Accepted") {
      await ctx.db.patch(requestId, { requestStatus: "Accepted" })
    } else if (status === "Rejected") {
      // If agent rejects, reset agent status and trigger processRequest to find a new agent
      await ctx.db.patch(requestId, { agentStatus: "Pending", agentUserId: undefined })
    }
  },
})

export const getRequest = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("requestId"), args.requestId))
      .first()
  },
})

export const getMachine = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), args.machineId))
      .first()
  },
})

export const getKitchen = query({
  args: { kitchenId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kitchens")
      .filter((q) => q.eq(q.field("userId"), args.kitchenId))
      .first()
  },
})

export const findNextNearestKitchen = query({
  args: { machineLat: v.number(), machineLon: v.number(), excludeKitchenId: v.string() },
  handler: async (ctx, args) => {
    const { machineLat, machineLon, excludeKitchenId } = args
    const kitchens = await ctx.db.query("kitchens").collect()
    const onlineKitchens = kitchens.filter(
      (kitchen: Doc<"kitchens">) => kitchen.status === "online" && kitchen.userId !== excludeKitchenId,
    )

    if (onlineKitchens.length === 0) {
      return null
    }

    const sortedKitchens = onlineKitchens.sort((a: Doc<"kitchens">, b: Doc<"kitchens">) => {
      const distanceA = calculateDistance(machineLat, machineLon, a.latitude, a.longitude)
      const distanceB = calculateDistance(machineLat, machineLon, b.latitude, b.longitude)
      return distanceA - distanceB
    })

    return sortedKitchens[0]
  },
})

export const findNearestAgent = query({
  args: { kitchenLat: v.number(), kitchenLon: v.number() },
  handler: async (ctx, args) => {
    const { kitchenLat, kitchenLon } = args
    const agents = await ctx.db.query("deliveryAgents").collect()
    const onlineAgents = agents.filter((agent: Doc<"deliveryAgents">) => agent.status === "online")

    if (onlineAgents.length === 0) {
      return null
    }

    const agentsWithCoordinates = onlineAgents.filter(
      (agent: Doc<"deliveryAgents">) => agent.latitude !== undefined && agent.longitude !== undefined,
    )

    if (agentsWithCoordinates.length === 0) {
      // If no agents have coordinates, return the first online agent
      return onlineAgents[0]
    }

    const sortedAgents = agentsWithCoordinates.sort((a: Doc<"deliveryAgents">, b: Doc<"deliveryAgents">) => {
      const distanceA = calculateDistance(kitchenLat, kitchenLon, a.latitude!, a.longitude!)
      const distanceB = calculateDistance(kitchenLat, kitchenLon, b.latitude!, b.longitude!)
      return distanceA - distanceB
    })

    return sortedAgents[0]
  },
})

export const updateRequest = mutation({
  args: { requestId: v.id("requests"), updates: v.object({}) },
  handler: async (ctx, args) => {
    const { requestId, updates } = args
    await ctx.db.patch(requestId, updates)
  },
})

export const updateRequestStatus = mutation({
  args: { requestId: v.id("requests"), status: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    const { requestId, status, message } = args
    await ctx.db.patch(requestId, { requestStatus: status, statusMessage: message })
  },
})

async function findNearestKitchen(ctx: any, machineLat: number, machineLon: number): Promise<Doc<"kitchens"> | null> {
  const kitchens = await ctx.db.query("kitchens").collect()
  const onlineKitchens = kitchens.filter((kitchen: Doc<"kitchens">) => kitchen.status === "online")

  if (onlineKitchens.length === 0) {
    return null
  }

  const sortedKitchens = onlineKitchens.sort((a: Doc<"kitchens">, b: Doc<"kitchens">) => {
    const distanceA = calculateDistance(machineLat, machineLon, a.latitude, a.longitude)
    const distanceB = calculateDistance(machineLat, machineLon, b.latitude, b.longitude)
    return distanceA - distanceB
  })

  return sortedKitchens[0]
}

