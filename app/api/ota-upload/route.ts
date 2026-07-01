import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

// This route generates a secure upload token for the browser.
// The browser then uploads directly to Vercel Blob — bypassing the
// Next.js 4 MB body size limit entirely.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate only .deb files are allowed
        if (!pathname.endsWith(".deb")) {
          throw new Error("Only .deb files are allowed");
        }
        return {
          allowedContentTypes: [
            "application/octet-stream",
            "application/x-deb",
            "application/vnd.debian.binary-package",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB max
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Called after the browser finishes uploading
        console.log("OTA .deb uploaded:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
