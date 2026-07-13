import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("machines").collect()
  },
})

export const add = mutation({
  args: {
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
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    teaFillStartQuantity: v.optional(v.number()),
    teaFillEndQuantity: v.optional(v.number()),
    flushTimeMinutes: v.optional(v.number()),
    mlToDispense: v.optional(v.number()),
    // Manager fields
    managerName: v.optional(v.string()),
    contactNo: v.optional(v.string()),
    email: v.optional(v.string()),
    machineType: v.optional(v.string()),
    breakTime: v.optional(v.string()),
    breakStart: v.optional(v.string()),
    breakEnd: v.optional(v.string()),
    lockPass: v.optional(v.string()),
    // New working days field
    workingDays: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const machineId = await ctx.db.insert("machines", {
      ...args,
      status: "offline",
      temperature: 70,
      rating: 0,
      canisterLevel: 100,
      replenishmentOrder: { status: "Not required", eta: null },
      deliveryBoy: null,
      lastFulfilled: new Date().toISOString(),
    })
    return { id: machineId }
  },
})

export const toggleStatus = mutation({
  args: { 
    id: v.id("machines"),
    targetStatus: v.optional(v.union(v.literal("online"), v.literal("offline")))
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db.get(args.id)
    if (!machine) throw new Error("Machine not found")
    
    // If targetStatus is provided, use it. Otherwise, flip the current status.
    const newStatus = args.targetStatus !== undefined 
      ? args.targetStatus 
      : (machine.status === "online" ? "offline" : "online")
      
    const patchData: any = { status: newStatus }
    if (newStatus === "online") {
      patchData.lastSeenAt = Date.now()
    }
    await ctx.db.patch(args.id, patchData)
    return { id: args.id, status: newStatus }
  },
})

export const updateMachineData = mutation({
  args: {
    id: v.id("machines"),
    temperature: v.number(),
    rating: v.number(),
    canisterLevel: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, temperature, rating, canisterLevel } = args
    const machine = await ctx.db.get(id)
    if (!machine) throw new Error("Machine not found")
    await ctx.db.patch(id, { temperature, rating, canisterLevel })
    return { id, temperature, rating, canisterLevel }
  },
})

export const getMachineDetails = query({
  args: { id: v.id("machines") },
  handler: async (ctx, args) => {
    const machine = await ctx.db.get(args.id)
    if (!machine) throw new Error("Machine not found")
    return machine
  },
})

export const getMachineData = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), args.machineId))
      .first()

    if (!machine) {
      return { success: false, error: "Machine not found" }
    }

    const globalSettings = await ctx.db.query("globalSettings").first()

    return {
      success: true,
      machineId: machine.id,
      price: machine.price || "N/A",
      status: machine.status,
      startTime: machine.startTime,
      endTime: machine.endTime,
      teaFillStartQuantity: machine.teaFillStartQuantity,
      teaFillEndQuantity: machine.teaFillEndQuantity,
      flushTimeMinutes: globalSettings?.flushTimeMinutes ?? machine.flushTimeMinutes,
      mlToDispense: machine.mlToDispense,
      // Include manager fields
      managerName: machine.managerName,
      contactNo: machine.contactNo,
      email: machine.email,
      machineType: machine.machineType,
      breakTime: machine.breakTime,
      lockPass: machine.lockPass,
      // Include working days
      workingDays: machine.workingDays,
      // Remote test dispense
      pendingDispenseId: machine.pendingDispenseId,
      // Refill windows
      serviceRefillStart: machine.serviceRefillStart,
      serviceRefillEnd: machine.serviceRefillEnd,
    }
  },
})

export const triggerRemoteDispense = mutation({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), args.machineId))
      .first()

    if (!machine) {
      throw new Error("Machine not found")
    }

    // Set a new unique ID so the kiosk knows it's a fresh command
    await ctx.db.patch(machine._id, {
      pendingDispenseId: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9)
    })
    
    return { success: true }
  },
})

export const clearRemoteDispense = mutation({
  args: { machineId: v.string(), dispenseId: v.string() },
  handler: async (ctx, args) => {
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), args.machineId))
      .first()

    if (!machine) {
      throw new Error("Machine not found")
    }

    // Only clear if the ID matches what we're trying to clear
    if (machine.pendingDispenseId === args.dispenseId) {
      await ctx.db.patch(machine._id, {
        pendingDispenseId: undefined
      })
    }
    
    return { success: true }
  },
})

// Heartbeat: the kiosk calls getMachineData every 60s regardless of state,
// so this is the most reliable "still alive" signal without any Pi-side changes.
export const touchLastSeen = mutation({
  args: {
    machineId: v.string(),
    // Remote monitoring fields — piggybacked on the same 60s heartbeat call
    // the kiosk already makes (getMachineData), rather than a separate
    // polling cycle. All optional: an older kiosk build that doesn't send
    // them yet just leaves these fields unchanged.
    currentPage: v.optional(v.string()),
    cpuPercent: v.optional(v.number()),
    memPercent: v.optional(v.number()),
    diskPercent: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    heatingIssue: v.optional(v.boolean()),
    appVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { machineId, ...telemetry } = args
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) return { success: false }

    await ctx.db.patch(machine._id, { lastSeenAt: Date.now(), ...telemetry })
    return { success: true }
  },
})

