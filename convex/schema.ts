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
  }),

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


  teaContainers: defineTable({
    status: v.union(v.literal("in_kitchen"), v.literal("in_transit"), v.literal("in_machine")),
    currentLocation: v.union(v.literal("kitchen"), v.literal("agent"), v.literal("machine")),
    kitchenId: v.optional(v.id("kitchens")),
    agentId: v.optional(v.id("deliveryAgents")),
    machineId: v.optional(v.id("vendingMachines")),
  }),

  notifications: defineTable({
    type: v.union(v.literal("low_tea"), v.literal("tea_ready"), v.literal("container_replaced")),
    recipientId: v.union(v.id("kitchens"), v.id("deliveryAgents")),
    message: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("accepted"), v.literal("rejected"), v.literal("expired")),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  }),

  notificationQueue: defineTable({
    notificationId: v.id("notifications"),
    agentId: v.id("deliveryAgents"),
    distance: v.number(),
    order: v.number(),
  }).index("by_notification", ["notificationId"]),
});

