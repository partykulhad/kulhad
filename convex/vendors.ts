import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("vendors").collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    company: v.string(),
  },
  handler: async (ctx, args) => {
    const vendorId = await ctx.db.insert("vendors", {
      ...args,
      id: Math.random().toString(36).substr(2, 9),
      status: "Active",
      amountDue: 0,
      lastOrder: new Date().toISOString(),
      contactPerson: args.name,
    });
    return { id: vendorId };
  },
});

