// convex/machineVideos.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Generate upload URL for videos
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Add new video for a machine
export const add = mutation({
  args: {
    machineId: v.string(),
    videoStorageId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify machine exists
    const machine = await ctx.db
      .query("machines")
      .filter((q) => q.eq(q.field("id"), args.machineId))
      .first();

    if (!machine) {
      throw new ConvexError("Machine not found");
    }

    const videoId = await ctx.db.insert("machineVideos", {
      machineId: args.machineId,
      videoStorageId: args.videoStorageId,
      title: args.title,
      description: args.description,
      uploadedAt: Date.now(),
      uploadedBy: args.uploadedBy,
      fileSize: args.fileSize,
      duration: args.duration,
    });

    return videoId;
  },
});

// Delete video
export const remove = mutation({
  args: { 
    id: v.id("machineVideos"),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.id);
    
    if (!video) {
      throw new ConvexError("Video not found");
    }

    // Delete the file from storage
    await ctx.storage.delete(video.videoStorageId);

    // Delete the database record
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// List all videos for a machine
export const listByMachineId = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("machineVideos")
      .withIndex("by_machineId", (q) => q.eq("machineId", args.machineId))
      .order("desc")
      .collect();

    return videos;
  },
});

// Get video URL by storageId
export const getVideoUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (url === null) {
      throw new ConvexError("Video not found");
    }
    return url;
  },
});

// Get single video by ID
export const getById = query({
  args: { id: v.id("machineVideos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.id);
    if (!video) {
      throw new ConvexError("Video not found");
    }
    return video;
  },
});
