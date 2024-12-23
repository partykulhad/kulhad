import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: username or password" },
        { status: 400 }
      );
    }

    // Call the Convex mutation for authentication
    const result = await convex.mutation(api.appUsers.authenticateAppUser, {
      username,
      password,
    });

    if (result.success) {
      return NextResponse.json({ success: true, userId: result.userId }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }
  } catch (error) {
    console.error('Failed to authenticate:', error);
    return NextResponse.json({ success: false, error: 'Failed to authenticate' }, { status: 500 });
  }
}

