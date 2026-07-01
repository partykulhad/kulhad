import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// GET — returns the current OTA version and download URL
export const getOtaConfig = query({
  args: {},
  handler: async (ctx) => {
    // Get the most recently deployed config
    const configs = await ctx.db
      .query("otaConfig")
      .order("desc")
      .take(1);
    return configs[0] ?? { version: "1.2.0", debUrl: null, deployedAt: 0 };
  },
});

// SET — admin deploys a new version
export const setOtaConfig = mutation({
  args: {
    version: v.string(),
    debUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Delete all previous entries (single-record pattern)
    const existing = await ctx.db.query("otaConfig").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    // Insert the new config
    await ctx.db.insert("otaConfig", {
      version: args.version,
      debUrl: args.debUrl,
      deployedAt: Date.now(),
    });

    return { success: true };
  },
});
