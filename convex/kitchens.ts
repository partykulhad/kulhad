import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values"
import type { Doc } from "./_generated/dataModel"

// Helper functions
function generateUserId(role: string, username: string): string {
  const prefix = role === 'kitchen' ? 'KITCHEN_' : 'REFILLER_';
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${username.toUpperCase()}_${randomSuffix}`;
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
    const userId = generateUserId("kitchen", args.username);

    const kitchenId = await ctx.db.insert("kitchens", {
      ...args,
      userId,
      role: "kitchen",
      salt: ""
    });

    await ctx.db.insert("appUser", {
      username: args.username,
      password: args.password,
      role: "kitchen",
      userId,
      name: args.name, // Add this line
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
      updatedFields.password = password;

      // Update appUser table
      const appUser = await ctx.db
        .query("appUser")
        .withIndex("by_userId", (q) => q.eq("userId", existingKitchen.userId))
        .first();

      if (appUser) {
        await ctx.db.patch(appUser._id, {
          password: password,
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

export const getKitchenByUserId1 = query({
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

export const getKitchenByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const kitchen = await ctx.db
      .query("kitchens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!kitchen) {
      throw new Error("Kitchen not found");
    }

    return kitchen;
  },
});

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const declineAndReassign = mutation({
  args: { userId: v.string(), requestId: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const { userId, requestId, status } = args

    if (status !== "declined") {
      throw new ConvexError("Invalid status. Only 'declined' is accepted.")
    }

    // Update the status for the declining kitchen
    const updateResult = await ctx.db
      .query("requestStatusUpdates")
      .filter((q) => q.and(q.eq(q.field("requestId"), requestId), q.eq(q.field("userId"), userId)))
      .first()

    if (!updateResult) {
      throw new ConvexError("No matching request found for the given userId and requestId")
    }

    await ctx.db.patch(updateResult._id, { status: "declined" })

    // Fetch the original request to get machine location
    const request = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("requestId"), requestId))
      .first()

    if (!request) {
      throw new ConvexError("Original request not found")
    }

    const machineLat = request.dstLatitude
    const machineLon = request.dstLongitude

    if (typeof machineLat !== "number" || typeof machineLon !== "number") {
      throw new ConvexError("Invalid machine coordinates")
    }

    // Search for new kitchens
    const radiusRanges = [2, 3, 4, 5] // km
    let newKitchens: Doc<"kitchens">[] = []

    for (const radius of radiusRanges) {
      newKitchens = await findNearbyKitchens(ctx, machineLat, machineLon, radius, requestId)

      if (newKitchens.length > 0) {
        break // Exit the loop if kitchens are found
      }
    }

    if (newKitchens.length === 0) {
      // Update the request status if no new kitchens were found
      await ctx.db.patch(request._id, { requestStatus: "No Available Kitchens" })
      return {
        success: false,
        message: "No new nearby kitchens found",
      }
    }

    // Add new kitchens to requestStatusUpdates
    for (const kitchen of newKitchens) {
      await ctx.db.insert("requestStatusUpdates", {
        requestId: requestId,
        userId: kitchen.userId,
        status: "Pending",
        latitude: kitchen.latitude,
        longitude: kitchen.longitude,
        dateAndTime: new Date().toISOString(),
        isProceedNext: false,
      })
    }

    return {
      success: true,
      message: "Request declined and reassigned to new kitchens",
      newKitchens: newKitchens.map((k) => k.userId),
    }
  },
})

async function findNearbyKitchens(
  ctx: any,
  machineLat: number,
  machineLon: number,
  radius: number,
  requestId: string,
): Promise<Doc<"kitchens">[]> {
  const kitchens = await ctx.db.query("kitchens").collect()
  const onlineKitchens = kitchens.filter((kitchen: Doc<"kitchens">) => kitchen.status === "online")

  // Get all kitchens that have already been assigned to this request
  const assignedKitchens = await ctx.db
    .query("requestStatusUpdates")
    .filter((q: { eq: (arg0: any, arg1: string) => any; field: (arg0: string) => any; }) => q.eq(q.field("requestId"), requestId))
    .collect()

  const assignedKitchenIds = new Set(assignedKitchens.map((k: Doc<"requestStatusUpdates">) => k.userId))

  const nearbyKitchens = onlineKitchens.filter((kitchen: Doc<"kitchens">) => {
    const distance = calculateDistance(machineLat, machineLon, kitchen.latitude, kitchen.longitude)
    return distance <= radius && !assignedKitchenIds.has(kitchen.userId)
  })

  return nearbyKitchens
}

