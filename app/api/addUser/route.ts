import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { username, password, role } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: username, password, or role" },
        { status: 400 }
      );
    }

    // Call the Convex mutation to add a user
    const result = await convex.mutation(api.appUsers.addAppUser, {
      username,
      password,
      role,
    });

    if (result.success) {
      return NextResponse.json({ success: true, userId: result.userId }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, error: "Failed to add user" }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to add user:', error);
    return NextResponse.json({ success: false, error: 'Failed to add user' }, { status: 500 });
  }
}

