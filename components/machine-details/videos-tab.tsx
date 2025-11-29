// components/machine-details/videos-tab.tsx
"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, Play, Loader2 } from "lucide-react";
import { toast } from "react-toastify"; // ✅ Use react-toastify
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VideosTabProps {
  machineId: string;
}

export function VideosTab({ machineId }: VideosTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoToDelete, setVideoToDelete] =
    useState<Id<"machineVideos"> | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videos =
    useQuery(api.machineVideos.listByMachineId, { machineId }) || [];
  const generateUploadUrl = useMutation(api.machineVideos.generateUploadUrl);
  const addVideo = useMutation(api.machineVideos.add);
  const removeVideo = useMutation(api.machineVideos.remove);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast.error("Invalid file type. Please select a video file"); // ✅ react-toastify
        return;
      }

      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File too large. Video size should be less than 100MB"); // ✅ react-toastify
        return;
      }

      setSelectedVideo(file);
      toast.info(`Selected: ${file.name}`); // ✅ Optional feedback
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) return;

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedVideo.type },
        body: selectedVideo,
      });

      const { storageId } = await result.json();

      await addVideo({
        machineId,
        videoStorageId: storageId,
        title: videoTitle || selectedVideo.name,
        description: videoDescription,
        fileSize: selectedVideo.size,
      });

      toast.success("Video uploaded successfully"); // ✅ react-toastify

      setSelectedVideo(null);
      setVideoTitle("");
      setVideoDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload video. Please try again."); // ✅ react-toastify
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!videoToDelete) return;

    try {
      await removeVideo({ id: videoToDelete });
      toast.success("Video deleted successfully"); // ✅ react-toastify
    } catch (error) {
      toast.error("Failed to delete video. Please try again."); // ✅ react-toastify
    } finally {
      setVideoToDelete(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
          <CardDescription>
            Upload videos for this machine (Max size: 100MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-file">Select Video</Label>
            <Input
              id="video-file"
              type="file"
              accept="video/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>

          {selectedVideo && (
            <>
              <div className="space-y-2">
                <Label htmlFor="video-title">Title (Optional)</Label>
                <Input
                  id="video-title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter video title"
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="video-description"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Enter video description"
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{selectedVideo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedVideo.size)}
                  </p>
                </div>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Videos List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Videos ({videos.length})</CardTitle>
          <CardDescription>
            All videos uploaded for this machine
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No videos uploaded yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  onDelete={() => setVideoToDelete(video._id)}
                  onPlay={() => setPlayingVideo(video.videoStorageId)}
                  isPlaying={playingVideo === video.videoStorageId}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!videoToDelete}
        onOpenChange={() => setVideoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface VideoCardProps {
  video: any;
  onDelete: () => void;
  onPlay: () => void;
  isPlaying: boolean;
  formatFileSize: (bytes?: number) => string;
  formatDate: (timestamp: number) => string;
}

// Update the VideoCard component in videos-tab.tsx

function VideoCard({
  video,
  onDelete,
  onPlay,
  isPlaying,
  formatFileSize,
  formatDate,
}: VideoCardProps) {
  const videoUrl = useQuery(api.machineVideos.getVideoUrl, {
    storageId: video.videoStorageId,
  });

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted relative group">
        {/* ✅ Fixed: Only render video when URL is available */}
        {videoUrl ? (
          isPlaying ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full"
                  onClick={onPlay}
                >
                  <Play className="h-6 w-6" />
                </Button>
              </div>
            </>
          )
        ) : (
          // ✅ Show loading state while URL is being fetched
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold line-clamp-1">
          {video.title || "Untitled Video"}
        </h3>
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {video.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(video.fileSize)}</span>
          <span>{formatDate(video.uploadedAt)}</span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="w-full mt-2"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </CardContent>
    </Card>
  );
}
