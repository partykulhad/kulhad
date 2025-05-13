import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { ConvexError } from "convex/values"

// Get all request status updates
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("requestStatusUpdates").collect()
  },
})

// Get request status updates by request ID
export const getByRequestId = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requestStatusUpdates")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .collect()
  },
})

// Get cancelled status updates by user ID
export const getCancelledByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requestStatusUpdates")
      .filter((q) => q.and(q.eq(q.field("userId"), args.userId), q.eq(q.field("status"), "Cancelled")))
      .collect()
  },
})

// Create a new request status update
export const create = mutation({
  args: {
    requestId: v.string(),
    userId: v.string(),
    status: v.string(),
    priority: v.optional(v.number()),
    latitude: v.number(),
    longitude: v.number(),
    dateAndTime: v.string(),
    isProceedNext: v.boolean(),
    teaType: v.optional(v.string()),
    quantity: v.optional(v.number()),
    reason: v.optional(v.string()),
    message: v.optional(v.string()),
    totalDistance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("requestStatusUpdates", args)
  },
})

// Update a request status update
export const update = mutation({
  args: {
    id: v.id("requestStatusUpdates"),
    status: v.optional(v.string()),
    priority: v.optional(v.number()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    dateAndTime: v.optional(v.string()),
    isProceedNext: v.optional(v.boolean()),
    teaType: v.optional(v.string()),
    quantity: v.optional(v.number()),
    reason: v.optional(v.string()),
    message: v.optional(v.string()),
    totalDistance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args
    const existingUpdate = await ctx.db.get(id)

    if (!existingUpdate) {
      throw new ConvexError("Request status update not found")
    }

    return await ctx.db.patch(id, updateData)
  },
})

// Delete a request status update
export const remove = mutation({
  args: { id: v.id("requestStatusUpdates") },
  handler: async (ctx, args) => {
    const existingUpdate = await ctx.db.get(args.id)

    if (!existingUpdate) {
      throw new ConvexError("Request status update not found")
    }

    await ctx.db.delete(args.id)
    return { success: true }
  },
})
