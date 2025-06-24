import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import { Doc } from "./_generated/dataModel"

// Helper functions
function generateUserId(role: string, username: string): string {
  const prefix = role === "kitchen" ? "KITCHEN_" : "REFILLER_"
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `${prefix}${username.toUpperCase()}_${randomSuffix}`
}

// Helper function to generate sequential UID
async function generateSequentialUID(ctx: any): Promise<string> {
  // Get all existing kitchens to find the highest UID number
  const allKitchens = await ctx.db.query("kitchens").collect()

  let maxUidNumber = 0

  // Check all members across all kitchens for existing UIDs
  allKitchens.forEach((kitchen: any) => {
    kitchen.members.forEach((member: any) => {
      if (member.uid && member.uid.startsWith("USER")) {
        const uidNumber = Number.parseInt(member.uid.replace("USER", ""))
        if (!isNaN(uidNumber) && uidNumber > maxUidNumber) {
          maxUidNumber = uidNumber
        }
      }
    })
  })

  // Generate next UID
  const nextUidNumber = maxUidNumber + 1
  return `USER${nextUidNumber.toString().padStart(3, "0")}`
}

// Helper function to get current date and time as string
function getCurrentDateTime(): string {
  const now = new Date()
  // Format as "DD/MM/YYYY, HH:MM:SS AM/PM" to match your existing date formats
  const day = now.getDate().toString().padStart(2, "0")
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const year = now.getFullYear()
  const hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const seconds = now.getSeconds().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12

  return `${day}/${month}/${year}, ${displayHours}:${minutes}:${seconds} ${ampm}`
}

// Generate upload URL for images
// export const generateUploadUrl = mutation({
//   handler: async (ctx) => {
//     return await ctx.storage.generateUploadUrl()
//   },
// })

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
        company: v.string(),
        pan: v.string(),
        photoStorageId: v.optional(v.string()),
        // uid and startingDate will be auto-generated, not in args
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Generate userId automatically
    const userId = generateUserId("kitchen", args.username)

    // Check if username already exists
    const existingUser = await ctx.db
      .query("appUser")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first()

    if (existingUser) {
      throw new ConvexError("Username already exists. Please choose a different username.")
    }

    // Process members - add auto-generated uid and startingDate to each member
    const processedMembers = await Promise.all(
      args.members.map(async (member) => ({
        ...member,
        uid: await generateSequentialUID(ctx), // Auto-generate UID
        startingDate: getCurrentDateTime(), // Auto-generate starting date
      })),
    )

    const kitchenId = await ctx.db.insert("kitchens", {
      ...args,
      members: processedMembers,
      userId,
      role: "kitchen",
      salt: "",
    })

    await ctx.db.insert("appUser", {
      username: args.username,
      password: args.password,
      role: "kitchen",
      userId,
      name: args.name,
    })

    return kitchenId
  },
})

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
        company: v.string(),
        pan: v.string(),
        photoStorageId: v.optional(v.string()),
        uid: v.string(), // Required for edit since it exists in DB
        startingDate: v.string(), // Required for edit since it exists in DB
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { id, password, ...updates } = args
    const existingKitchen = await ctx.db.get(id)

    if (!existingKitchen) {
      throw new ConvexError("Kitchen not found")
    }

    // Check if username is being changed and if new username already exists
    if (updates.username !== existingKitchen.username) {
      const existingUser = await ctx.db
        .query("appUser")
        .withIndex("by_username", (q) => q.eq("username", updates.username))
        .first()

      if (existingUser && existingUser.userId !== existingKitchen.userId) {
        throw new ConvexError("Username already exists. Please choose a different username.")
      }
    }

    // For edit, members already have uid and startingDate, so use them as-is
    const updatedFields: any = {
      ...updates,
      members: updates.members, // Members already have required uid and startingDate
    }

    await ctx.db.patch(id, updatedFields)

    // Update appUser table
    const appUser = await ctx.db
      .query("appUser")
      .withIndex("by_userId", (q) => q.eq("userId", existingKitchen.userId))
      .first()

    if (appUser) {
      const appUserUpdates: any = {
        username: updates.username,
        name: updates.name,
      }

      if (password) {
        appUserUpdates.password = password
      }

      await ctx.db.patch(appUser._id, appUserUpdates)
    }
  },
})

// Add new member to existing kitchen
export const addMember = mutation({
  args: {
    kitchenId: v.id("kitchens"),
    member: v.object({
      name: v.string(),
      mobile: v.string(),
      email: v.string(),
      adhaar: v.string(),
      address: v.string(),
      company: v.string(),
      pan: v.string(),
      photoStorageId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const kitchen = await ctx.db.get(args.kitchenId)
    if (!kitchen) {
      throw new ConvexError("Kitchen not found")
    }

    // Generate UID and startingDate for new member
    const newMember = {
      ...args.member,
      uid: await generateSequentialUID(ctx),
      startingDate: getCurrentDateTime(),
    }

    // Add new member to existing members array
    const updatedMembers = [...kitchen.members, newMember]

    await ctx.db.patch(args.kitchenId, {
      members: updatedMembers,
    })

    return newMember.uid
  },
})

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

// export const getByKitchenId = query({
//   args: { kitchenId: v.id("kitchens") },
//   handler: async (ctx, args) => {
//     const notifications = await ctx.db
//       .query("notifications")
//       .filter((q) => q.eq(q.field("kitchenId"), args.kitchenId))
//       .order("desc")
//       .take(10)

//     return notifications
//   },
// })

export const getByKitchenId = query({
  args: { kitchenId: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("kitchenId"), args.kitchenId))
      .order("desc")
      .take(10)

    return notifications
  },
})