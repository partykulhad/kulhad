import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const version = formData.get("version") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      return NextResponse.json(
        { error: "Invalid version format. Use x.y.z (e.g., 1.3.0)" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".deb")) {
      return NextResponse.json(
        { error: "Only .deb files are allowed" },
        { status: 400 }
      );
    }

    const filename = `urban-kettle_${version}_all.deb`;

    // Upload to Vercel Blob (requires BLOB_READ_WRITE_TOKEN in env)
    const blob = await put(filename, file, {
      access: "public",
      contentType: "application/octet-stream",
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename,
      version,
      size: file.size,
      message: `✅ ${filename} uploaded! Now click Deploy below.`,
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";

    // Give a clear hint if the Blob token is the issue
    if (msg.includes("token") || msg.includes("BLOB")) {
      return NextResponse.json(
        {
          error:
            "Vercel Blob token missing. Go to Vercel Dashboard → Storage → connect kulhad-blob to this project, then redeploy.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
  }
}
