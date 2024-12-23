import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const authenticateAppUser = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("appUser")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // In a real-world scenario, you should use proper password hashing and comparison
    if (user.password !== args.password) {
      return { success: false, error: "Invalid password" };
    }

    return { success: true, userId: user._id };
  },
});