export const update = mutation({
  args: {
    machineId: v.id("machines"),
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
    cups: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    teaFillStartQuantity: v.optional(v.number()),
    teaFillEndQuantity: v.optional(v.number()),
    flushTimeMinutes: v.optional(v.number()),
    mlToDispense: v.optional(v.number()),
    // Manager fields
    managerName: v.optional(v.string()),
    contactNo: v.optional(v.string()),
    email: v.optional(v.string()),
    machineType: v.optional(v.string()),
    breakTime: v.optional(v.string()),
    breakStart: v.optional(v.string()),
    breakEnd: v.optional(v.string()),
    lockPass: v.optional(v.string()),
    // New working days field
    workingDays: v.optional(v.string()),
    // Kitchen this machine is mapped to (kitchens.userId) — required for
    // canister-low refill requests to reach anyone; see checkCanisterLevel.
    kitchenId: v.optional(v.string()),
    // Service refill window
    serviceRefillStart: v.optional(v.string()),
    serviceRefillEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { machineId, ...updates } = args
    await ctx.db.patch(machineId, updates)
    return { id: machineId }
  },
})

export const remove = mutation({
  args: { id: v.id("machines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return { success: true }
  },
})

// Get machine by ID
export const getMachineById = query({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("machines")
      .withIndex("by_machineId", (q) => q.eq("id", args.machineId))
      .first()
  },
})

export const getByMachineId = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const machineData = await ctx.db
      .query("machine_data")
      .withIndex("by_machineId", (q) => q.eq("machineId", args.machineId))
      .order("desc")
      .take(10)
    return machineData
  },
})

export const getAllActiveMachines = query({
  args: {},
  handler: async (ctx) => {
    // Get all active machines
    const machines = await ctx.db
      .query("machines")
      .filter((q) => q.neq(q.field("status"), "offline"))
      .collect()
    return machines
  },
})

// Helper function to check if machine should be working on a given day
export const isMachineWorkingToday = query({
  args: {
    machineId: v.string(),
    dayOfWeek: v.number(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), args.machineId))
      .first()

    if (!machine) {
      return { success: false, error: "Machine not found" }
    }

    const workingDays = machine.workingDays || "MON_FRI"
    const dayOfWeek = args.dayOfWeek

    switch (workingDays) {
      case "MON_FRI":
        // Monday (1) to Friday (5)
        return { success: true, isWorking: dayOfWeek >= 1 && dayOfWeek <= 5 }
      case "MON_SAT":
        // Monday (1) to Saturday (6)
        return { success: true, isWorking: dayOfWeek >= 1 && dayOfWeek <= 6 }
      case "ALL_DAYS":
        // All 7 days
        return { success: true, isWorking: true }
      default:
        // Default to Monday-Friday if unknown code
        return { success: true, isWorking: dayOfWeek >= 1 && dayOfWeek <= 5 }
    }
  },
})

export const reduceCupsCount = mutation({
  args: {
    machineId: v.string(),
    numberOfCups: v.number(),
  },
  handler: async (ctx, args) => {
    const { machineId, numberOfCups } = args

    // Validate numberOfCups is positive
    if (numberOfCups <= 0) {
      return { success: false, message: "Number of cups must be greater than 0" }
    }

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return { success: false, message: "Machine not found" }
    }

    // Check if machine has enough cups
    const currentCups = machine.cups || 0
    if (currentCups < numberOfCups) {
      return {
        success: false,
        message: `Insufficient cups. Available: ${currentCups}, Requested: ${numberOfCups}`,
      }
    }

    // Calculate new cups count
    const newCupsCount = currentCups - numberOfCups

    // Assuming maximum capacity is 50 cups = 100% canisterLevel
    const maxCupsCapacity = 50
    const currentCanisterLevel = machine.canisterLevel || 0
    const newCanisterLevel = Math.max(0, Math.round((newCupsCount / maxCupsCapacity) * 100))

    // Update the machine with reduced cups count and updated canisterLevel
    await ctx.db.patch(machine._id, {
      cups: newCupsCount,
      canisterLevel: newCanisterLevel,
    })

    return {
      success: true,
      message: `Successfully reduced ${numberOfCups} cups from machine ${machineId}`,
      previousCups: currentCups,
      newCups: newCupsCount,
      previousCanisterLevel: currentCanisterLevel,
      newCanisterLevel: newCanisterLevel,
    }
  },
})

export const getMachineCups = query({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const { machineId } = args

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return { success: false, message: "Machine not found" }
    }

    return {
      success: true,
      machineId,
      cups: machine.cups || 0,
      machineName: machine.name || "Unknown Machine",
    }
  },
})

export const updateMachineStatus = mutation({
  args: {
    machineId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { machineId, status } = args

    // Validate status value
    if (status !== "online" && status !== "offline") {
      return {
        success: false,
        message: "Invalid status. Must be 'online' or 'offline'",
      }
    }

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return {
        success: false,
        message: "Machine not found",
      }
    }

    // Update the machine status
    await ctx.db.patch(machine._id, {
      status: status,
    })

    return {
      success: true,
      message: `Machine ${machineId} status updated to ${status}`,
      machineId,
      previousStatus: machine.status,
      newStatus: status,
    }
  },
})

