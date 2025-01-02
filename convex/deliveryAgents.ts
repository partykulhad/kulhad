import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Helper functions
function generateUserId(role: string, username: string): string {
  const prefix = role === 'kitchen' ? 'KITCHEN_' : 'REFILLER_';
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${username.toUpperCase()}_${randomSuffix}`;
}

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
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = generateUserId("refiller", args.username);

    // Insert into deliveryAgents table
    const newId = await ctx.db.insert("deliveryAgents", {
      ...args,
      role: "refiller",
      userId,
      createdAt: Date.now(),
      trips: [],
      salt: ""
    });

    // Insert into appUser table
    await ctx.db.insert("appUser", {
      username: args.username,
      password: args.password,
      role: "refiller",
      userId,
      name: args.name, // Add this line
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
    username: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, password, ...updateData } = args;
    const existingAgent = await ctx.db.get(id);
    
    if (!existingAgent) {
      throw new Error("Delivery agent not found");
    }

    let updatedFields: Partial<typeof existingAgent> = { ...updateData };

    if (password) {
      updatedFields.password = password;

      // Update appUser table
      const appUser = await ctx.db
        .query("appUser")
        .withIndex("by_userId", (q) => q.eq("userId", existingAgent.userId))
        .first();

      if (appUser) {
        await ctx.db.patch(appUser._id, {
          password,
        });
      }
    }

    // Update deliveryAgents table
    await ctx.db.patch(id, updatedFields);

    // Update username in appUser table if it has changed
    if (updateData.username !== existingAgent.username) {
      const appUser = await ctx.db
        .query("appUser")
        .withIndex("by_userId", (q) => q.eq("userId", existingAgent.userId))
        .first();

      if (appUser) {
        await ctx.db.patch(appUser._id, {
          username: updateData.username,
        });
      }
    }

    return id;
  },
});

// Delete delivery agent
export const remove = mutation({
  args: { id: v.id("deliveryAgents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) {
      throw new Error("Delivery agent not found");
    }

    // Delete from deliveryAgents table
    await ctx.db.delete(args.id);

    // Delete from appUser table
    const appUser = await ctx.db
      .query("appUser")
      .withIndex("by_userId", (q) => q.eq("userId", agent.userId))
      .first();

    if (appUser) {
      await ctx.db.delete(appUser._id);
    }
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

// Get a specific delivery agent by userId
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("deliveryAgents")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
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

// Update agent information
export const updateAgentInfo = mutation({
  args: {
    userId: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updateFields } = args;

    // Find the agent by userId
    const agent = await ctx.db
      .query("deliveryAgents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!agent) {
      throw new ConvexError("Delivery agent not found");
    }

    // Validate status if provided
    if (updateFields.status !== undefined && updateFields.status !== 'online' && updateFields.status !== 'offline') {
      throw new ConvexError("Invalid status. Must be 'online' or 'offline'");
    }

    // Update only the provided fields
    const fieldsToUpdate: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        fieldsToUpdate[key] = value;
      }
    }

    // Update the agent's information
    await ctx.db.patch(agent._id, fieldsToUpdate);

    return {
      success: true,
      message: "Agent information updated successfully",
    };
  },
});

