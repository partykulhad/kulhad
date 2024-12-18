import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Generate upload URL for images
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Add new delivery agent
export const add = mutation({
  args: {
    name: v.string(),
    mobile: v.string(),
    email: v.string(),
    adhaar: v.string(),
    address: v.string(),
    uid: v.string(),
    startingDate: v.string(),
    company: v.string(),
    pan: v.string(),
    photoStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const newId = await ctx.db.insert("deliveryAgents", {
      ...args,
      createdAt: Date.now(),
      trips: [], // Initialize trips as an empty array
    });
    return newId;
  },
});

// Edit existing delivery agent
export const edit = mutation({
  args: {
    id: v.id("deliveryAgents"),
    name: v.string(),
    mobile: v.string(),
    email: v.string(),
    adhaar: v.string(),
    address: v.string(),
    uid: v.string(),
    startingDate: v.string(),
    company: v.string(),
    pan: v.string(),
    photoStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    await ctx.db.patch(id, updateData);
    return id;
  },
});

// Delete delivery agent
export const remove = mutation({
  args: { id: v.id("deliveryAgents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// List all delivery agents
export const list = query({
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("deliveryAgents")
      .order("desc")
      .collect();
    
    return agents;
  },
});

// Get a specific delivery agent by ID
export const getById = query({
  args: { id: v.id("deliveryAgents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new ConvexError("Delivery agent not found");
    return agent;
  },
});

// Get photo URL by storageId
export const getPhotoUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (url === null) {
      throw new ConvexError("Photo not found");
    }
    return url;
  },
});

