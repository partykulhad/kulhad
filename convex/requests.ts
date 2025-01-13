import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getMyRequests = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    console.log(`Fetching requests for userId: ${args.userId}`);
    const requests = await ctx.db
      .query("requests")
      .filter((q) => 
        q.and(
          q.eq(q.field("kitchenUserId"), args.userId)
          // q.eq(q.field("kitchenStatus"), "Pending")
        )
      )
      .collect();
    console.log(`Found ${requests.length} requests`);
    return requests;
  },
});

export const getMyOrders = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requests")
      .filter((q) => 
        q.and(
          q.eq(q.field("agentUserId"), args.userId)
          // q.eq(q.field("requestStatus"), "Accepted")
        )
      )
      .collect();
  },
});

export const updateKitchenStatus = mutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    status: v.string(),
    dateAndTime: v.string(),
    isProceedNext: v.boolean(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = args;

    // Fetch the current request
    const currentRequest = await ctx.db
      .query("requests")
      .filter(q => q.eq(q.field("requestId"), requestId))
      .first();

    if (!currentRequest) {
      throw new Error("Request not found");
    }

    // Check if the request is already accepted
    if (currentRequest.kitchenStatus === "Accepted") {
      // Create a status update record without changing the request
      await ctx.db.insert("requestStatusUpdates", {
        requestId,
        userId,
        status,
        latitude,
        longitude,
        dateAndTime,
        isProceedNext,
        reason,
        message: "Request already accepted"
      });

      return { success: false, message: "Request already accepted" };
    }

    // Update the request status and all provided information
    await ctx.db.patch(currentRequest._id, { 
      kitchenStatus: status,
      kitchenUserId: userId,
      srcLatitude: latitude,
      srcLongitude: longitude,
      requestStatus: status,
      requestDateTime: dateAndTime,
      reason: reason,
    });

    // Create a status update record
    await ctx.db.insert("requestStatusUpdates", {
      requestId,
      userId,
      status,
      latitude,
      longitude,
      dateAndTime,
      isProceedNext,
      reason,
    });

    return { success: true, message: `${status} status updated` };
  },
});

export const updateAgentStatus = mutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    status: v.string(),
    dateAndTime: v.string(),
    isProceedNext: v.boolean(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = args;

    try {
      // Fetch the current request
      const currentRequest = await ctx.db
        .query("requests")
        .filter(q => q.eq(q.field("requestId"), requestId))
        .first();

      if (!currentRequest) {
        return { success: false, message: "Request not found" };
      }

      // Check if the request is already assigned
      if (currentRequest.agentStatus === "Assigned") {
        // Create a status update record without changing the request
        await ctx.db.insert("requestStatusUpdates", {
          requestId,
          userId,
          status,
          latitude,
          longitude,
          dateAndTime,
          isProceedNext,
          reason,
          message: "Request already assigned"
        });

        return { success: false, message: "Request already assigned" };
      }

      // Update the request status and all provided information
      await ctx.db.patch(currentRequest._id, { 
        agentStatus: status,
        agentUserId: userId,
        requestStatus: status,
        requestDateTime: dateAndTime,
        reason: reason,
      });

      // Create a status update record
      await ctx.db.insert("requestStatusUpdates", {
        requestId,
        userId,
        status,
        latitude,
        longitude,
        dateAndTime,
        isProceedNext,
        reason,
      });

      return { success: true, message: `${status} status updated` };
    } catch (error) {
      console.error('Error in updateAgentStatus:', error);
      return { success: false, message: "Failed to update status" };
    }
  },
});

export const updateRequestStatus = mutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    status: v.string(),
    dateAndTime: v.string(),
    isProceedNext: v.boolean(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = args;

    // Fetch the current request
    const currentRequest = await ctx.db
      .query("requests")
      .filter(q => q.eq(q.field("requestId"), requestId))
      .first();

    if (!currentRequest) {
      return { success: false, message: "Request not found" };
    }

    // Update only the requestStatus in the requests table
    await ctx.db.patch(currentRequest._id, { 
      requestStatus: status,
      requestDateTime: dateAndTime,
    });

    // Create a status update record
    await ctx.db.insert("requestStatusUpdates", {
      requestId,
      userId,
      status,
      latitude,
      longitude,
      dateAndTime,
      isProceedNext,
      reason,
    });

    return { success: true, message: `${status} status updated` };
  },
});

export const updateCompleteOrCancel = mutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    status: v.string(),
    dateAndTime: v.string(),
    isProceedNext: v.boolean(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = args;

    // Fetch the current request
    const currentRequest = await ctx.db
      .query("requests")
      .filter(q => q.eq(q.field("requestId"), requestId))
      .first();

    if (!currentRequest) {
      return { success: false, message: "Request not found" };
    }

    // Check if request is already completed or cancelled
    if (currentRequest.requestStatus === "Completed" || currentRequest.requestStatus === "Cancelled") {
      await ctx.db.insert("requestStatusUpdates", {
        requestId,
        userId,
        status,
        latitude,
        longitude,
        dateAndTime,
        isProceedNext,
        reason,
        message: `Request already ${currentRequest.requestStatus.toLowerCase()}`
      });

      return { success: false, message: `Request already ${currentRequest.requestStatus.toLowerCase()}` };
    }

    // For completion, check if the current status is "Refilled"
    if (isProceedNext && status === "Completed" && currentRequest.requestStatus !== "Refilled") {
      await ctx.db.insert("requestStatusUpdates", {
        requestId,
        userId,
        status,
        latitude,
        longitude,
        dateAndTime,
        isProceedNext,
        reason,
        message: "Request must be refilled before completion"
      });

      return { success: false, message: "Request must be refilled before completion" };
    }

    // For cancellation, update status back to Pending
    const newStatus = !isProceedNext ? "Pending" : status;

    // Update the request status
    await ctx.db.patch(currentRequest._id, { 
      requestStatus: newStatus,
      requestDateTime: dateAndTime,
      reason: !isProceedNext ? reason : undefined // Store reason only for cancellation
    });

    // Create a status update record
    await ctx.db.insert("requestStatusUpdates", {
      requestId,
      userId,
      status,
      latitude,
      longitude,
      dateAndTime,
      isProceedNext,
      reason,
    });

    return { 
      success: true, 
      message: isProceedNext ? "Completed status updated" : "Cancelled status updated"
    };
  },
});

