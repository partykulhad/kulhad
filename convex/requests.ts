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
          q.eq(q.field("kitchenUserId"), args.userId),
          q.not(q.or(
            q.eq(q.field("requestStatus"), "Completed"),
            q.eq(q.field("requestStatus"), "Cancelled")
          ))
        )
      )
      .collect();
    console.log(`Found ${requests.length} active requests`);
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
          q.eq(q.field("agentUserId"), args.userId),
          q.not(q.or(
            q.eq(q.field("requestStatus"), "Completed"),
            q.eq(q.field("requestStatus"), "Cancelled")
          ))
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

    // Check if the request is already Submitted
    if (currentRequest.requestStatus === "Submitted") {
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
        message: "Request already Submitted"
      });

      return { success: false, message: "Request already Submitted" };
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
      if (currentRequest.requestStatus === "Submitted") {
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
          message: "Request already Submitted"
        });

        return { success: false, message: "Request already Submitted" };
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

    // Check if the current status is "Submitted" or "NotSubmitted"
    if (currentRequest.requestStatus !== "Submitted" && currentRequest.requestStatus !== "NotSubmitted") {
      await ctx.db.insert("requestStatusUpdates", {
        requestId,
        userId,
        status,
        latitude,
        longitude,
        dateAndTime,
        isProceedNext,
        reason,
        message: "Unable to Proceed due to status mismatch"
      });

      return { success: false, message: "Unable to Proceed due to status mismatch" };
    }

    // Determine the new status based on isProceedNext
    const newStatus = isProceedNext ? "Completed" : "Cancelled";

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
      status: newStatus,
      latitude,
      longitude,
      dateAndTime,
      isProceedNext,
      reason,
    });

    return { 
      success: true, 
      message: `Request ${newStatus.toLowerCase()} successfully`
    };
  },
});



export const updateSubmitStatus = mutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    status: v.string(),
    dateAndTime: v.string(),
    isProceedNext: v.boolean(),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    try {
      // Validate reason when not submitting
      if (args.status === "NotSubmitted" && !args.reason) {
        return { 
          success: false, 
          message: "Reason is required when not submitting" 
        };
      }

      // First, update the request status in the requests table
      const request = await ctx.db
        .query("requests")
        .filter((q) => q.eq(q.field("requestId"), args.requestId))
        .first();

      if (!request) {
        return { success: false, message: "Request not found" };
      }

      await ctx.db.patch(request._id, {
        requestStatus: args.status
      });

      // Then, create a new record in requestStatusUpdates table
      await ctx.db.insert("requestStatusUpdates", {
        requestId: args.requestId,
        userId: args.userId,
        status: args.status,
        latitude: args.latitude,
        longitude: args.longitude,
        dateAndTime: args.dateAndTime,
        isProceedNext: args.isProceedNext,
        reason: args.reason,
        message: args.status === "Submitted" 
          ? " submitted successfully"
          : ` not submitted: ${args.reason}`
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating Submitted status:", error);
      return { success: false, message: "Internal server error" };
    }
  }
});
