import { mutation } from "./_generated/server"
import { v, ConvexError } from "convex/values"

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

// Helper function to generate custom request ID
async function generateRequestId(ctx: any): Promise<string> {
  const prefix = "REQ"
  const lastRequest = await ctx.db.query("requests").order("desc").first()

  let counter = 1
  if (lastRequest && lastRequest.requestId) {
    const lastCounter = Number.parseInt(lastRequest.requestId.split("-")[1])
    counter = isNaN(lastCounter) ? 1 : lastCounter + 1
  }

  return `${prefix}-${counter.toString().padStart(4, "0")}`
}

// Helper function to check time window and determine quantity
function getTimeWindowAndQuantity(
  endTime: string,
  machine: any,
): { shouldBlock: boolean; quantity: number; timeWindow: string } {
  // Get current time in IST
  const now = new Date()
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const currentHour = istTime.getHours()
  const currentMinute = istTime.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinute

  console.log(
    `Current IST time: ${currentHour}:${currentMinute.toString().padStart(2, "0")} (${currentTimeInMinutes} minutes)`,
  )

  // Parse end time (format like "13:39")
  const endTimeParts = endTime.match(/(\d{1,2}):(\d{2})/)
  if (!endTimeParts) {
    console.error("Invalid end time format:", endTime)
    return { shouldBlock: false, quantity: machine.teaFillStartQuantity || 0, timeWindow: "invalid" }
  }

  const endHour = Number.parseInt(endTimeParts[1])
  const endMinute = Number.parseInt(endTimeParts[2])
  const endTimeInMinutes = endHour * 60 + endMinute

  console.log(`End time: ${endHour}:${endMinute.toString().padStart(2, "0")} (${endTimeInMinutes} minutes)`)

  // Calculate time difference
  let timeDifferenceInMinutes = endTimeInMinutes - currentTimeInMinutes

  // Handle case where end time is next day (e.g., current: 23:00, end: 01:00)
  if (timeDifferenceInMinutes < 0) {
    timeDifferenceInMinutes += 24 * 60 // Add 24 hours
  }

  console.log(`Time difference: ${timeDifferenceInMinutes} minutes`)

  // Determine time window and quantity
  if (timeDifferenceInMinutes <= 60) {
    // Within 1 hour - block request
    console.log("Request blocked: Current time is within 1 hour of machine end time")
    return { shouldBlock: true, quantity: 0, timeWindow: "within_1_hour" }
  } else if (timeDifferenceInMinutes <= 120) {
    // Between 1-2 hours - use end quantity
    console.log("Within 1-2 hours of end time: Using end quantity")
    return {
      shouldBlock: false,
      quantity: machine.teaFillEndQuantity || 0,
      timeWindow: "1_to_2_hours",
    }
  } else {
    // More than 2 hours - use start quantity
    console.log("More than 2 hours from end time: Using start quantity")
    return {
      shouldBlock: false,
      quantity: machine.teaFillStartQuantity || 0,
      timeWindow: "more_than_2_hours",
    }
  }
}

// Helper function to determine priority and validate request timing
function getPriorityAndValidateTime(startTime: string): {
  isAllowed: boolean
  priority: number
  isPriority1Window: boolean
  message: string
} {
  // Get current time in IST
  const now = new Date()
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const currentHour = istTime.getHours()
  const currentMinute = istTime.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinute

  console.log(
    `Current IST time: ${currentHour}:${currentMinute.toString().padStart(2, "0")} (${currentTimeInMinutes} minutes)`,
  )

  // Parse start time (format like "09:00" or "9:00")
  const startTimeParts = startTime.match(/(\d{1,2}):(\d{2})/)
  if (!startTimeParts) {
    console.error("Invalid start time format:", startTime)
    return {
      isAllowed: false,
      priority: 0,
      isPriority1Window: false,
      message: "Invalid start time format",
    }
  }

  const startHour = Number.parseInt(startTimeParts[1])
  const startMinute = Number.parseInt(startTimeParts[2])
  const startTimeInMinutes = startHour * 60 + startMinute

  console.log(`Start time: ${startHour}:${startMinute.toString().padStart(2, "0")} (${startTimeInMinutes} minutes)`)

  // Calculate 1 hour before start time
  const oneHourBeforeStartTime = startTimeInMinutes - 60

  console.log(`One hour before start time: ${oneHourBeforeStartTime} minutes`)

  // Determine the time window and priority
  if (currentTimeInMinutes >= startTimeInMinutes) {
    // At or after start time - Priority 2, always allowed
    console.log("Current time is at or after start time - Priority 2 request")
    return {
      isAllowed: true,
      priority: 2,
      isPriority1Window: false,
      message: "Request allowed - Priority 2 (after start time)",
    }
  } else if (currentTimeInMinutes >= oneHourBeforeStartTime) {
    // Within 1 hour before start time - Priority 1 window
    console.log("Current time is within 1 hour before start time - Priority 1 window")
    return {
      isAllowed: true, // Will be validated against existing priority 1 requests
      priority: 1,
      isPriority1Window: true,
      message: "Priority 1 window - needs validation against existing priority 1 requests",
    }
  } else {
    // More than 1 hour before start time - Not allowed
    console.log("Current time is more than 1 hour before start time - Request blocked")
    return {
      isAllowed: false,
      priority: 0,
      isPriority1Window: false,
      message: `Request only allowed within 1 hour before start time (${startTime}) or after start time`,
    }
  }
}

