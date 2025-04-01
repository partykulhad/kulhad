import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create a new transaction from Razorpay QR code response
export const createTransaction = mutation({
  args: {
    transactionId: v.string(),
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
    return await ctx.db.insert("transactions", {
      transactionId: args.transactionId,
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

