import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { machineId, canisterLevel } = await req.json();

    if (!machineId || canisterLevel === undefined) {
      return NextResponse.json(
        { code: 400, message: "Missing required parameters: machineId or canisterLevel" },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.canisterCheck.checkCanisterLevel, {
      machineId,
      canisterLevel,
    });

    if (result.success) {
      return NextResponse.json({ 
        code: 200, 
        message: result.message, 
        data: {
          notification: result.notification,
          agentNotification: result.agentNotification
        }
      }, { status: 200 });
    } else {
      return NextResponse.json({ code: 300, message: "Failed to check canister level" }, { status: 300 });
    }
  } catch (error) {
    console.error('Exception in checking canister level:', error);
    return NextResponse.json({ code: 400, message: "Exception Message" }, { status: 400 });
  }
}

