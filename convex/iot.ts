import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addIoTData = mutation({
  args: {
    machineId: v.string(),
    temperature: v.optional(v.number()),
    rating: v.optional(v.number()),
    canisterLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { machineId, temperature, rating, canisterLevel } = args;
    const timestamp = new Date().toISOString();

    const iotData: any = {
      machineId,
      timestamp,
    };

    if (temperature !== undefined) iotData.temperature = temperature;
    if (rating !== undefined) iotData.rating = rating;
    if (canisterLevel !== undefined) iotData.canisterLevel = canisterLevel;

    const iotDataId = await ctx.db.insert("machine_data", iotData);

    // Update the machine's data in the machines table
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first();

    if (machine) {
      const updateData: any = {};
      if (temperature !== undefined) updateData.temperature = temperature;
      if (rating !== undefined) updateData.rating = rating;
      if (canisterLevel !== undefined) updateData.canisterLevel = canisterLevel;

      if (Object.keys(updateData).length > 0) {
        await ctx.db.patch(machine._id, updateData);
      }
    }

    return { id: iotDataId, timestamp };
  },
});

export const getLatestIoTData = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const latestData = await ctx.db
      .query("machine_data")
      .filter((q) => q.eq(q.field("machineId"), args.machineId))
      .order("desc")
      .first();

    return latestData;
  },
});