// Helper function to normalize date strings for comparison
function normalizeDateString(dateStr: string): string {
  // Try to extract day, month, year regardless of format
  let day, month, year

  // Check if it's in format "DD/M/YYYY" or "D/M/YYYY"
  const slashFormat = /(\d{1,2})\/(\d{1,2})\/(\d{4})/
  const slashMatch = dateStr.match(slashFormat)

  if (slashMatch) {
    day = Number.parseInt(slashMatch[1])
    month = Number.parseInt(slashMatch[2])
    year = Number.parseInt(slashMatch[3])
    return `${year}-${month}-${day}` // Convert to YYYY-MM-DD for comparison
  }

  // Check if it's in format "MM-DD-YYYY HH:MM:SS am/pm"
  const dashFormat = /(\d{1,2})-(\d{1,2})-(\d{4})/
  const dashMatch = dateStr.match(dashFormat)

  if (dashMatch) {
    month = Number.parseInt(dashMatch[1])
    day = Number.parseInt(dashMatch[2])
    year = Number.parseInt(dashMatch[3])
    return `${year}-${month}-${day}` // Convert to YYYY-MM-DD for comparison
  }

  // If we can't parse it, return the original string
  return dateStr
}

// Helper function to get today's date in normalized format
function getTodayNormalized(): string {
  const now = new Date()
  const istOptions = { timeZone: "Asia/Kolkata" }
  const todayIST = new Date(now.toLocaleString("en-US", istOptions))

  const day = todayIST.getDate()
  const month = todayIST.getMonth() + 1
  const year = todayIST.getFullYear()

  return `${year}-${month}-${day}`
}

// Helper function to check if there's already a priority 1 request for this machine today
async function hasPriority1RequestToday(ctx: any, machineId: string): Promise<boolean> {
  const todayNormalized = getTodayNormalized()
  console.log(`Checking for priority 1 requests on ${todayNormalized} for machine ${machineId}`)

  // Get all requests for this machine with priority 1
  const machineRequests = await ctx.db
    .query("requests")
    .filter((q: any) => q.and(q.eq(q.field("machineId"), machineId), q.eq(q.field("priority"), 1)))
    .collect()

  console.log(`Found ${machineRequests.length} priority 1 requests for machine ${machineId}`)

  // Check each request to see if any were created today
  for (const request of machineRequests) {
    // Get the date part from requestDateTime
    const requestDateParts = request.requestDateTime.split(",")[0].trim()
    const normalizedRequestDate = normalizeDateString(requestDateParts)

    console.log(
      `Request ${request.requestId} date: ${requestDateParts}, normalized: ${normalizedRequestDate}, comparing with today: ${todayNormalized}`,
    )

    if (normalizedRequestDate === todayNormalized) {
      console.log(`Found priority 1 request ${request.requestId} created today for machine ${machineId}`)
      return true
    }
  }

  console.log(`No priority 1 requests found today for machine ${machineId}`)
  return false
}

