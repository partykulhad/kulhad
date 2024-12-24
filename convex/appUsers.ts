import { v } from "convex/values";
import { mutation } from "./_generated/server";
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const TOKEN_EXPIRY = '10d'; // Token expires in 10 days

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

    // Generate JWT token
    const token = await new jose.SignJWT({ userId: user._id, username: user.username, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(JWT_SECRET);

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 10); // Token expires in 10 days

    return {
      success: true,
      userId: user._id,
      role: user.role,
      token: token,
      tokenExpireTime: TOKEN_EXPIRY,
      tokenExpireDate: expirationDate.toISOString(),
    };
  },
});

export const addAppUser = mutation({
  args: { username: v.string(), password: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("appUser", {
      username: args.username,
      password: args.password, // Remember: In a real app, hash this password!
      role: args.role,
    });
    return { success: true, userId };
  },
});

