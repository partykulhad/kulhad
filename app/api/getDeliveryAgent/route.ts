import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        code: 300,
        message: "Missing or invalid authorization token",
        agent: null
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log("Received token:", token);
    
    const user = await convex.query(api.appUsers.verifyToken, { token });
    console.log("Verification result:", user);
    if (!user) {
      console.log("Token verification failed");
      return NextResponse.json({
        code: 300,
        message: "Invalid or expired token",
        agent: null
      }, { status: 401 });
    }

    if (user.role !== 'refiller') {
      return NextResponse.json({
        code: 300,
        message: "Unauthorized access. User is not a delivery agent.",
        agent: null
      }, { status: 403 });
    }

    const agent = await convex.query(api.deliveryAgents.getByUserId, { userId: user.userId });

    if (agent) {
      return NextResponse.json({
        code: 200,
        message: "Details Available",
        agent: agent
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: "Delivery agent not found",
        agent: null
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to fetch delivery agent:', error);
    return NextResponse.json({
      code: 300,
      message: error instanceof Error ? error.message : "Failed to fetch delivery agent",
      agent: null
    }, { status: 500 });
  }
}

