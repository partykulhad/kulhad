// import { action, internalMutation, mutation } from "./_generated/server"
// import { v } from "convex/values"
// import type { Doc } from "./_generated/dataModel"

// export const broadcastRequest = action({
//   args: { requestId: v.string() },
//   handler: async (ctx, { requestId }) => {
//     const request = await getRequestForBroadcast(ctx, { requestId })

//     if (!request) {
//       console.log(`Request ${requestId} not found or already processed`)
//       return
//     }

//     const nearbyKitchens = await findNearbyKitchens(ctx, {
//       machineLat: request.dstLatitude,
//       machineLon: request.dstLongitude,
//       radius: 5, // Use the maximum radius
//     })

//     if (nearbyKitchens.length === 0) {
//       await updateRequestStatus(ctx, { requestId, status: "No Kitchens Found" })
//       return
//     }

//     // Broadcast to nearby kitchens
//     for (const kitchen of nearbyKitchens) {
//       await createOrUpdateRequestStatusUpdate(ctx, {
//         requestId,
//         kitchenId: kitchen.userId,
//         status: "Pending",
//         latitude: kitchen.latitude,
//         longitude: kitchen.longitude,
//       })
//     }

//     // Schedule next broadcast check
//     await ctx.scheduler.runAfter(30000, checkBroadcastStatus, { requestId })

//     await incrementBroadcastCount(ctx, { requestId })
//   },
// })

// export const checkBroadcastStatus = action({
//   args: { requestId: v.string() },
//   handler: async (ctx, { requestId }) => {
//     const request = await getRequestForBroadcast(ctx, { requestId })

//     if (!request || request.requestStatus !== "Pending") {
//       return
//     }

//     // If no kitchen has accepted, re-broadcast
//     await ctx.runAction(broadcastRequest, { requestId })
//   },
// })

// export const getRequestForBroadcast = internalMutation({
//   args: { requestId: v.string() },
//   handler: async (ctx, { requestId }) => {
//     return await ctx.db
//       .query("requests")
//       .filter((q) => q.eq(q.field("requestId"), requestId))
//       .first()
//   },
// })


// export const updateRequestStatus = internalMutation({
//   args: { requestId: v.string(), status: v.string() },
//   handler: async (ctx, { requestId, status }) => {
//     const request = await ctx.db
//       .query("requests")
//       .filter((q) => q.eq(q.field("requestId"), requestId))
//       .first()

//     if (request) {
//       await ctx.db.patch(request._id, { requestStatus: status })
//     }
//   },
// })

// export const createOrUpdateRequestStatusUpdate = internalMutation({
//   args: {
//     requestId: v.string(),
//     kitchenId: v.string(),
//     status: v.string(),
//     latitude: v.number(),
//     longitude: v.number(),
//   },
//   handler: async (ctx, args) => {
//     const existing = await ctx.db
//       .query("requestStatusUpdates")
//       .filter((q) => q.and(q.eq(q.field("requestId"), args.requestId), q.eq(q.field("userId"), args.kitchenId)))
//       .first()

//     if (existing) {
//       await ctx.db.patch(existing._id, { status: args.status })
//     } else {
//       await ctx.db.insert("requestStatusUpdates", {
//         requestId: args.requestId,
//         userId: args.kitchenId,
//         status: args.status,
//         latitude: args.latitude,
//         longitude: args.longitude,
//         dateAndTime: new Date().toISOString(),
//         isProceedNext: false,
//       })
//     }
//   },
// })

// export const incrementBroadcastCount = internalMutation({
//   args: { requestId: v.string() },
//   handler: async (ctx, { requestId }) => {
//     const request = await ctx.db
//       .query("requests")
//       .filter((q) => q.eq(q.field("requestId"), requestId))
//       .first()

//     if (request) {
//       await ctx.db.patch(request._id, {
//         broadcastCount: (request.broadcastCount || 0) + 1,
//         lastBroadcastTime: new Date().toISOString(),
//       })
//     }
//   },
// })

// export const handleKitchenResponse = mutation({
//   args: { kitchenId: v.string(), requestId: v.string(), status: v.string() },
//   handler: async (ctx, { kitchenId, requestId, status }) => {
//     const request = await ctx.db
//       .query("requests")
//       .filter((q) => q.eq(q.field("requestId"), requestId))
//       .first()

//     if (!request) {
//       return { success: false, message: "Request not found" }
//     }

//     if (request.requestStatus !== "Pending") {
//       return { success: false, message: "Request is no longer pending" }
//     }

//     await ctx.db.patch(request._id, { requestStatus: status, kitchenStatus: status })

//     await ctx.db
//       .query("requestStatusUpdates")
//       .filter((q) => q.and(q.eq(q.field("requestId"), requestId), q.eq(q.field("userId"), kitchenId)))
//       .first()
//       .then((update) => {
//         if (update) {
//           ctx.db.patch(update._id, { status: status })
//         }
//       })

//     if (status === "Accepted") {
//       // Cancel any scheduled broadcasts
//       await ctx.scheduler.cancel(checkBroadcastStatus, { requestId })
//     }

//     return { success: true, message: `Request ${status.toLowerCase()} by kitchen` }
//   },
// })

// // Helper function to find nearby kitchens
// async function findNearbyKitchens(
//   ctx: any,
//   { machineLat, machineLon, radius }: { machineLat: number; machineLon: number; radius: number },
// ): Promise<Doc<"kitchens">[]> {
//   const kitchens = await ctx.db.query("kitchens").collect()
//   const onlineKitchens = kitchens.filter((kitchen: Doc<"kitchens">) => kitchen.status === "online")

//   const nearbyKitchens = onlineKitchens.filter((kitchen: Doc<"kitchens">) => {
//     const distance = calculateDistance(machineLat, machineLon, kitchen.latitude, kitchen.longitude)
//     return distance <= radius
//   })

//   return nearbyKitchens
// }

// // Helper function to calculate distance between two points
// function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
//   const R = 6371 // Radius of the Earth in km
//   const dLat = (lat2 - lat1) * (Math.PI / 180)
//   const dLon = (lon2 - lon1) * (Math.PI / 180)
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
//   return R * c
// }

