import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("machines").collect();
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    location: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const machineId = await ctx.db.insert("machines", {
      ...args,
      status: "offline",
      temperature: 70,
      rating: 0,
      canisterLevel: 100,
      replenishmentOrder: { status: "Not required", eta: null },
      deliveryBoy: null,
      lastFulfilled: new Date().toISOString(),
    });
    return { id: machineId };
  },
});

export const toggleStatus = mutation({
  args: { id: v.id("machines") },
  handler: async (ctx, args) => {
    const machine = await ctx.db.get(args.id);
    if (!machine) throw new Error("Machine not found");
    
    const newStatus = machine.status === "online" ? "offline" : "online";
    await ctx.db.patch(args.id, { status: newStatus });
    return { id: args.id, status: newStatus };
  },
});

export const updateMachineData = mutation({
  args: {
    id: v.id("machines"),
    temperature: v.number(),
    rating: v.number(),
    canisterLevel: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, temperature, rating, canisterLevel } = args;
    const machine = await ctx.db.get(id);
    if (!machine) throw new Error("Machine not found");

    await ctx.db.patch(id, { temperature, rating, canisterLevel });
    return { id, temperature, rating, canisterLevel };
  },
});

export const getMachineDetails = query({
  args: { id: v.id("machines") },
  handler: async (ctx, args) => {
    const machine = await ctx.db.get(args.id);
    if (!machine) throw new Error("Machine not found");
    return machine;
  },
});

