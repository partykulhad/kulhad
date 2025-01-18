import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({
        code: 300,
        Message: "Missing required parameters: username or password",
        userId: null,
        name: null,
        role: null,
        token: null,
        tokenExpireTime: null,
        tokenExpireDate: null
      }, { status: 400 });
    }

    // Call the Convex mutation for authentication
    const result = await convex.mutation(api.appUsers.authenticateAppUser, {
      username,
      password,
    });

    if (result.success) {
      return NextResponse.json({
        code: 200,
        Message: "Login Successful",
        userId: result.userId,
        name: result.name,
        role: result.role,
        token: result.token,
        tokenExpireTime: result.tokenExpireTime,
        tokenExpireDate: result.tokenExpireDate
      }, { status: 200 });
    } else {
      return NextResponse.json({
        code: 300,
        Message: result.error || "Invalid username or password",
        userId: null,
        name: null,
        role: null,
        token: null,
        tokenExpireTime: null,
        tokenExpireDate: null
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Failed to authenticate:', error);
    return NextResponse.json({
      code: 400,
      Message: error instanceof Error ? error.message : "Failed to authenticate",
      userId: null,
      name: null,
      role: null,
      token: null,
      tokenExpireTime: null,
      tokenExpireDate: null
    }, { status: 500 });
  }
}

