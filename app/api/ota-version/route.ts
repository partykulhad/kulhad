import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const VERSION_FILE = join(process.cwd(), "public", "downloads", "latest_version.txt");
const URL_FILE = join(process.cwd(), "public", "downloads", "latest_url.txt");

// GET — Raspberry Pi calls this to check the current version
export async function GET() {
  try {
    const version = readFileSync(VERSION_FILE, "utf-8").trim();
    return new NextResponse(version, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return new NextResponse("0.0.0", { status: 200 });
  }
}

// POST — Admin UI calls this to set the live version + optional blob URL
export async function POST(req: NextRequest) {
  try {
    const { version, debUrl } = await req.json();

    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      return NextResponse.json(
        { error: "Invalid version format. Use x.y.z (e.g., 1.2.0)" },
        { status: 400 }
      );
    }

    // Write the version file (Pi reads this to check for updates)
    writeFileSync(VERSION_FILE, version, "utf-8");

    // If a blob URL was provided, write it too (Pi reads this to download)
    if (debUrl) {
      writeFileSync(URL_FILE, debUrl, "utf-8");
    }

    return NextResponse.json({
      success: true,
      message: `🚀 Version ${version} deployed! All kiosks will update tonight at 2:00 AM.`,
      version,
      debUrl: debUrl ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update version" },
      { status: 500 }
    );
  }
}
