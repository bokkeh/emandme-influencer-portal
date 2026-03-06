"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FaviconSettingsCard() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/site-settings/favicon");
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { faviconUrl: string | null };
        setCurrentUrl(data.faviconUrl);
      } catch {
        toast.error("Failed to load favicon settings");
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  async function uploadFavicon() {
    if (!file) {
      toast.error("Choose a favicon file first");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-settings/favicon", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { faviconUrl: string };
      setCurrentUrl(data.faviconUrl);
      setFile(null);
      toast.success("Favicon updated. Hard refresh to see it immediately.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload favicon";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Branding: Favicon</CardTitle>
        <CardDescription>Upload a new site favicon (.ico, .png, or .svg)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bootLoading ? (
          <p className="text-sm text-gray-500">Loading favicon settings...</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded border border-gray-200 bg-white grid place-items-center">
              {currentUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentUrl} alt="Current favicon" className="h-6 w-6 object-contain" />
              ) : (
                <span className="text-xs text-gray-400">none</span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {currentUrl ?? "Using default /favicon.ico"}
            </p>
          </div>
        )}

        <Input
          type="file"
          accept=".ico,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <Button onClick={uploadFavicon} disabled={loading} className="bg-rose-600 hover:bg-rose-700">
          {loading ? "Uploading..." : "Upload Favicon"}
        </Button>
      </CardContent>
    </Card>
  );
}
