import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { userId, latitude, longitude, status } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameter: userId" },
        { status: 400 }
      );
    }

    // Prepare update object with only provided fields
    const updateData: {
      userId: string;
      latitude?: number;
      longitude?: number;
      status?: string;
    } = { userId };

    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (status !== undefined) {
      updateData.status = status === 1 ? 'online' : status === 0 ? 'offline' : undefined;
    }

    // Call the Convex mutation to update the agent's information
    const result = await convex.mutation(api.deliveryAgents.updateAgentInfo, updateData);

    if (result.success) {
      return NextResponse.json({ code: 200, message: "Agent information updated successfully" }, { status: 200 });
    } else {
      return NextResponse.json({ code: 300, message: "Failed to update Agent information" }, { status: 300 });
    }
  } catch (error) {
    console.error('Exception in updating agent information:', error);
    return NextResponse.json({ code: 400, message: "Exception Message" }, { status: 400 });
  }
}