export const getMachineStatus = query({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const { machineId } = args

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return { success: false, message: "Machine not found" }
    }

    return {
      success: true,
      machineId,
      status: machine.status || "offline",
      machineName: machine.name || "Unknown Machine",
    }
  },
})

export const updateWaterLevel = mutation({
  args: {
    machineId: v.string(),
    waterLevelLow: v.boolean(),
    // Kiosk-side timestamp (ISO string), for cross-referencing against this
    // server's own receipt time if the two ever look suspiciously far apart
    // (network delay, retried request, clock drift on the Pi). Not used as
    // the authoritative timestamp — the server-side fields below are.
    reportedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { machineId, waterLevelLow, reportedAt } = args

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return {
        success: false,
        message: "Machine not found",
      }
    }

    const previousValue = machine.waterLevelLow ?? false
    const changed = waterLevelLow !== previousValue

    // Separate fields per direction — clearing the alert must not erase the
    // original "went low" time, and vice versa. Only the field matching this
    // specific transition gets a new timestamp; the other is left untouched.
    let waterLevelWentLowAt = machine.waterLevelWentLowAt
    let waterLevelClearedAt = machine.waterLevelClearedAt
    if (changed) {
      if (waterLevelLow) {
        waterLevelWentLowAt = Date.now()
      } else {
        waterLevelClearedAt = Date.now()
      }
    }

    await ctx.db.patch(machine._id, {
      waterLevelLow,
      waterLevelWentLowAt,
      waterLevelClearedAt,
    })

    if (changed) {
      console.log(
        `[WaterLevel] Machine ${machineId} waterLevelLow ${previousValue} -> ${waterLevelLow} ` +
          `at ${new Date(waterLevelLow ? waterLevelWentLowAt! : waterLevelClearedAt!).toISOString()} ` +
          `(kiosk reported: ${reportedAt || "n/a"})`,
      )
    }

    return {
      success: true,
      message: `Machine ${machineId} waterLevelLow updated to ${waterLevelLow}`,
      machineId,
      machineName: machine.name || "Unknown Machine",
      previousValue,
      waterLevelLow,
      waterLevelWentLowAt,
      waterLevelClearedAt,
    }
  },
})

export const getMachineWaterLevel = query({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const { machineId } = args

    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return { success: false, message: "Machine not found" }
    }

    return {
      success: true,
      machineId,
      machineName: machine.name || "Unknown Machine",
      waterLevelLow: machine.waterLevelLow ?? false,
      waterLevelWentLowAt: machine.waterLevelWentLowAt,
      waterLevelClearedAt: machine.waterLevelClearedAt,
    }
  },
})

// Update cup status (for POST)
export const updateCupStatus = mutation({
  args: {
    machineId: v.string(),
    cup_present: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { machineId, cup_present } = args

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return {
        ok: false,
        error: "Machine not found",
      }
    }

    // Update the cup_status
    await ctx.db.patch(machine._id, {
      cup_status: cup_present,
    })

    // Return conditional response based on cupStatus
    if (cup_present === true) {
      return {
        ok: true,
        next: "START_DISPENSE",
      }
    } else {
      return {
        ok: true,
        next: "STOP_DISPENSE",
      }
    }
  },
})

// Get cup status (for GET)
export const getCupStatus = query({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const { machineId } = args

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return {
        success: false,
        error: "Machine not found",
      }
    }

    return {
      success: true,
      machineId: machine.id,
      cupStatus: machine.cup_status ?? false,
    }
  },
})

// Update machine price
export const updateMachinePrice = mutation({
  args: {
    machineId: v.string(),
    price: v.string(),
  },
  handler: async (ctx, args) => {
    const { machineId, price } = args

    // Find the machine with this machineId
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return {
        success: false,
        error: "Machine not found",
      }
    }

    // Update the price
    await ctx.db.patch(machine._id, {
      price: price,
    })

    return {
      success: true,
      message: "Price updated successfully",
      machineId: machine.id,
      newPrice: price,
    }
  },
})

export const getLockPass = query({
  args: {
    machineId: v.string(),
    lockPass: v.string(),
  },
  handler: async (ctx, args) => {
    const { machineId, lockPass } = args

    const machine = await ctx.db
      .query("machines")
      .withIndex("by_machineId", (q) => q.eq("id", machineId))
      .first()

    if (!machine) {
      return {
        status: 404,
        success: false,
        message: "Machine not found",
      }
    }

    if (!machine.lockPass) {
      return {
        status: 400,
        success: false,
        message: "Lock pass is not set for this machine",
      }
    }

    if (machine.lockPass !== lockPass) {
      return {
        status: 401,
        success: false,
        message: "Invalid lock pass",
      }
    }

    return {
      status: 200,
      success: true,
      message: "Lock pass matched successfully",
      machineId: machine.id,
    }
  },
})
