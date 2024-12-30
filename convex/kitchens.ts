import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper functions
function generateUserId(role: string, username: string): string {
  const prefix = role === 'kitchen' ? 'KITCHEN_' : 'REFILLER_';
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${username.toUpperCase()}_${randomSuffix}`;
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

export const add = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    manager: v.string(),
    managerMobile: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    capacity: v.number(),
    username: v.string(),
    password: v.string(),
    members: v.array(
      v.object({
        name: v.string(),
        mobile: v.string(),
        email: v.string(),
        adhaar: v.string(),
        address: v.string(),
        uid: v.string(),
        startingDate: v.string(),
        company: v.string(),
        pan: v.string(),
        photoStorageId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const salt = await generateSalt();
    const hashedPassword = await hashPassword(args.password, salt);
    const userId = generateUserId("kitchen", args.username);

    const kitchenId = await ctx.db.insert("kitchens", {
      ...args,
      userId,
      salt,
      role: "kitchen",
      password: hashedPassword,
    });

    await ctx.db.insert("appUser", {
      username: args.username,
      password: hashedPassword,
      salt,
      role: "kitchen",
      userId,
    });

    return kitchenId;
  },
});

export const edit = mutation({
  args: {
    id: v.id("kitchens"),
    name: v.string(),
    address: v.string(),
    manager: v.string(),
    managerMobile: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    capacity: v.number(),
    username: v.string(),
    password: v.optional(v.string()),
    members: v.array(
      v.object({
        name: v.string(),
        mobile: v.string(),
        email: v.string(),
        adhaar: v.string(),
        address: v.string(),
        uid: v.string(),
        startingDate: v.string(),
        company: v.string(),
        pan: v.string(),
        photoStorageId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { id, password, ...updates } = args;
    const existingKitchen = await ctx.db.get(id);

    if (!existingKitchen) {
      throw new Error("Kitchen not found");
    }

    let updatedFields: any = { ...updates };

    if (password) {
      const salt = await generateSalt();
      const hashedPassword = await hashPassword(password, salt);
      updatedFields.password = hashedPassword;
      updatedFields.salt = salt;

      // Update appUser table
      const appUser = await ctx.db
        .query("appUser")
        .withIndex("by_userId", (q) => q.eq("userId", existingKitchen.userId))
        .first();

      if (appUser) {
        await ctx.db.patch(appUser._id, {
          password: hashedPassword,
          salt,
        });
      }
    }

    await ctx.db.patch(id, updatedFields);

    // Update username in appUser table if it has changed
    if (updates.username !== existingKitchen.username) {
      const appUser = await ctx.db
        .query("appUser")
        .withIndex("by_userId", (q) => q.eq("userId", existingKitchen.userId))
        .first();

      if (appUser) {
        await ctx.db.patch(appUser._id, {
          username: updates.username,
        });
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("kitchens") },
  handler: async (ctx, { id }) => {
    const kitchen = await ctx.db.get(id);
    if (!kitchen) {
      throw new Error("Kitchen not found");
    }

    await ctx.db.delete(id);

    // Delete from appUser table
    const appUser = await ctx.db
      .query("appUser")
      .withIndex("by_userId", (q) => q.eq("userId", kitchen.userId))
      .first();

    if (appUser) {
      await ctx.db.delete(appUser._id);
    }
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("kitchens").collect();
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getPhotoUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getKitchenByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const kitchen = await ctx.db
      .query("kitchens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!kitchen) {
      return null;
    }

    return kitchen;
  },
});

