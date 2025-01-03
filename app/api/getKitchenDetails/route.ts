import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  try {
    // Step 1: Validate userId
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({
        code: 300,
        message: "Missing userId parameter",
        kitchenDetails: null
      }, { status: 400 });
    }

    // Step 2: Validate token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        code: 300,
        message: "Missing or invalid authorization token",
        kitchenDetails: null
      }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Step 3: Verify token and check if it matches the userId
    let user;
    try {
      user = await convex.query(api.appUsers.verifyToken, { token });
      if (!user || user.userId !== userId) {
        return NextResponse.json({
          code: 300,
          message: "Invalid token or token does not match userId",
          kitchenDetails: null
        }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({
        code: 300,
        message: "Invalid or expired token",
        kitchenDetails: null
      }, { status: 401 });
    }

    // Step 4: Check user role
    if (user.role !== 'kitchen') {
      return NextResponse.json({
        code: 300,
        message: "Unauthorized access. User is not associated with a kitchen.",
        kitchenDetails: null
      }, { status: 403 });
    }

    // Step 5: Fetch kitchen data
    let kitchen;
    try {
      kitchen = await convex.query(api.kitchens.getKitchenByUserId, { userId: user.userId });
    } catch (error) {
      return NextResponse.json({
        code: 300,
        message: "Kitchen not found for the given user ID",
        kitchenDetails: null
      }, { status: 404 });
    }

    if (!kitchen) {
      return NextResponse.json({
        code: 300,
        message: "Kitchen not found for the given user ID",
        kitchenDetails: null
      }, { status: 404 });
    }

    // Step 6: Return kitchen details
    return NextResponse.json({
      code: 200,
      message: "Kitchen Details Available",
      kitchenDetails: {
        address: kitchen.address,
        capacity: kitchen.capacity,
        latitude: kitchen.latitude,
        longitude: kitchen.longitude,
        manager: kitchen.manager,
        managerMobile: kitchen.managerMobile,
        name: kitchen.name,
        userId: kitchen.userId
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch kitchen:', error);
    return NextResponse.json({
      code: 400,
      message: error instanceof Error ? error.message : "Exception occurred while fetching kitchen",
      kitchenDetails: null
    }, { status: 500 });
  }
}

