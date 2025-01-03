import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { NextRequest, NextResponse } from 'next/server';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  try {
    // Step 1: Validate userId
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({
        code: 300,
        message: "Missing userId parameter",
        agentDetails: null
      }, { status: 400 });
    }

    // Step 2: Validate token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        code: 300,
        message: "Missing or invalid authorization token",
        agentDetails: null
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
          agentDetails: null
        }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({
        code: 300,
        message: "Invalid or expired token",
        agentDetails: null
      }, { status: 401 });
    }

    // Step 4: Check user role
    if (user.role !== 'refiller') {
      return NextResponse.json({
        code: 300,
        message: "Unauthorized access. User is not a delivery agent.",
        agentDetails: null
      }, { status: 403 });
    }

    // Step 5: Fetch delivery agent data
    let agent;
    try {
      agent = await convex.query(api.deliveryAgents.getByUserId, { userId: user.userId });
    } catch (error) {
      return NextResponse.json({
        code: 300,
        message: "Delivery agent not found for the given user ID",
        agentDetails: null
      }, { status: 404 });
    }

    if (!agent) {
      return NextResponse.json({
        code: 300,
        message: "Delivery agent not found for the given user ID",
        agentDetails: null
      }, { status: 404 });
    }

    // Step 6: Fetch profile picture URL
    let profilePicUrl = "";
    if (agent.photoStorageId) {
      try {
        profilePicUrl = await convex.query(api.deliveryAgents.getPhotoUrl, { storageId: agent.photoStorageId });
      } catch (error) {
        console.error('Failed to fetch profile picture URL:', error);
      }
    }

    // Step 7: Return agent details
    return NextResponse.json({
      code: 200,
      message: "Details Available",
      agentDetails: {
        address: agent.address,
        aadhaarNumber: agent.adhaar,
        companyName: agent.company,
        emailId: agent.email,
        mobileNumber: agent.mobile,
        userName: agent.name,
        panNumber: agent.pan,
        profilePicurl: profilePicUrl,
        userId: agent.userId
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch delivery agent:', error);
    return NextResponse.json({
      code: 400,
      message: error instanceof Error ? error.message : "Exception occurred while fetching delivery agent",
      agentDetails: null
    }, { status: 500 });
  }
}

