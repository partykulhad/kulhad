import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

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

export const getMyRequests = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    console.log(`Fetching requests for userId: ${args.userId}`)

    // First, let's get all requests without any filters
    const allRequests = await ctx.db.query("requests").collect()
    console.log(`Total requests in the database: ${allRequests.length}`)

    // Now, let's apply our filters step by step
    const requestsWithUserId = allRequests.filter(
      (request) =>
        request.kitchenUserId === args.userId ||
        (Array.isArray(request.kitchenUserId) && request.kitchenUserId.includes(args.userId)),
    )
    console.log(`Requests matching userId: ${requestsWithUserId.length}`)

    const activeRequests = requestsWithUserId.filter(
      (request) => request.requestStatus !== "Completed" && request.requestStatus !== "Cancelled",
    )
    console.log(`Active requests for userId: ${activeRequests.length}`)

    console.log("Sample of active requests:", activeRequests.slice(0, 3))

    return activeRequests
  },
})

export const getMyOrders = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    console.log(`Fetching orders for userId: ${args.userId}`)

    // First, let's get all requests without any filters
    const allRequests = await ctx.db.query("requests").collect()
    console.log(`Total requests in the database: ${allRequests.length}`)

    // Now, let's apply our filters step by step
    const requestsWithUserId = allRequests.filter(
      (request) =>
        request.agentUserId === args.userId ||
        (Array.isArray(request.agentUserId) && request.agentUserId.includes(args.userId)),
    )
    console.log(`Requests matching agentUserId: ${requestsWithUserId.length}`)

    const activeOrders = requestsWithUserId.filter(
      (request) =>
        request.requestStatus !== "Completed" &&
        request.requestStatus !== "Cancelled" &&
        request.requestStatus !== "Accepted",
    )
    console.log(`Active orders for userId: ${activeOrders.length}`)

    console.log("Sample of active orders:", activeOrders.slice(0, 3))

    return activeOrders
  },
})



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
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = args

    // Fetch the current request
    const currentRequest = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("requestId"), requestId))
      .first()

    if (!currentRequest) {
      return { success: false, message: `Request with ID ${requestId} not found` }
    }

    // Check if the request is already Accepted
    if (currentRequest.requestStatus === "Accepted") {
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
        message: "Request already Accepted, cannot update status",
      })

      return { success: false, message: "Request already Accepted, cannot update status" }
    }

    // If status is "Accepted", fetch kitchen details
    let updateData: any = {
      kitchenStatus: status,
      kitchenUserId: userId,
      requestStatus: status,
      requestDateTime: dateAndTime,
      reason: reason,
    }

    if (status === "Accepted") {
      // Fetch kitchen details
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first()

      if (!kitchen) {
        return { success: false, message: "Kitchen details not found" }
      }

      // Add kitchen details to update data
      updateData = {
        ...updateData,
        srcAddress: kitchen.address,
        srcLatitude: kitchen.latitude,
        srcLongitude: kitchen.longitude,
        srcContactName: kitchen.manager,
        srcContactNumber: kitchen.managerMobile,
      }
    }

    // Update the request with all information
    await ctx.db.patch(currentRequest._id, updateData)

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
    })

    return {
      success: true,
      message: status === "Accepted" ? "Request accepted and kitchen details updated" : `${status} status updated`,
    }
  },
})

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
    totalDistance: v.optional(v.number()), // Add optional totalDistance parameter
  },
  handler: async (ctx, args) => {
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason, totalDistance } = args

    try {
      // Fetch the current request
      const currentRequest = await ctx.db
        .query("requests")
        .filter((q) => q.eq(q.field("requestId"), requestId))
        .first()

      if (!currentRequest) {
        return { success: false, message: "Request not found" }
      }

      // Check if the request is already assigned or submitted
      if (currentRequest.requestStatus === "Assigned" || currentRequest.requestStatus === "Submitted") {
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
          message: `Request already ${currentRequest.requestStatus}`,
        })

        return { success: false, message: `Request already ${currentRequest.requestStatus}` }
      }

      const updateData: any = {
        agentStatus: status,
        agentUserId: userId,
        requestStatus: status,
        requestDateTime: dateAndTime,
        reason: reason,
      }

      // If totalDistance is provided, add it to the update data
      if (totalDistance !== undefined) {
        updateData.totalDistance = totalDistance // Using totalDistance field from schema
      }

      // If the status is "Assigned", fetch and add refiller details
      if (status === "Assigned") {
        const deliveryAgent = await ctx.db
          .query("deliveryAgents")
          .filter((q) => q.eq(q.field("userId"), userId))
          .first()

        if (deliveryAgent) {
          updateData.assignRefillerName = deliveryAgent.name
          updateData.assignRefillerContactNumber = deliveryAgent.mobile
        } else {
          return { success: false, message: "Delivery agent not found" }
        }
      }

      // Update the request status and all provided information
      await ctx.db.patch(currentRequest._id, updateData)

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
        totalDistance, // Also store the distance in the status update record
      })

      return { success: true, message: `${status} status updated` }
    } catch (error) {
      console.error("Error in updateAgentStatus:", error)
      return { success: false, message: "Failed to update status" }
    }
  },
})