// Improved helper function to check if it's the first request of the day for a machine
async function isFirstRequestOfDay(ctx: any, machineId: string): Promise<boolean> {
  const todayNormalized = getTodayNormalized()
  console.log(`Checking for requests on normalized date ${todayNormalized} for machine ${machineId}`)

  // Get all requests for this machine
  const machineRequests = await ctx.db
    .query("requests")
    .withIndex("by_machineId", (q: { eq: (arg0: string, arg1: string) => any }) => q.eq("machineId", machineId))
    .collect()

  console.log(`Found ${machineRequests.length} total requests for machine ${machineId}`)

  // Check each request to see if any were created today
  let todayRequestsCount = 0

  for (const request of machineRequests) {
    // Get the date part from requestDateTime
    const requestDateParts = request.requestDateTime.split(",")[0].trim()
    const normalizedRequestDate = normalizeDateString(requestDateParts)

    console.log(
      `Request ${request.requestId} date: ${requestDateParts}, normalized: ${normalizedRequestDate}, comparing with today: ${todayNormalized}`,
    )

    if (normalizedRequestDate === todayNormalized) {
      todayRequestsCount++
      console.log(`Found request ${request.requestId} created today for machine ${machineId}`)
    }
  }

  console.log(`Total requests found today for machine ${machineId}: ${todayRequestsCount}`)
  return todayRequestsCount === 0
}

// ORIGINAL MUTATION - For dynamic canister level checks (Priority 2)
export const checkCanisterLevel = mutation({
  args: { machineId: v.string(), canisterLevel: v.number() },
  handler: async (ctx, args) => {
    const { machineId, canisterLevel } = args

    console.log(`[DYNAMIC] Checking canister level for machine ${machineId}: ${canisterLevel}%`)

    if (canisterLevel > 20) {
      return { success: true, message: "Canister level is above threshold" }
    }

    const machine = await ctx.db
      .query("machines")
      .filter((q: any) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      throw new ConvexError("Machine not found")
    }

    console.log(
      `[DYNAMIC] Machine found: ${machine.name}, Type: ${machine.machineType}, Start Time: ${machine.startTime}, End Time: ${machine.endTime}`,
    )

    // For dynamic requests, always create Priority 2 requests
    const priority = 2
    console.log(`[DYNAMIC] Request will be created with priority: ${priority}`)

    // Initialize quantity variable
    let quantity: number = machine.teaFillStartQuantity || 0

    // Check if machine has end time configured (applies to both Full Time and Part Time)
    if (machine.endTime) {
      const timeResult = getTimeWindowAndQuantity(machine.endTime, machine)

      if (timeResult.shouldBlock) {
        console.log("[DYNAMIC] Request blocked: Current time is within 1 hour of machine end time")
        return {
          success: false,
          message: "Request not allowed within 1 hour of machine end time",
          requestId: null,
          kitchenUserIds: [],
        }
      }

      // Use the quantity determined by time window
      quantity = timeResult.quantity
      console.log(`[DYNAMIC] Quantity set based on time window (${timeResult.timeWindow}): ${quantity}`)
    } else {
      // Fallback logic for machines without end time
      if (machine.machineType === "Full Time") {
        quantity = machine.teaFillStartQuantity || 0
      } else if (machine.machineType === "Part Time") {
        quantity = machine.teaFillEndQuantity || 0
      } else {
        // Default case for machines without specified type
        quantity = machine.teaFillStartQuantity || 0
      }
      console.log(
        `[DYNAMIC] Quantity determined by machine type fallback: ${quantity} for machine type: ${machine.machineType}`,
      )
    }

    // Check if kitchenId exists in the machine record
    if (!machine.kitchenId) {
      return {
        success: false,
        message: "No kitchen mapped to this machine",
        requestId: null,
        kitchenUserIds: [],
      }
    }

    const machineLat = Number.parseFloat(machine.gisLatitude)
    const machineLon = Number.parseFloat(machine.gisLongitude)

    if (isNaN(machineLat) || isNaN(machineLon)) {
      throw new ConvexError("Invalid machine coordinates")
    }

    const customRequestId = await generateRequestId(ctx)

    // Get the kitchenId from the machine record
    const kitchenIds = Array.isArray(machine.kitchenId) ? machine.kitchenId : [machine.kitchenId]

    // Get the kitchen user IDs from the kitchens table
    const kitchenUserIds: string[] = []

    for (const kitchenId of kitchenIds) {
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q: any) => q.eq(q.field("userId"), kitchenId))
        .first()

      if (kitchen && kitchen.userId && kitchen.status === "online") {
        kitchenUserIds.push(kitchen.userId)
      }
    }

    // Current date and time in IST format
    const currentDateTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    })

    // If no online kitchens found
    if (kitchenUserIds.length === 0) {
      // Update the request status if no kitchens were found
      const requestId = await ctx.db.insert("requests", {
        requestId: customRequestId,
        machineId: machineId,
        requestStatus: "No Kitchens Found",
        kitchenStatus: "Pending",
        agentStatus: "Pending",
        requestDateTime: currentDateTime,
        dstAddress:
          machine.address.building +
          ", " +
          machine.address.floor +
          ", " +
          machine.address.area +
          ", " +
          machine.address.district +
          ", " +
          machine.address.state,
        dstLatitude: machineLat,
        dstLongitude: machineLon,
        kitchenUserId: [],
        agentUserId: "",
        priority: priority,
        quantity: quantity,
      })

      return {
        success: false,
        message: "No online kitchens found for this machine",
        requestId: customRequestId,
        kitchenUserIds: [],
        priority: priority,
        quantity: quantity,
      }
    }

    // Create initial request with basic information including quantity
    const requestId = await ctx.db.insert("requests", {
      requestId: customRequestId,
      machineId: machineId,
      requestStatus: "Pending",
      kitchenStatus: "Pending",
      agentStatus: "Pending",
      requestDateTime: currentDateTime,
      dstAddress:
        machine.address.building +
        ", " +
        machine.address.floor +
        ", " +
        machine.address.area +
        ", " +
        machine.address.district +
        ", " +
        machine.address.state,
      dstLatitude: machineLat,
      dstLongitude: machineLon,
      kitchenUserId: kitchenUserIds,
      agentUserId: "",
      priority: priority,
      quantity: quantity,
    })

    // Store mapped kitchens in requestStatusUpdates
    for (const kitchenId of kitchenIds) {
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q: any) => q.eq(q.field("userId"), kitchenId))
        .first()

      if (kitchen && kitchen.userId && kitchen.status === "online") {
        await ctx.db.insert("requestStatusUpdates", {
          requestId: customRequestId,
          userId: kitchen.userId,
          status: "Pending",
          latitude: kitchen.latitude,
          longitude: kitchen.longitude,
          dateAndTime: new Date().toISOString(),
          isProceedNext: false,
        })
      }
    }

    console.log(
      `[DYNAMIC] Request created successfully: ${customRequestId} with priority: ${priority} and quantity: ${quantity}`,
    )

    return {
      success: true,
      message: `Dynamic request created with priority ${priority} and mapped kitchens identified`,
      requestId: customRequestId,
      kitchenUserIds: kitchenUserIds,
      priority: priority,
      quantity: quantity,
    }
  },
})

