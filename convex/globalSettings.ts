import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getFlushTime = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("globalSettings").first();
    return settings?.flushTimeMinutes || 40;
  },
});

export const updateFlushTime = mutation({
  args: { flushTimeMinutes: v.number() },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("globalSettings").first();
    if (settings) {
      await ctx.db.patch(settings._id, { flushTimeMinutes: args.flushTimeMinutes });
    } else {
      await ctx.db.insert("globalSettings", { flushTimeMinutes: args.flushTimeMinutes });
    }
  },
});