// Add this new query function to get kitchen details by user ID
export const getKitchenByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kitchens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first()
  },
})

// Add this query function to get request details by requestId
export const getRequestByRequestI = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("requestId"), args.requestId))
      .first()
  },
})



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
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = args

    // Fetch the current request
    const currentRequest = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("requestId"), requestId))
      .first()

    if (!currentRequest) {
      return { success: false, message: "Request not found" }
    }

    // Update the requestStatus in the requests table
    await ctx.db.patch(currentRequest._id, {
      requestStatus: status,
      requestDateTime: dateAndTime,
    })

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
    })

    // If the status is "completed", update the lastFulfilled field in the machines table
    if (status === "Refilled" && currentRequest.machineId) {
      // Find the machine with this machineId
      const machine = await ctx.db
        .query("machines")
        .filter((q) => q.eq(q.field("id"), currentRequest.machineId))
        .first()

      if (machine) {
        // Update the lastFulfilled field with the current dateAndTime
        await ctx.db.patch(machine._id, {
          lastFulfilled: dateAndTime,
        })
      }
    }

    return { success: true, message: `${status} status updated` }
  },
})


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
    if (currentRequest.requestStatus !== "Submitted" && currentRequest.requestStatus !== "NotSubmitted" && currentRequest.requestStatus !== "Refilled") {
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

export const updateOrderReadyStatus = mutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    status: v.string(),
    dateAndTime: v.string(),
    isProceedNext: v.boolean(),
    reason: v.optional(v.string()),
    teaType: v.optional(v.string()),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate status
      if (args.status !== "OrderReady") {
        return {
          success: false,
          message: "Invalid status. Expected 'OrderReady'",
        }
      }

      // First, update the request status in the requests table
      const request = await ctx.db
        .query("requests")
        .filter((q) => q.eq(q.field("requestId"), args.requestId))
        .first()

      if (!request) {
        return { success: false, message: "Request not found" }
      }

      // Search for nearby delivery agents
      const deliveryAgents = await ctx.db.query("deliveryAgents").collect()
      let nearbyAgents = deliveryAgents.filter((agent) => {
        // Only calculate distance if both latitude and longitude are present
        if (agent.latitude !== undefined && agent.longitude !== undefined && agent.status !== "offline") {
          const distance = calculateDistance(args.latitude, args.longitude, agent.latitude, agent.longitude)
          return distance <= 100 // 3km radius
        }
        return false // Exclude agents without location data
      })

      // If no agents found within 3km, extend search to 5km
      if (nearbyAgents.length === 0) {
        nearbyAgents = deliveryAgents.filter((agent) => {
          if (agent.latitude !== undefined && agent.longitude !== undefined && agent.status !== "offline") {
            const distance = calculateDistance(args.latitude, args.longitude, agent.latitude, agent.longitude)
            return distance <= 5 // 5km radius
          }
          return false
        })
      }

      const nearbyAgentIds = nearbyAgents.map((agent) => agent.userId)

      // Update the request with the new status, nearby agent IDs, and the new fields
      await ctx.db.patch(request._id, {
        requestStatus: args.status,
        agentUserId: nearbyAgentIds,
        teaType: args.teaType,
        // quantity: args.quantity,
      })

      // Create a new record in requestStatusUpdates table
      await ctx.db.insert("requestStatusUpdates", {
        requestId: args.requestId,
        userId: args.userId,
        status: args.status,
        latitude: args.latitude,
        longitude: args.longitude,
        dateAndTime: args.dateAndTime,
        isProceedNext: args.isProceedNext,
        reason: args.reason,
        teaType: args.teaType,
        quantity: args.quantity,
        message: "Order is ready for pickup",
      })

      return { success: true, nearbyAgentIds }
    } catch (error) {
      console.error("Error updating Order Ready status:", error)
      return { success: false, message: "Internal server error" }
    }
  },
})