// NEW MUTATION - For scheduled requests (Priority 1 only)
export const checkScheduledRequest = mutation({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const { machineId } = args

    console.log(`[SCHEDULED] Processing scheduled request for machine ${machineId}`)

    const machine = await ctx.db
      .query("machines")
      .filter((q: any) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      return { success: false, message: "Machine not found" }
    }

    console.log(
      `[SCHEDULED] Machine found: ${machine.name}, Type: ${machine.machineType}, Start Time: ${machine.startTime}, End Time: ${machine.endTime}`,
    )

    // CHECK: Only create Priority 1 requests if none exist today
    const hasPriority1Today = await hasPriority1RequestToday(ctx, machineId)
    if (hasPriority1Today) {
      console.log(`[SCHEDULED] Machine ${machineId} already has a priority 1 request today. Request blocked.`)
      return {
        success: false,
        message: "Machine already has a priority 1 request today. Only one priority 1 request allowed per day.",
        requestId: null,
        kitchenUserIds: [],
      }
    }

    // For scheduled requests, always create Priority 1 requests
    const priority = 1
    console.log(`[SCHEDULED] Request will be created with priority: ${priority}`)

    // Initialize quantity variable
    let quantity: number = machine.teaFillStartQuantity || 0

    // Check if machine has end time configured (applies to both Full Time and Part Time)
    if (machine.endTime) {
      const timeResult = getTimeWindowAndQuantity(machine.endTime, machine)

      if (timeResult.shouldBlock) {
        console.log("[SCHEDULED] Request blocked: Current time is within 1 hour of machine end time")
        return {
          success: false,
          message: "Request not allowed within 1 hour of machine end time",
          requestId: null,
          kitchenUserIds: [],
        }
      }

      // Use the quantity determined by time window
      quantity = timeResult.quantity
      console.log(`[SCHEDULED] Quantity set based on time window (${timeResult.timeWindow}): ${quantity}`)
    } else {
      // Fallback logic for machines without end time
      if (machine.machineType === "Full Time") {
        quantity = machine.teaFillStartQuantity || 0
      } else if (machine.machineType === "Part Time") {
        quantity = machine.teaFillEndQuantity || 0
      } else {
        // Default case for machines without specified type
        quantity = machine.teaFillStartQuantity || 0
      }
      console.log(
        `[SCHEDULED] Quantity determined by machine type fallback: ${quantity} for machine type: ${machine.machineType}`,
      )
    }

    // Check if kitchenId exists in the machine record
    if (!machine.kitchenId) {
      return {
        success: false,
        message: "No kitchen mapped to this machine",
        requestId: null,
        kitchenUserIds: [],
      }
    }

    const machineLat = Number.parseFloat(machine.gisLatitude)
    const machineLon = Number.parseFloat(machine.gisLongitude)

    if (isNaN(machineLat) || isNaN(machineLon)) {
      return {
        success: false,
        message: "Invalid machine coordinates",
        requestId: null,
        kitchenUserIds: [],
      }
    }

    const customRequestId = await generateRequestId(ctx)

    // Get the kitchenId from the machine record
    const kitchenIds = Array.isArray(machine.kitchenId) ? machine.kitchenId : [machine.kitchenId]

    // Get the kitchen user IDs from the kitchens table
    const kitchenUserIds: string[] = []

    for (const kitchenId of kitchenIds) {
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q: any) => q.eq(q.field("userId"), kitchenId))
        .first()

      if (kitchen && kitchen.userId && kitchen.status === "online") {
        kitchenUserIds.push(kitchen.userId)
      }
    }

    // Current date and time in IST format
    const currentDateTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    })

    // If no online kitchens found
    if (kitchenUserIds.length === 0) {
      // Update the request status if no kitchens were found
      const requestId = await ctx.db.insert("requests", {
        requestId: customRequestId,
        machineId: machineId,
        requestStatus: "No Kitchens Found",
        kitchenStatus: "Pending",
        agentStatus: "Pending",
        requestDateTime: currentDateTime,
        dstAddress:
          machine.address.building +
          ", " +
          machine.address.floor +
          ", " +
          machine.address.area +
          ", " +
          machine.address.district +
          ", " +
          machine.address.state,
        dstLatitude: machineLat,
        dstLongitude: machineLon,
        kitchenUserId: [],
        agentUserId: "",
        priority: priority,
        quantity: quantity,
      })

      return {
        success: false,
        message: "No online kitchens found for this machine",
        requestId: customRequestId,
        kitchenUserIds: [],
        priority: priority,
        quantity: quantity,
      }
    }

    // Create initial request with basic information including quantity
    const requestId = await ctx.db.insert("requests", {
      requestId: customRequestId,
      machineId: machineId,
      requestStatus: "Pending",
      kitchenStatus: "Pending",
      agentStatus: "Pending",
      requestDateTime: currentDateTime,
      dstAddress:
        machine.address.building +
        ", " +
        machine.address.floor +
        ", " +
        machine.address.area +
        ", " +
        machine.address.district +
        ", " +
        machine.address.state,
      dstLatitude: machineLat,
      dstLongitude: machineLon,
      kitchenUserId: kitchenUserIds,
      agentUserId: "",
      priority: priority,
      quantity: quantity,
    })

    // Store mapped kitchens in requestStatusUpdates
    for (const kitchenId of kitchenIds) {
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q: any) => q.eq(q.field("userId"), kitchenId))
        .first()

      if (kitchen && kitchen.userId && kitchen.status === "online") {
        await ctx.db.insert("requestStatusUpdates", {
          requestId: customRequestId,
          userId: kitchen.userId,
          status: "Pending",
          latitude: kitchen.latitude,
          longitude: kitchen.longitude,
          dateAndTime: new Date().toISOString(),
          isProceedNext: false,
        })
      }
    }

    console.log(
      `[SCHEDULED] Request created successfully: ${customRequestId} with priority: ${priority} and quantity: ${quantity}`,
    )

    return {
      success: true,
      message: `Scheduled request created with priority ${priority} and mapped kitchens identified`,
      requestId: customRequestId,
      kitchenUserIds: kitchenUserIds,
      priority: priority,
      quantity: quantity,
    }
  },
})
