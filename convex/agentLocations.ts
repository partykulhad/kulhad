import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// Define a schema for agent locations if you want to track location history
// This would be a separate table in your schema
// For now, we'll create a function that returns location data from the deliveryAgents table

// Get agent's current location
export const getCurrentLocation = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const { agentId } = args

    const agent = await ctx.db
      .query("deliveryAgents")
      .withIndex("by_userId", (q) => q.eq("userId", agentId))
      .first()

    if (!agent || agent.latitude === undefined || agent.longitude === undefined) {
      return null
    }

    return {
      agentId: agent.userId,
      latitude: agent.latitude,
      longitude: agent.longitude,
      lastUpdated: new Date(agent.createdAt).toISOString(),
      name: agent.name,
    }
  },
})

// Get location history for an agent
// Since we don't have a dedicated location history table in the schema,
// this is a placeholder that returns an empty array
export const getByAgentId = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    // In a real implementation, you would query a location history table
    // For now, we'll return an empty array
    return []
  },
})

// Update agent location
export const updateLocation = mutation({
  args: {
    agentId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const { agentId, latitude, longitude } = args

    const agent = await ctx.db
      .query("deliveryAgents")
      .withIndex("by_userId", (q) => q.eq("userId", agentId))
      .first()

    if (!agent) {
      throw new Error("Agent not found")
    }

    // Update the agent's location
    await ctx.db.patch(agent._id, {
      latitude,
      longitude,
    })

    return { success: true }
  },
})
