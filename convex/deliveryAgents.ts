import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Helper functions
function generateUserId(role: string, username: string): string {
  const prefix = role === 'kitchen' ? 'KITCHEN_' : 'REFILLER_';
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${username.toUpperCase()}_${randomSuffix}`;
}

// Generate upload URL for images
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Add new delivery agent
export const add = mutation({
  args: {
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
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = generateUserId("refiller", args.username);

    // Insert into deliveryAgents table
    const newId = await ctx.db.insert("deliveryAgents", {
      ...args,
      role: "refiller",
      userId,
      createdAt: Date.now(),
      trips: [],
      salt: ""
    });

    // Insert into appUser table
    await ctx.db.insert("appUser", {
      username: args.username,
      password: args.password,
      role: "refiller",
      userId,
      name: args.name, // Add this line
    });

    return newId;
  },
});

// Edit existing delivery agent
export const edit = mutation({
  args: {
    id: v.id("deliveryAgents"),
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
    username: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, password, ...updateData } = args;
    const existingAgent = await ctx.db.get(id);
    
    if (!existingAgent) {
      throw new Error("Delivery agent not found");
    }

    let updatedFields: Partial<typeof existingAgent> = { ...updateData };

    if (password) {
      updatedFields.password = password;

      // Update appUser table
      const appUser = await ctx.db
        .query("appUser")
        .withIndex("by_userId", (q) => q.eq("userId", existingAgent.userId))
        .first();

      if (appUser) {
        await ctx.db.patch(appUser._id, {
          password,
        });
      }
    }

    // Update deliveryAgents table
    await ctx.db.patch(id, updatedFields);

    // Update username in appUser table if it has changed
    if (updateData.username !== existingAgent.username) {
      const appUser = await ctx.db
        .query("appUser")
        .withIndex("by_userId", (q) => q.eq("userId", existingAgent.userId))
        .first();

      if (appUser) {
        await ctx.db.patch(appUser._id, {
          username: updateData.username,
        });
      }
    }

    return id;
  },
});

// Delete delivery agent
export const remove = mutation({
  args: { id: v.id("deliveryAgents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) {
      throw new Error("Delivery agent not found");
    }

    // Delete from deliveryAgents table
    await ctx.db.delete(args.id);

    // Delete from appUser table
    const appUser = await ctx.db
      .query("appUser")
      .withIndex("by_userId", (q) => q.eq("userId", agent.userId))
      .first();

    if (appUser) {
      await ctx.db.delete(appUser._id);
    }
  },
});

// List all delivery agents
export const list = query({
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("deliveryAgents")
      .order("desc")
      .collect();
    
    return agents;
  },
});

// Get a specific delivery agent by ID
export const getById = query({
  args: { id: v.id("deliveryAgents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new ConvexError("Delivery agent not found");
    return agent;
  },
});

// Get a specific delivery agent by userId
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("deliveryAgents")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!agent) throw new ConvexError("Delivery agent not found");
    return agent;
  },
});

// Get photo URL by storageId
export const getPhotoUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (url === null) {
      throw new ConvexError("Photo not found");
    }
    return url;
  },
});

// Update agent information
export const updateAgentInfo = mutation({
  args: {
    userId: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updateFields } = args;

    // Find the agent by userId
    const agent = await ctx.db
      .query("deliveryAgents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!agent) {
      throw new ConvexError("Delivery agent not found");
    }

    // Validate status if provided
    if (updateFields.status !== undefined && updateFields.status !== 'online' && updateFields.status !== 'offline') {
      throw new ConvexError("Invalid status. Must be 'online' or 'offline'");
    }

    // Update only the provided fields
    const fieldsToUpdate: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        fieldsToUpdate[key] = value;
      }
    }

    // Update the agent's information
    await ctx.db.patch(agent._id, fieldsToUpdate);

    return {
      success: true,
      message: "Agent information updated successfully",
    };
  },
});



// Get delivery agents by status
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const { status } = args

    return await ctx.db
      .query("deliveryAgents")
      .filter((q) => q.eq(q.field("status"), status))
      .collect()
  },
})

// Get active delivery agents (with location data)
export const getActiveAgents = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("deliveryAgents")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.neq(q.field("latitude"), undefined),
          q.neq(q.field("longitude"), undefined),
        ),
      )
      .collect()
  },
})

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

// Helper function to generate custom request ID
async function generateRequestId(ctx: any): Promise<string> {
  const prefix = "REQ"
  const lastRequest = await ctx.db.query("requests").order("desc").first()

  let counter = 1
  if (lastRequest && lastRequest.requestId) {
    const lastCounter = Number.parseInt(lastRequest.requestId.split("-")[1])
    counter = isNaN(lastCounter) ? 1 : lastCounter + 1
  }

  return `${prefix}-${counter.toString().padStart(4, "0")}`
}

export const createOrderReadyRequest = mutation({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get machine details
      const machine = await ctx.db
        .query("machines")
        .filter((q) => q.eq(q.field("id"), args.machineId))
        .first()

      if (!machine) {
        return { success: false, message: "Machine not found" }
      }

      // Check if kitchenId exists in the machine record
      if (!machine.kitchenId) {
        return { success: false, message: "No kitchen mapped to this machine" }
      }

      // Get the kitchenId from the machine record
      const kitchenIds = Array.isArray(machine.kitchenId) ? machine.kitchenId : [machine.kitchenId]

      // Get kitchen details
      let kitchen = null
      for (const kitchenId of kitchenIds) {
        const kitchenData = await ctx.db
          .query("kitchens")
          .filter((q) => q.eq(q.field("userId"), kitchenId))
          .first()

        if (kitchenData && kitchenData.status === "online") {
          kitchen = kitchenData
          break
        }
      }

      if (!kitchen) {
        return { success: false, message: "No online kitchen found for this machine" }
      }

      // Get machine coordinates
      const machineLat = Number.parseFloat(machine.gisLatitude)
      const machineLon = Number.parseFloat(machine.gisLongitude)

      if (isNaN(machineLat) || isNaN(machineLon)) {
        return { success: false, message: "Invalid machine coordinates" }
      }

      // Get kitchen coordinates
      const kitchenLat = kitchen.latitude
      const kitchenLon = kitchen.longitude

      if (isNaN(kitchenLat) || isNaN(kitchenLon)) {
        return { success: false, message: "Invalid kitchen coordinates" }
      }

      // Determine quantity based on machine type
      let quantity: number
      if (machine.machineType === "Full Time") {
        quantity = machine.teaFillStartQuantity || 0
      } else if (machine.machineType === "Part Time") {
        quantity = machine.teaFillEndQuantity || 0
      } else {
        // Default case for machines without specified type
        quantity = machine.teaFillStartQuantity || 0
      }

      // Generate a request ID
      const customRequestId = await generateRequestId(ctx)

      // Current date and time in IST format
      const currentDateTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })

      // Format machine address
      const machineAddress = machine.address
        ? `${machine.address.building || ""}, ${machine.address.floor || ""}, ${machine.address.area || ""}, ${
            machine.address.district || ""
          }, ${machine.address.state || ""}`
        : "Unknown machine address"

      // Format kitchen address
     // Format kitchen address
const kitchenAddress = kitchen.address ? kitchen.address : "Unknown kitchen address";


      // Create request with OrderReady status
      // IMPORTANT: For delivery agents, the source is the kitchen and destination is the machine
      const requestId = await ctx.db.insert("requests", {
        requestId: customRequestId,
        machineId: args.machineId,
        requestStatus: "OrderReady", // Set status as OrderReady
        kitchenStatus: "Accepted", // Kitchen has already accepted
        agentStatus: "Pending",
        requestDateTime: currentDateTime,
        // Source is the kitchen
        srcAddress: kitchenAddress,
        srcLatitude: kitchenLat,
        srcLongitude: kitchenLon,
        srcContactName: kitchen.manager || "",
        srcContactNumber: kitchen.managerMobile || "",
        // Destination is the machine
        dstAddress: machineAddress,
        dstLatitude: machineLat,
        dstLongitude: machineLon,
        dstContactName: machine.managerName || "",
        dstContactNumber: machine.contactNo || "",
        kitchenUserId: kitchen.userId,
        agentUserId: [],
        priority: 3, // Set priority as 3 for this API call
        quantity: quantity,
        // teaType: machine.teaType || "Regular Tea",
      })

      // Now search for nearby delivery agents
      // Progressive search distances: 2km, 3km, 5km, 8km, 10km
      const searchDistances = [2, 3, 5, 8, 10]
      let nearbyAgents: any[] = []
      let usedDistance = 0

      // Get all delivery agents
      const deliveryAgents = await ctx.db.query("deliveryAgents").collect()

      // Filter agents with valid coordinates and online status
      const validAgents = deliveryAgents.filter((agent) => {
        return (
          agent.latitude !== undefined &&
          agent.longitude !== undefined &&
          typeof agent.latitude === "number" &&
          typeof agent.longitude === "number" &&
          !isNaN(agent.latitude) &&
          !isNaN(agent.longitude) &&
          agent.status !== "offline"
        )
      })

      // Search in loop with increasing distances
      for (const distance of searchDistances) {
        console.log(`Searching for agents within ${distance}km radius of kitchen`)

        nearbyAgents = validAgents.filter((agent) => {
          // Use kitchen coordinates as source for delivery agents
          const agentDistance = calculateDistance(
            kitchenLat,
            kitchenLon,
            agent.latitude as number,
            agent.longitude as number,
          )
          return agentDistance <= distance
        })

        if (nearbyAgents.length > 0) {
          usedDistance = distance
          console.log(`Found ${nearbyAgents.length} agents within ${distance}km radius of kitchen`)
          break
        } else {
          console.log(`No agents found within ${distance}km radius of kitchen, trying next distance`)
        }
      }

      // If no agents found after all distances
      if (nearbyAgents.length === 0) {
        console.log(`No delivery agents found within maximum 10km radius for request ${customRequestId}`)

        // Update request with empty agent list
        await ctx.db.patch(requestId, {
          agentUserId: [],
        })

        return {
          success: true,
          message: "Request created but no delivery agents found within 10km radius",
          requestId: customRequestId,
          nearbyAgentIds: [],
          searchDistance: 10,
        }
      }

      const nearbyAgentIds = nearbyAgents.map((agent) => agent.userId)

      // Update the request with the nearby agent IDs
      await ctx.db.patch(requestId, {
        agentUserId: nearbyAgentIds,
      })

      // Create status update records for tracking
      for (const agentId of nearbyAgentIds) {
        // Get agent details for address
        const agent = nearbyAgents.find((a) => a.userId === agentId)

        // Format agent address if available
        let agentAddress = "Unknown agent location"
        if (agent && agent.address) {
          agentAddress = `${agent.address.building || ""}, ${agent.address.area || ""}, ${agent.address.district || ""}, ${
            agent.address.state || ""
          }`
        }

        await ctx.db.insert("requestStatusUpdates", {
          requestId: customRequestId,
          userId: agentId,
          status: "OrderReady",
          latitude: agent?.latitude || 0,
          longitude: agent?.longitude || 0,
          dateAndTime: currentDateTime,
          isProceedNext: false,
          message: `Delivery request sent to agent (found within ${usedDistance}km)`,
          
          // teaType: machine.teaType || "Regular Tea",
          quantity: quantity,
        })
      }

      console.log(
        `Created request ${customRequestId} for machine ${args.machineId} with ${nearbyAgents.length} nearby delivery agents`,
      )

      return {
        success: true,
        message: "Request created and nearby delivery agents found",
        requestId: customRequestId,
        nearbyAgentIds,
        searchDistance: usedDistance,
      }
    } catch (error) {
      console.error("Error creating OrderReady request:", error)
      return {
        success: false,
        message: "Internal server error",
        requestId: null,
        nearbyAgentIds: [],
      }
    }
  },
})
