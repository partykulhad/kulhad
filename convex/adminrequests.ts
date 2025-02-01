import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getKitchenByUserId } from "./kitchens";

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
    const latestRequest = await ctx.db
      .query("requests")
      .order("desc")
      .first();
    const latestRequestId = latestRequest?.requestId ?? "REQ-0000";
    const numericPart = parseInt(latestRequestId.split("-")[1]);
    const nextNumericPart = numericPart + 1;
    const requestId = `REQ-${nextNumericPart.toString().padStart(4, "0")}`;

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

    const kitchen = await ctx.db
      .query("kitchens")
      .filter((q) => q.eq(q.field("userId"), args.kitchenUserId))
      .first();

    if (!kitchen) {
      throw new Error("Kitchen not found");
    }

    await ctx.db.patch(request._id, {
      kitchenUserId: args.kitchenUserId,
      kitchenStatus: "Accepted",
      srcAddress: kitchen.address,
      srcLatitude: kitchen.latitude,
      srcLongitude: kitchen.longitude,
      srcContactName: kitchen.manager,
      srcContactNumber: kitchen.managerMobile,
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

    if (request.requestStatus !== "OrderReady") {
      throw new Error("Kitchen must OrderReady the request before assigning a refiller");
    }

    const agent = await ctx.db
      .query("deliveryAgents")
      .filter((q) => q.eq(q.field("userId"), args.agentUserId))
      .first();

    if (!agent) {
      throw new Error("Delivery agent not found");
    }

    await ctx.db.patch(request._id, {
      agentUserId: args.agentUserId,
      agentStatus: "Assigned",
      requestStatus: "Assigned",
      assignRefillerName: agent.name,
      assignRefillerContactNumber: agent.mobile,
    });

    return { success: true };
  },
});

