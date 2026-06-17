import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addIoTData = mutation({
  args: {
    machineId: v.string(),
    status: v.optional(v.string()),
    temperature: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { machineId, status, temperature } = args

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return {
        success: false,
        message: "Machine not found",
      }
    }

    // Validate status if provided
    if (status && status !== "online" && status !== "offline") {
      return {
        success: false,
        message: "Invalid status. Must be 'online' or 'offline'",
      }
    }

    // Prepare update object with only provided fields
    const updateData: any = {}
    if (status !== undefined) {
      updateData.status = status
    }
    if (temperature !== undefined) {
      updateData.temperature = temperature
    }

    // Update the machine with provided data
    await ctx.db.patch(machine._id, updateData)

    // Record a history snapshot whenever a real reading comes in (not on
    // status-only calls) — this table previously had nothing writing to it,
    // so the dashboard's "Machine Data History" was always empty.
    if (temperature !== undefined) {
      await ctx.db.insert("machine_data", {
        machineId,
        timestamp: new Date().toISOString(),
        temperature,
        rating: machine.rating,
        canisterLevel: machine.canisterLevel,
      })
    }

    return {
      success: true,
      message: "IoT data updated successfully",
      machineId,
      updatedFields: updateData,
    }
  },
})


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

