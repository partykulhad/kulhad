import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create a new transaction from Razorpay QR code response
export const createTransaction = mutation({
  args: {
    transactionId: v.string(),
    customTransactionId: v.optional(v.string()), // Add support for our custom transaction ID
    imageUrl: v.string(),
    amount: v.number(),
    cups: v.number(),
    amountPerCup: v.number(),
    machineId: v.string(),
    description: v.string(),
    status: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Create the transaction object with all properties at once
    // Include customTransactionId conditionally
    return await ctx.db.insert("transactions", {
      transactionId: args.transactionId,
      ...(args.customTransactionId ? { customTransactionId: args.customTransactionId } : {}), // Conditionally add the property
      imageUrl: args.imageUrl,
      amount: args.amount,
      cups: args.cups,
      amountPerCup: args.amountPerCup,
      machineId: args.machineId,
      description: args.description,
      status: args.status,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// Get a transaction by transaction ID
export const getTransactionByTxnId = query({
  args: {
    transactionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", args.transactionId))
      .first()
  },
})

// Get a transaction by custom transaction ID
export const getTransactionByCustomId = query({
  args: {
    customTransactionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_customTransactionId", (q) => q.eq("customTransactionId", args.customTransactionId))
      .first()
  },
})

// Update transaction status
export const updateTransactionStatus = mutation({
  args: {
    id: v.id("transactions"),
    status: v.string(),
    paymentId: v.optional(v.string()),
    vpa: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    }

    if (args.paymentId) {
      updateData.paymentId = args.paymentId
    }

    if (args.vpa) {
      updateData.vpa = args.vpa
    }

    if (args.failureReason) {
      updateData.failureReason = args.failureReason
    }

    return await ctx.db.patch(args.id, updateData)
  },
})

// Update transaction payment details
export const updateTransactionPaymentDetails = mutation({
  args: {
    transactionId: v.string(),
    paymentId: v.string(),
    vpa: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", args.transactionId))
      .first()

    if (!transaction) {
      throw new Error(`Transaction not found: ${args.transactionId}`)
    }

    return await ctx.db.patch(transaction._id, {
      paymentId: args.paymentId,
      vpa: args.vpa,
      status: args.status,
      updatedAt: Date.now(),
    })
  },
})

// Get transaction status
export const getTransactionStatus = query({
  args: {
    transactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", args.transactionId))
      .first()

    if (!transaction) {
      return null
    }

    return transaction
  },
})

// Get all transactions
export const getAllTransactions = query({
  handler: async (ctx) => {
    return await ctx.db.query("transactions").order("desc").collect()
  },
})

// Get transactions by machine ID
export const getTransactionsByMachineId = query({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_machineId", (q) => q.eq("machineId", args.machineId))
      .order("desc")
      .collect()
  },
})

// Get transactions by status
export const getTransactionsByStatus = query({
  args: {
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect()
  },
})

// Get all transactions
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("transactions").collect()
  },
})

// Get transactions by machineId
export const getByMachineId = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const { machineId } = args

    // Query transactions table with the machineId index
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_machineId", (q) => q.eq("machineId", machineId))
      .collect()

    return transactions
  },
})

// Get transaction by transactionId
export const getById = query({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    const { transactionId } = args

    return await ctx.db
      .query("transactions")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
      .first()
  },
})

// Get transactions by status
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const { status } = args

    return await ctx.db
      .query("transactions")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect()
  },
})

// Get transactions by custom transaction ID
export const getByCustomTransactionId = query({
  args: { customTransactionId: v.string() },
  handler: async (ctx, args) => {
    const { customTransactionId } = args

    return await ctx.db
      .query("transactions")
      .withIndex("by_customTransactionId", (q) => q.eq("customTransactionId", customTransactionId))
      .first()
  },
})

// Get active transactions (needed for the backup expiry check script)
export const getActiveTransactions = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()
  },
})

// Mutation to update transaction rating
export const updateTransactionRating = mutation({
  args: {
    transactionId: v.id("transactions"),
    rating: v.number(),
  },
  handler: async (ctx, args) => {
    const updatedTransaction = await ctx.db.patch(args.transactionId, {
      rating: args.rating,
      updatedAt: Date.now(),
    })

    return updatedTransaction
  },
})

export const getTransactionsByDateRange = query({
  args: {
    fromDate: v.string(), // ISO date string in IST
    toDate: v.string(), // ISO date string in IST
  },
  handler: async (ctx, args) => {
    // Convert IST date strings to timestamps
    const fromTimestamp = new Date(args.fromDate).getTime()
    const toTimestamp = new Date(args.toDate).getTime() + (24 * 60 * 60 * 1000 - 1) // End of day

    // Get all transactions and filter by date range
    const allTransactions = await ctx.db.query("transactions").collect()

    return allTransactions
      .filter((transaction) => transaction.createdAt >= fromTimestamp && transaction.createdAt <= toTimestamp)
      .sort((a, b) => b.createdAt - a.createdAt) // Sort by newest first
  },
})