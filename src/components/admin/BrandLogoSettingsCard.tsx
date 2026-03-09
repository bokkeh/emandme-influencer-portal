"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BrandingResponse = {
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
};

export function BrandLogoSettingsCard() {
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [lightFile, setLightFile] = useState<File | null>(null);
  const [darkUrl, setDarkUrl] = useState<string | null>(null);
  const [lightUrl, setLightUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<"dark" | "light" | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/site-settings/branding");
        if (!res.ok) throw new Error((await res.text()) || "Failed to load branding settings");
        const data = (await res.json()) as BrandingResponse;
        setDarkUrl(data.logoDarkUrl);
        setLightUrl(data.logoLightUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load branding settings";
        toast.error(message);
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  async function uploadLogo(variant: "dark" | "light") {
    const file = variant === "dark" ? darkFile : lightFile;
    if (!file) {
      toast.error(`Choose a ${variant} logo file first`);
      return;
    }
    const form = new FormData();
    form.append("variant", variant);
    form.append("file", file);

    setLoading(variant);
    try {
      const res = await fetch("/api/admin/site-settings/branding", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { variant: "dark" | "light"; url: string };
      if (data.variant === "dark") {
        setDarkUrl(data.url);
        setDarkFile(null);
      } else {
        setLightUrl(data.url);
        setLightFile(null);
      }
      toast.success(`${variant === "dark" ? "Dark" : "White"} logo updated`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload logo";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Branding: Logo</CardTitle>
        <CardDescription>
          Upload both logo variants: dark logo for light backgrounds, white logo for dark backgrounds.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-medium text-gray-900">Dark Logo (default)</p>
          <div className="flex h-16 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
            {bootLoading ? (
              <span className="text-xs text-gray-400">Loading...</span>
            ) : darkUrl ? (
              <img src={darkUrl} alt="Dark logo" className="max-h-12 w-auto object-contain" />
            ) : (
              <span className="text-xs text-gray-400">No dark logo uploaded</span>
            )}
          </div>
          <Input type="file" accept="image/*" onChange={(e) => setDarkFile(e.target.files?.[0] ?? null)} />
          <Button
            onClick={() => void uploadLogo("dark")}
            disabled={loading === "dark"}
            className="w-full bg-rose-600 hover:bg-rose-700"
          >
            {loading === "dark" ? "Uploading..." : "Upload Dark Logo"}
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-medium text-gray-900">White Logo (for dark bg)</p>
          <div className="flex h-16 items-center justify-center rounded-md border border-gray-800 bg-gray-900">
            {bootLoading ? (
              <span className="text-xs text-gray-400">Loading...</span>
            ) : lightUrl ? (
              <img src={lightUrl} alt="White logo" className="max-h-12 w-auto object-contain" />
            ) : (
              <span className="text-xs text-gray-400">No white logo uploaded</span>
            )}
          </div>
          <Input type="file" accept="image/*" onChange={(e) => setLightFile(e.target.files?.[0] ?? null)} />
          <Button
            onClick={() => void uploadLogo("light")}
            disabled={loading === "light"}
            className="w-full bg-gray-900 text-white hover:bg-black"
          >
            {loading === "light" ? "Uploading..." : "Upload White Logo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

