import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const reportSuccess = mutation({
  args: {
    machineId: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete any existing log for this machine so it doesn't pile up
    const existing = await ctx.db
      .query("otaSuccessLogs")
      .filter((q) => q.eq(q.field("machineId"), args.machineId))
      .collect();
      
    for (const log of existing) {
      await ctx.db.delete(log._id);
    }
    
    await ctx.db.insert("otaSuccessLogs", {
      machineId: args.machineId,
      version: args.version,
      timestamp: Date.now(),
    });
    return { success: true };
  },
})

export const listSuccessLogs = query({
  handler: async (ctx) => {
    const logs = await ctx.db.query("otaSuccessLogs").order("desc").collect();
    
    // Enrich with machine names
    const enrichedLogs = [];
    for (const log of logs) {
      const machine = await ctx.db
        .query("machines")
        .filter((q) => q.eq(q.field("id"), log.machineId))
        .first();
        
      enrichedLogs.push({
        ...log,
        machineName: machine ? machine.name : log.machineId,
      });
    }
    return enrichedLogs;
  },
})

export const deleteSuccessLog = mutation({
  args: { id: v.id("otaSuccessLogs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
})
