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

    // Call the Convex query to get delivery agent information
    const agent = await convex.query(api.deliveryAgents.getByUserId, { userId });

    if (agent) {
      return NextResponse.json({ success: true, agent }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, error: "Delivery agent not found" }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to fetch delivery agent:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch delivery agent' }, { status: 500 });
  }
}

