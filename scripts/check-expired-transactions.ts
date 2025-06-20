// Script to periodically check and update expired transactions
// This can be run as a cron job or scheduled task

import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

async function checkExpiredTransactions() {
  console.log("Checking for expired transactions...")

  try {
    // Get all active transactions using your existing function
    const activeTransactions = await convex.query(api.transactions.getActiveTransactions)

    const now = Date.now()
    let expiredCount = 0

    for (const transaction of activeTransactions) {
      // Check if transaction has expired
      if (transaction.expiresAt && transaction.expiresAt < now && transaction.status === "active") {
        console.log(`Marking transaction ${transaction._id} as expired`)

        await convex.mutation(api.transactions.updateTransactionStatus, {
          id: transaction._id,
          status: "expired",
        })

        expiredCount++
      }
    }

    console.log(`Updated ${expiredCount} expired transactions`)
  } catch (error) {
    console.error("Error checking expired transactions:", error)
  }
}

// Run the check
checkExpiredTransactions()
