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
        kitchen: null
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    const user = await convex.query(api.appUsers.verifyToken, { token });
    if (!user) {
      return NextResponse.json({
        code: 300,
        message: "Invalid or expired token",
        kitchen: null
      }, { status: 401 });
    }

    if (user.role !== 'kitchen') {
      return NextResponse.json({
        code: 300,
        message: "Unauthorized access. User is not associated with a kitchen.",
        kitchen: null
      }, { status: 403 });
    }

    const kitchen = await convex.query(api.kitchens.getKitchenByUserId, { userId: user.userId });

    if (kitchen) {
      return NextResponse.json({
        code: 200,
        message: "Details Available",
        kitchen: kitchen
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        message: "Kitchen not found",
        kitchen: null
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to fetch kitchen:', error);
    return NextResponse.json({
      code: 300,
      message: error instanceof Error ? error.message : "Failed to fetch kitchen",
      kitchen: null
    }, { status: 500 });
  }
}

