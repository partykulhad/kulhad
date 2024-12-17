import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { machineId, temperature, rating, canisterLevel } = await req.json();

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: machineId" },
        { status: 400 }
      );
    }

    // Call the Convex mutation
    const result = await convex.mutation(api.iot.addIoTData, {
      machineId,
      ...(temperature !== undefined && { temperature }),
      ...(rating !== undefined && { rating }),
      ...(canisterLevel !== undefined && { canisterLevel }),
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error('Failed to add IoT data:', error);
    return NextResponse.json({ success: false, error: 'Failed to add IoT data' }, { status: 500 });
  }
}

