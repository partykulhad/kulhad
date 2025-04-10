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
    description: v.string(),
    model: v.string(),
    installedDate: v.optional(v.string()),
    address: v.object({
      building: v.string(),
      floor: v.string(),
      area: v.string(),
      district: v.string(),
      state: v.string(),
    }),
    gisLatitude: v.string(),
    gisLongitude: v.string(),
    price:v.optional(v.string()),
    startTime:  v.optional(v.string()),
    endTime:  v.optional(v.string()),
    flushTimeMinutes:  v.optional(v.number()),
    mlToDispense:  v.optional(v.number()),
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

export const getMachineData = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), args.machineId))
      .first()

    if (!machine) {
      return { success: false, error: "Machine not found" }
    }

    return {
      success: true,
      machineId: machine.id,
      price: machine.price || "N/A",
      status: machine.status,
      startTime: machine.startTime,
      endTime: machine.endTime,
      flushTimeMinutes: machine.flushTimeMinutes,
      mlToDispense: machine.mlToDispense,
    }
  },
})

export const update = mutation({
  args: {
    machineId: v.id("machines"),
    name: v.string(),
    description: v.string(),
    model: v.string(),
    installedDate: v.optional(v.string()),
    address: v.object({
      building: v.string(),
      floor: v.string(),
      area: v.string(),
      district: v.string(),
      state: v.string(),
    }),
    gisLatitude: v.string(),
    gisLongitude: v.string(),
    price: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    flushTimeMinutes: v.optional(v.number()),
    mlToDispense: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { machineId, ...updates } = args
    await ctx.db.patch(machineId, updates)
    return { id: machineId }
  },
})

export const remove = mutation({
  args: { id: v.id("machines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return { success: true }
  },
})

// Get machine by ID
export const getMachineById = query({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("machines")
      .withIndex("by_machineId", (q) => q.eq("id", args.machineId))
      .first()
  },
})



export const getByMachineId = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const machineData = await ctx.db
      .query("machine_data")
      .filter((q) => q.eq(q.field("machineId"), args.machineId))
      .order("desc")
      .take(10)

    return machineData
  },
})