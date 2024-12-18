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
      canisterLevel:v.optional(v.number()),
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
      createdAt: v.number(), // Add this line
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
    }),
});
