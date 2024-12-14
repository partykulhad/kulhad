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


    machines: defineTable({
      id: v.string(),
      name: v.string(),
      location: v.string(),
      description: v.string(),
      status: v.union(v.literal("online"), v.literal("offline")),
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
    iot_data: defineTable({
      machineId: v.string(),
      timestamp: v.string(),
      temperature: v.optional(v.number()),
      rating: v.optional(v.number()),
      canisterLevel:v.optional(v.number()),
    }),
});
