import {defineSchema, defineTable} from "convex/server";
import {v} from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  })
    .index("by_clerk_id", ["userId"])
    .index("by_email", ["email"]),

  appUser: defineTable({
    username: v.string(),
    password: v.string(),
    salt: v.optional(v.string()),
    role: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    token: v.optional(v.string()),
    tokenExpiration: v.optional(v.number()),
    fcmToken: v.optional(v.string()),
    userDevice: v.optional(v.string()),
    appVersion:v.optional(v.string()),
  }).index("by_username", ["username"]).index("by_userId", ["userId"]),

  machines: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    model: v.string(),
    installedDate: v.optional(v.string()),
    address: v.object({
      building: v.string(),
      floor: v.string(),
      area: v.string(),
      district: v.string(),
      state: v.string(),
    }),
    gisLatitude: v.string(),
    gisLongitude: v.string(),
    price: v.optional(v.string()),
    startTime:  v.optional(v.string()),
    endTime:  v.optional(v.string()),
    flushTimeMinutes:  v.optional(v.number()),
    mlToDispense:  v.optional(v.number()),
    status: v.string(),
    temperature: v.number(),
    rating: v.number(),
    canisterLevel: v.number(),
    replenishmentOrder: v.object({
      status: v.string(),
      eta: v.union(v.string(), v.null()),
    }),
    deliveryBoy: v.union(
      v.object({
        name: v.string(),
        location: v.string(),
        eta: v.union(v.string(), v.null()),
      }),
      v.null()
    ),
    lastFulfilled: v.string(),
    slo: v.optional(v.object({
      uptime: v.number(),
      responseTime: v.number(),
      availabilityTarget: v.number(),
    })),
    
  })
  .index("by_machineId", ["id"])
    .index("by_status", ["status"]),

  vendors: defineTable({
    id: v.string(),
    name: v.string(),
    status: v.string(),
    amountDue: v.number(),
    lastOrder: v.string(),
    contactPerson: v.string(),
    email: v.string(),
    phone: v.string(),
    company: v.string(),
  }),

  machine_data: defineTable({
    machineId: v.string(),
    timestamp: v.string(),
    temperature: v.optional(v.number()),
    rating: v.optional(v.number()),
    canisterLevel: v.optional(v.number()),
  }),

  deliveryAgents: defineTable({
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
    salt: v.string(),
    role: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    status: v.optional(v.string()),
    trips: v.array(
      v.object({
        startPoint: v.string(),
        kitchenName: v.string(),
        endPoint: v.string(),
        refilledMachineId: v.string(),
        distance: v.number(),
        timestamp: v.string(),
      })
    ),
  }).index("by_userId", ["userId"]),
  
  kitchens: defineTable({
    name: v.string(),
    address: v.string(),
    manager: v.string(),
    managerMobile: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    capacity: v.number(),
    userId: v.string(),
    username: v.string(),
    password: v.string(),
    salt: v.string(),
    role: v.string(),
    status: v.optional(v.string()),
    members: v.array(
      v.object({
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
      })
    ),
  }),
  
  notifications: defineTable({
    machineId: v.string(),
    kitchenId: v.string(),
    kitchenName: v.string(),
    distance:v.optional(v.number()),
    timestamp: v.number(),
    message: v.string(),
    status:  v.optional(v.string()),// 'pending', 'accepted', 'rejected', 'canceled'
    createdAt:v.optional(v.number()),
    updatedAt:v.optional(v.number()),
  }).index("by_machineId", ["machineId"]).index("by_status", ["status"]),

  agentNotifications: defineTable({
    agentId: v.string(),
    agentName: v.string(),
    kitchenId: v.string(),
    kitchenName: v.string(),
    distance: v.optional(v.number()),
    timestamp: v.number(),
    message: v.string(),
    status:  v.optional(v.string()),// 'pending', 'accepted', 'rejected', 'canceled'
    createdAt:v.optional(v.number()),
    updatedAt:v.optional(v.number()),
  }).index("by_agentId", ["agentId"]).index("by_status", ["status"]),

  requests: defineTable({
    requestId: v.string(),
    machineId: v.string(),
    kitchenUserId: v.union(v.string(), v.array(v.string())),
    agentUserId: v.optional(v.union(v.string(), v.array(v.string()))),
    kitchenStatus: v.optional(v.string()),
    agentStatus: v.optional(v.string()),
    requestStatus: v.string(),
    requestDateTime: v.string(),
    srcAddress: v.optional(v.string()),
    srcLatitude: v.optional(v.number()),
    srcLongitude: v.optional(v.number()),
    srcContactName: v.optional(v.string()),
    srcContactNumber: v.optional(v.string()),
    dstAddress: v.optional(v.string()),
    dstLatitude: v.optional(v.number()),
    dstLongitude: v.optional(v.number()),
    dstContactName: v.optional(v.string()),
    dstContactNumber: v.optional(v.string()),
    assignRefillerName: v.optional(v.string()),
    assignRefillerContactNumber: v.optional(v.string()),
    reason: v.optional(v.string()),
    teaType:v.optional(v.string()),
    quantity: v.optional(v.number()),
    totalDistance: v.optional(v.number()),
    statusMessage: v.optional(v.string()),
  }).index("by_machineId", ["machineId"])
  .index("by_requestId", ["requestId"])
    .index("by_kitchenUserId", ["kitchenUserId"])
    .index("by_agentUserId", ["agentUserId"])
    .index("by_requestStatus", ["requestStatus"])
    .index("by_kitchenStatus", ["kitchenStatus"]),


  requestStatusUpdates: defineTable({
    requestId: v.string(),
    userId: v.string(),
    status: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    dateAndTime: v.string(),
    isProceedNext: v.boolean(),
    teaType:v.optional(v.string()),
    quantity: v.optional(v.number()),
    reason: v.optional(v.string()),
    message: v.optional(v.string()),
    totalDistance: v.optional(v.number()),
  }).index("by_requestId", ["requestId"]),

  transactions: defineTable({
    transactionId: v.string(),
    customTransactionId: v.optional(v.string()), // Add this field for our custom transaction ID
    imageUrl: v.string(),
    amount: v.number(),
    cups: v.number(),
    amountPerCup: v.number(),
    machineId: v.string(),
    description: v.string(),
    status: v.string(),
    paymentId: v.optional(v.string()),
    vpa: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_transactionId", ["transactionId"])
    .index("by_customTransactionId", ["customTransactionId"]) // Add this index
    .index("by_machineId", ["machineId"])
    .index("by_status", ["status"]),
});


