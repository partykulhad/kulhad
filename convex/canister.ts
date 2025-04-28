import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"

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

// Helper function to normalize date strings for comparison
function normalizeDateString(dateStr: string): string {
  // Try to extract day, month, year regardless of format
  let day, month, year;
  
  // Check if it's in format "DD/M/YYYY" or "D/M/YYYY"
  const slashFormat = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  const slashMatch = dateStr.match(slashFormat);
  
  if (slashMatch) {
    day = parseInt(slashMatch[1]);
    month = parseInt(slashMatch[2]);
    year = parseInt(slashMatch[3]);
    return `${year}-${month}-${day}`; // Convert to YYYY-MM-DD for comparison
  }
  
  // Check if it's in format "MM-DD-YYYY HH:MM:SS am/pm"
  const dashFormat = /(\d{1,2})-(\d{1,2})-(\d{4})/;
  const dashMatch = dateStr.match(dashFormat);
  
  if (dashMatch) {
    month = parseInt(dashMatch[1]);
    day = parseInt(dashMatch[2]);
    year = parseInt(dashMatch[3]);
    return `${year}-${month}-${day}`; // Convert to YYYY-MM-DD for comparison
  }
  
  // If we can't parse it, return the original string
  return dateStr;
}

// Helper function to get today's date in normalized format
function getTodayNormalized(): string {
  const now = new Date();
  const istOptions = { timeZone: "Asia/Kolkata" };
  const todayIST = new Date(now.toLocaleString("en-US", istOptions));
  
  const day = todayIST.getDate();
  const month = todayIST.getMonth() + 1;
  const year = todayIST.getFullYear();
  
  return `${year}-${month}-${day}`;
}

// Improved helper function to check if it's the first request of the day for a machine
async function isFirstRequestOfDay(ctx: any, machineId: string): Promise<boolean> {
  const todayNormalized = getTodayNormalized();
  console.log(`Checking for requests on normalized date ${todayNormalized} for machine ${machineId}`);
  
  // Get all requests for this machine
  const machineRequests = await ctx.db
    .query("requests")
    .withIndex("by_machineId", (q: { eq: (arg0: string, arg1: string) => any }) => q.eq("machineId", machineId))
    .collect();
  
  console.log(`Found ${machineRequests.length} total requests for machine ${machineId}`);
  
  // Check each request to see if any were created today
  let todayRequestsCount = 0;
  
  for (const request of machineRequests) {
    // Get the date part from requestDateTime
    const requestDateParts = request.requestDateTime.split(',')[0].trim();
    const normalizedRequestDate = normalizeDateString(requestDateParts);
    
    console.log(`Request ${request.requestId} date: ${requestDateParts}, normalized: ${normalizedRequestDate}, comparing with today: ${todayNormalized}`);
    
    if (normalizedRequestDate === todayNormalized) {
      todayRequestsCount++;
      console.log(`Found request ${request.requestId} created today for machine ${machineId}`);
    }
  }
  
  console.log(`Total requests found today for machine ${machineId}: ${todayRequestsCount}`);
  return todayRequestsCount === 0;
}

export const checkCanisterLevel = mutation({
  args: { machineId: v.string(), canisterLevel: v.number() },
  handler: async (ctx, args) => {
    const { machineId, canisterLevel } = args

    if (canisterLevel > 20) {
      return { success: true, message: "Canister level is above threshold" }
    }

    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), machineId))
      .first()

    if (!machine) {
      throw new ConvexError("Machine not found")
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
    
    // Check if this is the first request of the day for this machine
    const isFirstRequest = await isFirstRequestOfDay(ctx, machineId)
    const priority = isFirstRequest ? 1 : 2
    
    console.log(`Setting priority for machine ${machineId}: ${priority} (isFirstRequest: ${isFirstRequest})`)

    // Get the kitchenId from the machine record
    // It could be a single string or an array of strings
    const kitchenIds = Array.isArray(machine.kitchenId) ? machine.kitchenId : [machine.kitchenId]

    // Get the kitchen user IDs from the kitchens table
    const kitchenUserIds: string[] = []

    for (const kitchenId of kitchenIds) {
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q) => q.eq(q.field("userId"), kitchenId))
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
        priority: priority, // Add priority field
      })

      return {
        success: false,
        message: "No online kitchens found for this machine",
        requestId: customRequestId,
        kitchenUserIds: [],
        priority: priority,
      }
    }

    // Create initial request with basic information
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
      priority: priority, // Add priority field
    })

    // Store mapped kitchens in requestStatusUpdates
    for (const kitchenId of kitchenIds) {
      const kitchen = await ctx.db
        .query("kitchens")
        .filter((q) => q.eq(q.field("userId"), kitchenId))
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

    return {
      success: true,
      message: "Request created and mapped kitchens identified",
      requestId: customRequestId,
      kitchenUserIds: kitchenUserIds,
      priority: priority, // Include priority in the response
    }
  },
})