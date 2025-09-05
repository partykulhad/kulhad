import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const fromDate = url.searchParams.get("fromDate")
    const toDate = url.searchParams.get("toDate")

    if (!fromDate || !toDate) {
      return NextResponse.json(
        {
          error: "Missing required parameters: fromDate and toDate",
          example: "?fromDate=2024-01-01&toDate=2024-01-31",
        },
        { status: 400 },
      )
    }

    // Validate date format
    const fromDateObj = new Date(fromDate)
    const toDateObj = new Date(toDate)

    if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid date format. Use YYYY-MM-DD format",
          example: "?fromDate=2024-01-01&toDate=2024-01-31",
        },
        { status: 400 },
      )
    }

    if (fromDateObj > toDateObj) {
      return NextResponse.json(
        {
          error: "fromDate cannot be greater than toDate",
        },
        { status: 400 },
      )
    }

    const transactions = await convex.query(api.transactions.getTransactionsByDateRange, {
      fromDate,
      toDate,
    })

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
    })
  } catch (error) {
    console.error("Error fetching transactions by date range:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch transactions",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fromDate, toDate } = await request.json()

    if (!fromDate || !toDate) {
      return NextResponse.json(
        {
          error: "Missing required fields: fromDate and toDate",
          example: { fromDate: "2024-01-01", toDate: "2024-01-31" },
        },
        { status: 400 },
      )
    }

    // Validate date format
    const fromDateObj = new Date(fromDate)
    const toDateObj = new Date(toDate)

    if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid date format. Use YYYY-MM-DD format",
          example: { fromDate: "2024-01-01", toDate: "2024-01-31" },
        },
        { status: 400 },
      )
    }

    if (fromDateObj > toDateObj) {
      return NextResponse.json(
        {
          error: "fromDate cannot be greater than toDate",
        },
        { status: 400 },
      )
    }

    const transactions = await convex.query(api.transactions.getTransactionsByDateRange, {
      fromDate,
      toDate,
    })

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
    })
  } catch (error) {
    console.error("Error fetching transactions by date range:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch transactions",
      },
      { status: 500 },
    )
  }
}
