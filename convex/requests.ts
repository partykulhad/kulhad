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
  },
  handler: async (ctx, args) => {
    const { userId, requestId, latitude, longitude, status, dateAndTime, isProceedNext, reason } = args

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
      })

      return { success: true, message: `${status} status updated` }
    } catch (error) {
      console.error("Error in updateAgentStatus:", error)
      return { success: false, message: "Failed to update status" }
    }
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
        quantity: args.quantity,
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

// export const getMyRequestsHistory = query({
//   args: { userId: v.string() },
//   handler: async (ctx, args) => {
//     const requests = await ctx.db
//       .query("requests")
//       .filter((q) => q.eq(q.field("kitchenUserId"), args.userId))
//       .collect()

//     const completedOrCancelledRequests = []

//     for (const request of requests) {
//       const latestStatus = await ctx.db
//         .query("requestStatusUpdates")
//         .filter((q) => q.eq(q.field("requestId"), request.requestId))
//         .order("desc")
//         .first()

//       if (latestStatus && (latestStatus.status === "Completed" || latestStatus.status === "Cancelled")) {
//         completedOrCancelledRequests.push({
//           ...request,
//           requestStatus: latestStatus.status,
//         })
//       }
//     }

//     return completedOrCancelledRequests
//   },
// })

// export const getMyOrdersHistory = query({
//   args: { userId: v.string() },
//   handler: async (ctx, args) => {
//     const orders = await ctx.db
//       .query("requests")
//       .filter((q) => q.eq(q.field("agentUserId"), args.userId))
//       .collect()

//     const completedOrCancelledOrders: any[] | PromiseLike<any[]> = []

//     for (const order of orders) {
//       const latestStatus = await ctx.db
//         .query("requestStatusUpdates")
//         .filter((q) => q.eq(q.field("requestId"), order.requestId))
//         .order("desc")
//         .first()

//       if (latestStatus && (latestStatus.status === "Completed" || latestStatus.status === "Cancelled")) {
//         completedOrCancelledOrders.push({
//           ...order,
//           requestStatus: latestStatus.status,
//         })
//       }
//     }

//     return completedOrCancelledOrders
//   },
// })

export const getMyRequestsHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const requestStatusUpdates = await ctx.db
      .query("requestStatusUpdates")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect()

    const completedOrCancelledRequests = requestStatusUpdates.filter(
      (update) => update.status === "Completed" || update.status === "Cancelled",
    )

    const requestDetails = await Promise.all(
      completedOrCancelledRequests.map(async (update) => {
        const request = await ctx.db
          .query("requests")
          .filter((q) => q.eq(q.field("requestId"), update.requestId))
          .first()

        return {
          requestId: update.requestId || null,
          requestStatus: update.status || null,
          requestDateTime: update.dateAndTime || null,
          srcAddress: request?.srcAddress || null,
          machineId: request?.machineId || null,
          srcLatitude: request?.srcLatitude || null,
          srcLongitude: request?.srcLongitude || null,
          srcContactName: request?.srcContactName || null,
          srcContactNumber: request?.srcContactNumber || null,
          dstAddress: request?.dstAddress || null,
          dstLatitude: request?.dstLatitude || null,
          dstLongitude: request?.dstLongitude || null,
          dstContactName: request?.dstContactName || null,
          dstContactNumber: request?.dstContactNumber || null,
          assgnRefillerName: update.status === "Completed" ? request?.assignRefillerName || null : null,
          assignRefillerContactNumber:
            update.status === "Completed" ? request?.assignRefillerContactNumber || null : null,
        }
      }),
    )

    return requestDetails
  },
})

export const getMyOrdersHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const requestStatusUpdates = await ctx.db
      .query("requestStatusUpdates")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect()

    const completedOrCancelledOrders = requestStatusUpdates.filter(
      (update) => update.status === "Completed" || update.status === "Cancelled",
    )

    const orderDetails = await Promise.all(
      completedOrCancelledOrders.map(async (update) => {
        const order = await ctx.db
          .query("requests")
          .filter((q) => q.eq(q.field("requestId"), update.requestId))
          .first()

        return {
          requestId: update.requestId || null,
          requestStatus: update.status || null,
          requestDateTime: update.dateAndTime || null,
          srcAddress: order?.srcAddress || null,
          machineId: order?.machineId || null,
          srcLatitude: order?.srcLatitude || null,
          srcLongitude: order?.srcLongitude || null,
          srcContactName: order?.srcContactName || null,
          srcContactNumber: order?.srcContactNumber || null,
          dstAddress: order?.dstAddress || null,
          dstLatitude: order?.dstLatitude || null,
          dstLongitude: order?.dstLongitude || null,
          dstContactName: order?.dstContactName || null,
          dstContactNumber: order?.dstContactNumber || null,
          assgnRefillerName: order?.assignRefillerName || null,
          assignRefillerContactNumber: order?.assignRefillerContactNumber || null,
        }
      }),
    )

    return orderDetails
  },
})

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