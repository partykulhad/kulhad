import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { userId, latitude, longitude } = await req.json();

    if (!userId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: userId, latitude, or longitude" },
        { status: 400 }
      );
    }

    // Call the Convex mutation to update the agent's location
    const result = await convex.mutation(api.deliveryAgents.updateAgentLocation, {
      userId,
      latitude,
      longitude,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error('Failed to update agent location:', error);
    return NextResponse.json({ success: false, error: 'Failed to update agent location' }, { status: 500 });
  }
}

