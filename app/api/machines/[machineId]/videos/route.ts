// app/api/machines/[machineId]/videos/route.ts
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { NextRequest, NextResponse } from 'next/server';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  req: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const { machineId } = params;

    if (!machineId) {
      return NextResponse.json({
        code: 300,
        message: "Missing machineId parameter",
        videos: []
      }, { status: 400 });
    }

    // Fetch videos for this machine
    const videos = await convex.query(api.machineVideos.listByMachineId, {
      machineId: machineId
    });

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        code: 200,
        message: "No videos found for this machine",
        machineId: machineId,
        totalVideos: 0,
        videos: []
      }, { status: 200 });
    }

    // Get video URLs for all videos
    const videosWithUrls = await Promise.all(
      videos.map(async (video) => {
        try {
          const videoUrl = await convex.query(api.machineVideos.getVideoUrl, {
            storageId: video.videoStorageId
          });

          return {
            videoId: video._id,
            title: video.title || "Untitled Video",
            description: video.description || "",
            videoUrl: videoUrl,
            fileSize: video.fileSize,
            uploadedAt: video.uploadedAt,
            uploadedBy: video.uploadedBy,
            duration: video.duration,
          };
        } catch (error) {
          console.error(`Failed to fetch URL for video ${video._id}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed video URL fetches
    const validVideos = videosWithUrls.filter(v => v !== null);

    return NextResponse.json({
      code: 200,
      message: "Videos retrieved successfully",
      machineId: machineId,
      totalVideos: validVideos.length,
      videos: validVideos
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch machine videos:', error);
    return NextResponse.json({
      code: 400,
      message: error instanceof Error ? error.message : "Exception occurred while fetching videos",
      videos: []
    }, { status: 500 });
  }
}
