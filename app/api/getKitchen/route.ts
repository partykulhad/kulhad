import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: userId" },
        { status: 400 }
      );
    }

    // Call the Convex query to get kitchen information
    const kitchen = await convex.query(api.kitchens.getKitchenByUserId, { userId });

    if (kitchen) {
      return NextResponse.json({ success: true, kitchen }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, error: "Kitchen not found" }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to fetch kitchen:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch kitchen' }, { status: 500 });
  }
}