export const getRequestByRequestId = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("requestId"), args.requestId))
      .unique();
    
    if (!request) {
      return null;
    }
    
    return {
      refillerUserId: request.agentUserId,
      kitchenUserId: request.kitchenUserId,
      // Add other fields you need
    };
  },
});


export const getMyRequestsHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // 1. Get cancelled requests from requestStatusUpdates table
    const cancelledStatusUpdates = await ctx.db
      .query("requestStatusUpdates")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("status"), "Cancelled")
        )
      )
      .collect()

    // 2. Get completed requests directly from requests table where userId matches kitchenUserId OR agentUserId
    const completedRequests = await ctx.db
      .query("requests")
      .filter((q) => 
        q.and(
          q.eq(q.field("requestStatus"), "Completed"),
          q.or(
            q.eq(q.field("kitchenUserId"), args.userId),
            q.eq(q.field("agentUserId"), args.userId)
          )
        )
      )
      .collect()

    // 3. Process cancelled requests
    const cancelledRequestDetails = await Promise.all(
      cancelledStatusUpdates.map(async (update) => {
        const request = await ctx.db
          .query("requests")
          .filter((q) => q.eq(q.field("requestId"), update.requestId))
          .first()

        if (!request) return null; // Skip if request not found

        return {
          requestId: update.requestId || null,
          requestStatus: "Cancelled",
          requestDateTime: update.dateAndTime || null,
          srcAddress: request.srcAddress || null,
          machineId: request.machineId || null,
          teaType: request.teaType || "",
          quantity: request.quantity || 0.0,
          srcLatitude: request.srcLatitude || null,
          srcLongitude: request.srcLongitude || null,
          srcContactName: request.srcContactName || null,
          srcContactNumber: request.srcContactNumber || null,
          dstAddress: request.dstAddress || null,
          dstLatitude: request.dstLatitude || null,
          dstLongitude: request.dstLongitude || null,
          dstContactName: request.dstContactName || null,
          dstContactNumber: request.dstContactNumber || null,
          assgnRefillerName: null,
          assignRefillerContactNumber: null,
          cancellationReason: update.reason || null,
        };
      })
    );

    // 4. Process completed requests
    const completedRequestDetails = await Promise.all(
      completedRequests.map(async (request) => {
        // Find the most recent completed status update to get the timestamp
        const statusUpdate = await ctx.db
          .query("requestStatusUpdates")
          .filter((q) => 
            q.and(
              q.eq(q.field("requestId"), request.requestId),
              q.eq(q.field("status"), "Completed")
            )
          )
          .first();

        return {
          requestId: request.requestId || null,
          requestStatus: "Completed",
          requestDateTime: statusUpdate?.dateAndTime || null,
          srcAddress: request.srcAddress || null,
          machineId: request.machineId || null,
          teaType: request.teaType || "",
          quantity: request.quantity || 0.0,
          srcLatitude: request.srcLatitude || null,
          srcLongitude: request.srcLongitude || null,
          srcContactName: request.srcContactName || null,
          srcContactNumber: request.srcContactNumber || null,
          dstAddress: request.dstAddress || null,
          dstLatitude: request.dstLatitude || null,
          dstLongitude: request.dstLongitude || null,
          dstContactName: request.dstContactName || null,
          dstContactNumber: request.dstContactNumber || null,
          assgnRefillerName: request.assignRefillerName || null,
          assignRefillerContactNumber: request.assignRefillerContactNumber || null,
        };
      })
    );

    // 5. Combine results, filter out any null values, and return
    const allRequestDetails = [
      ...cancelledRequestDetails.filter(Boolean),
      ...completedRequestDetails.filter(Boolean)
    ];

    return allRequestDetails;
  },
});

