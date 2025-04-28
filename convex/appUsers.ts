import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

const TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

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
      .first()

    if (!user) {
      return { success: false, error: "User not found" }
    }

    if (user.password !== args.password) {
      return { success: false, error: "Invalid password" }
    }

    const token = await generateToken()
    const expirationDate = new Date(Date.now() + TOKEN_EXPIRY)

    await ctx.db.patch(user._id, {
      token: token,
      tokenExpiration: expirationDate.getTime(),
    })

    return {
      success: true,
      name: user.name,
      userId: user.userId,
      role: user.role,
      token: token,
      tokenExpireTime: "30d", // Changed to 30 days
      tokenExpireDate: expirationDate.toISOString(),
    }
  },
})

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

export const updateFCMToken = mutation({
  args: {
    userId: v.string(),
    fcmToken: v.string(),
    userDevice: v.string(),
    appVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, fcmToken, userDevice, appVersion } = args

    try {
      // Find the user by userId
      const user = await ctx.db
        .query("appUser")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first()

      if (!user) {
        return {
          code: 400,
          success: false,
          message: "User not found",
        }
      }

      // Update the user with new FCM token and related information
      await ctx.db.patch(user._id, {
        fcmToken,
        userDevice,
        appVersion,
      })

      return {
        code: 200,
        success: true,
        message: "FCM Token updated successfully",
      }
    } catch (error) {
      console.error("Error updating FCM token:", error)
      return {
        code: 400,
        success: false,
        message: "An error occurred while updating FCM token",
      }
    }
  },
})

export const logoutUser = mutation({
  args: {
    userId: v.string(),
    fcmToken: v.string(),
    userDevice: v.string(),
    appVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, fcmToken } = args

    try {
      // Find the user by userId
      const user = await ctx.db
        .query("appUser")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first()

      if (!user) {
        // Even if user not found, return success as per requirements
        return {
          code: 200,
          success: true,
          message: "User logout updated successfully",
        }
      }

      // Check if the provided FCM token matches the one in the database
      if (user.fcmToken === fcmToken) {
        // If tokens match, remove the FCM token by setting it to empty string
        await ctx.db.patch(user._id, {
          fcmToken: "", // Remove the token
          userDevice:"",
          appVersion:"",
        })
      }

      // Return success regardless of whether token was removed or not
      return {
        code: 200,
        success: true,
        message: "User logout updated successfully",
      }
    } catch (error) {
      console.error("Error processing user logout:", error)
      // Still return success as per requirements
      return {
        code: 200,
        success: true,
        message: "User logout updated successfully",
      }
    }
  },
})


export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("appUser")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first()

    return user
  },
})

export const changePassword = mutation({
  args: { userId: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const { userId, newPassword } = args;

    // Find the user by userId with proper type annotation
    const user: Doc<"appUser"> | null = await ctx.db
      .query("appUser")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Update the user's password in appUser table
    await ctx.db.patch(user._id, { password: newPassword });

    // Check and update password in deliveryAgents table if userId exists
    const deliveryAgent = await ctx.db
      .query("deliveryAgents")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (deliveryAgent) {
      await ctx.db.patch(deliveryAgent._id, { password: newPassword });
    }

    // Check and update password in kitchens table if userId exists
    const kitchen = await ctx.db
      .query("kitchens")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (kitchen) {
      await ctx.db.patch(kitchen._id, { password: newPassword });
    }

    return { 
      success: true,
      message: "Password updated successfully in all relevant tables" 
    };
  },
});
