import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const checkCanisterLevel = mutation({
  args: { machineId: v.string(), canisterLevel: v.number() },
  handler: async (ctx, args) => {
    const { machineId, canisterLevel } = args;

    if (canisterLevel >= 20) {
      return { success: true, message: "Canister level is above threshold" };
    }

    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first();

    if (!machine) {
      throw new ConvexError("Machine not found");
    }

    const machineLat = parseFloat(machine.gisLatitude);
    const machineLon = parseFloat(machine.gisLongitude);

    if (isNaN(machineLat) || isNaN(machineLon)) {
      throw new ConvexError("Invalid machine coordinates");
    }

    const nearestKitchen = await findNearestKitchen(ctx, machineLat, machineLon);

    if (!nearestKitchen) {
      throw new ConvexError("No online kitchen found");
    }

    const distance = calculateDistance(
      machineLat,
      machineLon,
      nearestKitchen.latitude,
      nearestKitchen.longitude
    );

    const notification = await ctx.db.insert("notifications", {
      machineId: machineId,
      kitchenId: nearestKitchen.userId,
      kitchenName: nearestKitchen.name,
      distance: distance,
      timestamp: Date.now(),
      message: `Canister level is low (${canisterLevel}%) for machine ${machineId}`,
    });

    // Find nearest online delivery agent to the kitchen
    const nearestAgent = await findNearestAgent(ctx, nearestKitchen.latitude, nearestKitchen.longitude);

    if (nearestAgent) {
      let agentDistance: number | undefined = undefined;
      if (nearestAgent.latitude !== undefined && nearestAgent.longitude !== undefined) {
        agentDistance = calculateDistance(
          nearestKitchen.latitude,
          nearestKitchen.longitude,
          nearestAgent.latitude,
          nearestAgent.longitude
        );
      }

      const agentNotification = await ctx.db.insert("agentNotifications", {
        agentId: nearestAgent.userId,
        agentName: nearestAgent.name,
        kitchenId: nearestKitchen.userId,
        kitchenName: nearestKitchen.name,
        distance: agentDistance,
        timestamp: Date.now(),
        message: `You have an order from kitchen ${nearestKitchen.name}`,
      });

      return { 
        success: true, 
        message: "Notifications created for low canister level and delivery agent",
        notification,
        agentNotification
      };
    } else {
      return { 
        success: true, 
        message: "Notification created for low canister level, but no online delivery agent found",
        notification
      };
    }
  },
});

async function findNearestKitchen(ctx: any, machineLat: number, machineLon: number): Promise<Doc<"kitchens"> | null> {
  const kitchens = await ctx.db.query("kitchens").collect();
  const onlineKitchens = kitchens.filter((kitchen: { status: string; }) => kitchen.status === "online");

  if (onlineKitchens.length === 0) {
    return null;
  }

  const sortedKitchens = onlineKitchens.sort((a: { latitude: number; longitude: number; }, b: { latitude: number; longitude: number; }) => {
    const distanceA = calculateDistance(machineLat, machineLon, a.latitude, a.longitude);
    const distanceB = calculateDistance(machineLat, machineLon, b.latitude, b.longitude);
    return distanceA - distanceB;
  });

  return sortedKitchens[0];
}

async function findNearestAgent(ctx: any, kitchenLat: number, kitchenLon: number): Promise<Doc<"deliveryAgents"> | null> {
  const agents = await ctx.db.query("deliveryAgents").collect();
  const onlineAgents = agents.filter((agent: { status: string; }) => agent.status === "online");

  if (onlineAgents.length === 0) {
    return null;
  }

  const agentsWithCoordinates = onlineAgents.filter(
    (agent: { latitude: undefined; longitude: undefined; }) => agent.latitude !== undefined && agent.longitude !== undefined
  );

  if (agentsWithCoordinates.length === 0) {
    // If no agents have coordinates, return the first online agent
    return onlineAgents[0];
  }

  const sortedAgents = agentsWithCoordinates.sort((a: { latitude: number; longitude: number; }, b: { latitude: number; longitude: number; }) => {
    const distanceA = calculateDistance(kitchenLat, kitchenLon, a.latitude!, a.longitude!);
    const distanceB = calculateDistance(kitchenLat, kitchenLon, b.latitude!, b.longitude!);
    return distanceA - distanceB;
  });

  return sortedAgents[0];
}

export const getNotifications = query({
  args: { machineId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let notificationsQuery = ctx.db.query("notifications");
    
    if (args.machineId !== undefined) {
      notificationsQuery = notificationsQuery.filter((q) => q.eq(q.field("machineId"), args.machineId!));
    }
    
    return await notificationsQuery.collect();
  },
});

export const getAgentNotifications = query({
  args: { agentId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let notificationsQuery = ctx.db.query("agentNotifications");
    
    if (args.agentId !== undefined) {
      notificationsQuery = notificationsQuery.filter((q) => q.eq(q.field("agentId"), args.agentId!));
    }
    
    return await notificationsQuery.collect();
  },
});