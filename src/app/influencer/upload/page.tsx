"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = ["instagram", "tiktok", "youtube", "pinterest", "blog"];
const CONTENT_TYPES: Record<string, string[]> = {
  instagram: ["reel", "story", "static_post"],
  tiktok: ["tiktok_video"],
  youtube: ["youtube_video", "youtube_short"],
  pinterest: ["pin"],
  blog: ["blog_post"],
};

type UploadState = "idle" | "uploading" | "saving" | "done" | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUploadState("idle");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      "video/*": [".mp4", ".mov", ".webm"],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !platform || !contentType) {
      toast.error("Please select a file, platform, and content type");
      return;
    }

    setUploadState("uploading");
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      const { url, fileType, fileSizeMb, influencerProfileId } = await uploadRes.json();

      setProgress(60);
      setUploadState("saving");

      const saveRes = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencerProfileId,
          blobUrl: url,
          fileType,
          fileSizeMb,
          platform,
          contentType,
          title: title || file.name,
          caption: caption || null,
          postUrl: postUrl || null,
        }),
      });

      if (!saveRes.ok) throw new Error(await saveRes.text());

      setProgress(100);
      setUploadState("done");
      toast.success("Asset uploaded successfully! The team will review it soon.");

      setFile(null);
      setPlatform("");
      setContentType("");
      setTitle("");
      setCaption("");
      setPostUrl("");
      setTimeout(() => { setUploadState("idle"); setProgress(0); }, 3000);
    } catch (err) {
      setUploadState("error");
      toast.error("Upload failed. Please try again.");
      console.error(err);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Content</h1>
        <p className="text-sm text-gray-500">Submit your UGC assets for review</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            isDragActive
              ? "border-rose-400 bg-rose-50"
              : file
              ? "border-green-400 bg-green-50"
              : "border-gray-300 bg-white hover:border-rose-300 hover:bg-rose-50"
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="ml-4 text-gray-400 hover:text-red-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-700">
                {isDragActive ? "Drop your file here" : "Drag & drop or click to browse"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG, WEBP, MP4, MOV · Max 500MB
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">Content Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Platform *</Label>
                <Select value={platform} onValueChange={(v) => { setPlatform(v); setContentType(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content Type *</Label>
                <Select value={contentType} onValueChange={setContentType} disabled={!platform}>
                  <SelectTrigger>
                    <SelectValue placeholder={platform ? "Select type" : "Select platform first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(CONTENT_TYPES[platform] ?? []).map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your content a name" />
            </div>

            <div>
              <Label>Caption</Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Your caption or description..."
                rows={3}
              />
            </div>

            <div>
              <Label>Live Post URL</Label>
              <Input
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                type="url"
              />
              <p className="mt-1 text-xs text-gray-400">Optional — add the link once it's posted</p>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        {uploadState !== "idle" && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500">
              {uploadState === "uploading" && "Uploading file..."}
              {uploadState === "saving" && "Saving to database..."}
              {uploadState === "done" && "✅ Upload complete!"}
              {uploadState === "error" && "❌ Upload failed"}
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-rose-600 hover:bg-rose-700"
          disabled={!file || uploadState === "uploading" || uploadState === "saving"}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploadState === "uploading" ? "Uploading..." : uploadState === "saving" ? "Saving..." : "Submit for Review"}
        </Button>
      </form>
    </div>
  );
}
