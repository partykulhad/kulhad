import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TOKEN_EXPIRY = 10 * 24 * 60 * 60 * 1000; // 10 days in milliseconds

function generateUserId(role: string, username: string): string {
  const prefix = role === 'kitchen' ? 'KITCHEN_' : 'REFILLER_';
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${username.toUpperCase()}_${randomSuffix}`;
}

async function generateToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function generateSalt(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const addAppUser = mutation({
  args: { username: v.string(), password: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("appUser")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUser) {
      return { success: false, error: "Username already exists" };
    }

    const userId = generateUserId(args.role, args.username);
    const salt = await generateSalt();
    const hashedPassword = await hashPassword(args.password, salt);

    const newUserId = await ctx.db.insert("appUser", {
      username: args.username,
      password: hashedPassword,
      salt: salt,
      role: args.role,
      userId: userId,
    });
    return { success: true, userId: userId };
  },
});

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

    // Handle cases where salt doesn't exist (for old users)
    if (!user.salt) {
      if (user.password === args.password) {
        // If old password matches, update with new salt and hashed password
        const salt = await generateSalt();
        const hashedPassword = await hashPassword(args.password, salt);
        await ctx.db.patch(user._id, { salt: salt, password: hashedPassword });
      } else {
        return { success: false, error: "Invalid password" };
      }
    } else {
      const hashedPassword = await hashPassword(args.password, user.salt);
      if (user.password !== hashedPassword) {
        return { success: false, error: "Invalid password" };
      }
    }

    const token = await generateToken();
    const expirationDate = new Date(Date.now() + TOKEN_EXPIRY);

    await ctx.db.patch(user._id, { 
      token: token, 
      tokenExpiration: expirationDate.getTime()
    });

    return {
      success: true,
      name:user.name,
      userId: user.userId,
      role: user.role,
      token: token,
      tokenExpireTime: `${TOKEN_EXPIRY / (24 * 60 * 60 * 1000)}d`,
      tokenExpireDate: expirationDate.toISOString(),
    };
  },
});

export const verifyToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    console.log("Verifying token:", args.token);
    
    const user = await ctx.db
      .query("appUser")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    console.log("User found:", user ? "Yes" : "No");
    
    if (!user) {
      console.log("No user found with the given token");
      return null;
    }

    if (!user.tokenExpiration) {
      console.log("Token expiration not set");
      return null;
    }

    if (Date.now() > user.tokenExpiration) {
      console.log("Token expired. Current time:", Date.now(), "Expiration:", user.tokenExpiration);
      return null;
    }

    console.log("Token verified successfully");
    return {
      userId: user.userId,
      role: user.role,
    };
  },
});

export const getUserByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("appUser")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!user) {
      return null;
    }

    return {
      userId: user.userId,
      username: user.username,
      role: user.role,
    };
  },
});

