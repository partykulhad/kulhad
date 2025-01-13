import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllRequests = query({
  handler: async (ctx) => {
    return await ctx.db.query("requests").collect();
  },
});

export const getMachines = query({
  handler: async (ctx) => {
    return await ctx.db.query("machines").collect();
  },
});

export const getKitchens = query({
  handler: async (ctx) => {
    return await ctx.db.query("kitchens").collect();
  },
});

export const getDeliveryAgents = query({
  handler: async (ctx) => {
    return await ctx.db.query("deliveryAgents").collect();
  },
});

export const createRequest = mutation({
  args: {
    machineId: v.string(),
    dstAddress: v.string(),
    dstLatitude: v.number(),
    dstLongitude: v.number(),
    dstContactName: v.string(),
    dstContactNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const requestId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest = await ctx.db.insert("requests", {
      requestId,
      machineId: args.machineId,
      requestStatus: "Pending",
      requestDateTime: new Date().toISOString(),
      dstAddress: args.dstAddress,
      dstLatitude: args.dstLatitude,
      dstLongitude: args.dstLongitude,
      dstContactName: args.dstContactName,
      dstContactNumber: args.dstContactNumber,
    });
    return newRequest;
  },
});

export const assignKitchen = mutation({
  args: {
    requestId: v.string(),
    kitchenUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("requestId"), args.requestId))
      .first();

    if (!request) {
      throw new Error("Request not found");
    }

    await ctx.db.patch(request._id, {
      kitchenUserId: args.kitchenUserId,
      kitchenStatus: "TempAssigned",
    });

    return { success: true };
  },
});

export const assignRefiller = mutation({
  args: {
    requestId: v.string(),
    agentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("requestId"), args.requestId))
      .first();

    if (!request) {
      throw new Error("Request not found");
    }

    if (request.kitchenStatus !== "Accepted") {
      throw new Error("Kitchen must accept the request before assigning a refiller");
    }

    await ctx.db.patch(request._id, {
      agentUserId: args.agentUserId,
      agentStatus: "TempAssigned",
    });

    return { success: true };
  },
});