export const getMyOrdersHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // 1. Get cancelled orders from requestStatusUpdates table
    const cancelledStatusUpdates = await ctx.db
      .query("requestStatusUpdates")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("status"), "Cancelled")
        )
      )
      .collect()

    // 2. Get completed orders directly from requests table where userId matches kitchenUserId OR agentUserId
    const completedOrders = await ctx.db
      .query("requests")
      .filter((q) => 
        q.and(
          q.eq(q.field("requestStatus"), "Completed"),
          q.or(
            q.eq(q.field("kitchenUserId"), args.userId),
            q.eq(q.field("agentUserId"), args.userId)
          )
        )
      )
      .collect()

    // 3. Process cancelled orders
    const cancelledOrderDetails = await Promise.all(
      cancelledStatusUpdates.map(async (update) => {
        const order = await ctx.db
          .query("requests")
          .filter((q) => q.eq(q.field("requestId"), update.requestId))
          .first()

        if (!order) return null; // Skip if order not found

        return {
          requestId: update.requestId || null,
          requestStatus: "Cancelled",
          requestDateTime: update.dateAndTime || null,
          srcAddress: order.srcAddress || null,
          machineId: order.machineId || null,
          teaType: order.teaType || "",
          quantity: order.quantity || 0.0,
          srcLatitude: order.srcLatitude || null,
          srcLongitude: order.srcLongitude || null,
          srcContactName: order.srcContactName || null,
          srcContactNumber: order.srcContactNumber || null,
          dstAddress: order.dstAddress || null,
          dstLatitude: order.dstLatitude || null,
          dstLongitude: order.dstLongitude || null,
          dstContactName: order.dstContactName || null,
          dstContactNumber: order.dstContactNumber || null,
          assgnRefillerName: null,
          assignRefillerContactNumber: null,
          cancellationReason: update.reason || null,
          totalDistance: order.totalDistance || null,
        };
      })
    );

    // 4. Process completed orders
    const completedOrderDetails = await Promise.all(
      completedOrders.map(async (order) => {
        // Find the most recent completed status update to get the timestamp
        const statusUpdate = await ctx.db
          .query("requestStatusUpdates")
          .filter((q) => 
            q.and(
              q.eq(q.field("requestId"), order.requestId),
              q.eq(q.field("status"), "Completed")
            )
          )
          .first();

        return {
          requestId: order.requestId || null,
          requestStatus: "Completed",
          requestDateTime: statusUpdate?.dateAndTime || null,
          srcAddress: order.srcAddress || null,
          machineId: order.machineId || null,
          teaType: order.teaType || "",
          quantity: order.quantity || 0.0,
          srcLatitude: order.srcLatitude || null,
          srcLongitude: order.srcLongitude || null,
          srcContactName: order.srcContactName || null,
          srcContactNumber: order.srcContactNumber || null,
          dstAddress: order.dstAddress || null,
          dstLatitude: order.dstLatitude || null,
          dstLongitude: order.dstLongitude || null,
          dstContactName: order.dstContactName || null,
          dstContactNumber: order.dstContactNumber || null,
          assgnRefillerName: order.assignRefillerName || null,
          assignRefillerContactNumber: order.assignRefillerContactNumber || null,
          totalDistance: order.totalDistance || null,
        };
      })
    );

    // 5. Combine results, filter out any null values, and return
    const allOrderDetails = [
      ...cancelledOrderDetails.filter((item): item is NonNullable<typeof item> => item !== null),
      ...completedOrderDetails.filter((item): item is NonNullable<typeof item> => item !== null)
    ];

    return allOrderDetails;
  },
});

export const getByMachineId = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("machineId"), args.machineId))
      .order("desc")
      .take(10)

    return requests
  },
})

export const getByKitchenUserId = query({
  args: { kitchenUserId: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("kitchenUserId"), args.kitchenUserId))
      .order("desc")
      .take(10)

    return requests
  },
})

// Add these new functions for delivery agents
export const getByAgentUserId = query({
  args: { agentUserId: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("requests")
      .filter((q) =>
        q.and(q.eq(q.field("agentUserId"), args.agentUserId), q.neq(q.field("requestStatus"), "completed")),
      )
      .order("desc")
      .take(10)

    return requests
  },
})

export const getCompletedByAgentUserId = query({
  args: { agentUserId: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.and(q.eq(q.field("agentUserId"), args.agentUserId), q.eq(q.field("requestStatus"), "completed")))
      .order("desc")
      .take(20)

    return requests
  },
})



// Get all requests
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("requests").collect()
  },
})



// Get request by requestId
export const getByRequestId = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    const { requestId } = args

    return await ctx.db
      .query("requests")
      .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
      .first()
  },
})


// Get completed requests by agentUserId


// Get requests by status
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const { status } = args

    return await ctx.db
      .query("requests")
      .withIndex("by_requestStatus", (q) => q.eq("requestStatus", status))
      .collect()
  },
})


export const getAllActiveRequests = query({
  args: {},
  handler: async (ctx) => {
    // Get all active requests that might need delivery agents
    // You can modify this filter based on your specific requirements
    const activeRequests = await ctx.db
      .query("requests")
      .filter((q) =>
        q.and(
          q.neq(q.field("requestStatus"), "Completed"),
          q.neq(q.field("requestStatus"), "Cancelled"),
          q.neq(q.field("requestStatus"), "No Kitchens Found"),
        ),
      )
      .collect()

    return activeRequests
  },
})
