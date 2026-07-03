import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Tag CRUD ─────────────────────────────────────────────────────────────────

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("rfidTags").order("desc").collect();
  },
});

export const getByCardId = query({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rfidTags")
      .withIndex("by_cardId", (q) => q.eq("cardId", args.cardId.toUpperCase()))
      .first();
  },
});

export const add = mutation({
  args: {
    cardId: v.string(),
    label: v.string(),
    role: v.string(),          // "dispensing" | "maintenance"
    balance: v.number(),
    isActive: v.boolean(),
    allowedMachines: v.optional(v.array(v.string())),
    maintenanceAction: v.optional(v.string()),
    maintenanceDuration: v.optional(v.number()),
    maintenanceMessage: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cardId = args.cardId.toUpperCase().trim();
    // Prevent duplicates
    const existing = await ctx.db
      .query("rfidTags")
      .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
      .first();
    if (existing) {
      throw new Error(`Card ID ${cardId} already registered`);
    }
    const id = await ctx.db.insert("rfidTags", {
      ...args,
      cardId,
      createdAt: Date.now(),
    });
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("rfidTags"),
    label: v.optional(v.string()),
    role: v.optional(v.string()),
    balance: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    allowedMachines: v.optional(v.array(v.string())),
    maintenanceAction: v.optional(v.string()),
    maintenanceDuration: v.optional(v.number()),
    maintenanceMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { id };
  },
});

export const remove = mutation({
  args: { id: v.id("rfidTags") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const toggleActive = mutation({
  args: { id: v.id("rfidTags") },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.id);
    if (!tag) throw new Error("Tag not found");
    await ctx.db.patch(args.id, { isActive: !tag.isActive });
    return { isActive: !tag.isActive };
  },
});

// Top-up or deduct balance
export const adjustBalance = mutation({
  args: { id: v.id("rfidTags"), delta: v.number() },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.id);
    if (!tag) throw new Error("Tag not found");
    const newBalance = Math.max(0, tag.balance + args.delta);
    await ctx.db.patch(args.id, { balance: newBalance });
    return { balance: newBalance };
  },
});

// ─── Auth session management (called by API routes) ───────────────────────────

export const createSession = mutation({
  args: {
    sessionId: v.string(),
    cardId: v.string(),
    machineId: v.string(),
    challenge: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("rfidSessions", {
      ...args,
      step: 1,
      createdAt: now,
      expiresAt: now + 60_000, // 60 s TTL
    });
    return { sessionId: args.sessionId };
  },
});

export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rfidSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const advanceSession = mutation({
  args: { sessionId: v.string(), step: v.number() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("rfidSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) throw new Error("Session not found");
    await ctx.db.patch(session._id, { step: args.step });
    return { ok: true };
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("rfidSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (session) await ctx.db.delete(session._id);
    return { ok: true };
  },
});

// Deduct one cup from a dispensing card — called on successful /verify
export const consumeDispense = mutation({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const tag = await ctx.db
      .query("rfidTags")
      .withIndex("by_cardId", (q) => q.eq("cardId", args.cardId.toUpperCase()))
      .first();
    if (!tag) throw new Error("Tag not found");
    const newBalance = Math.max(0, tag.balance - 1);
    await ctx.db.patch(tag._id, { balance: newBalance, lastUsedAt: Date.now() });
    return { balance: newBalance };
  },
});

// Mark last used without deducting (maintenance cards)
export const touchLastUsed = mutation({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const tag = await ctx.db
      .query("rfidTags")
      .withIndex("by_cardId", (q) => q.eq("cardId", args.cardId.toUpperCase()))
      .first();
    if (tag) await ctx.db.patch(tag._id, { lastUsedAt: Date.now() });
    return { ok: true };
  },
});
