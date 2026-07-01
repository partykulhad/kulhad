import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// GET — Raspberry Pi calls this to check the current live version
export async function GET() {
  try {
    const config = await convex.query(api.ota.getOtaConfig);
    return NextResponse.json({
      version: config.version,
      debUrl: config.debUrl,
    });
  } catch {
    return NextResponse.json({ version: "1.2.0", debUrl: "" });
  }
}

// POST — Admin UI calls this to deploy a new version
export async function POST(req: NextRequest) {
  try {
    const { version, debUrl } = await req.json();

    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      return NextResponse.json(
        { error: "Invalid version format. Use x.y.z (e.g., 1.3.0)" },
        { status: 400 }
      );
    }

    await convex.mutation(api.ota.setOtaConfig, {
      version,
      debUrl: debUrl ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: `🚀 Version ${version} deployed! All kiosks will update tonight at 2:00 AM.`,
      version,
    });
  } catch (error) {
    console.error("OTA version update error:", error);
    return NextResponse.json(
      { error: "Failed to update version. Check Convex connection." },
      { status: 500 }
    );
  }
}
