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

    // Upload the .deb file to Vercel Blob
    const filename = `urban-kettle_${version}_all.deb`;
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
      message: `Uploaded ${filename} successfully. Now set the version in the Deploy section.`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Make sure BLOB_READ_WRITE_TOKEN is set in Vercel." },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
