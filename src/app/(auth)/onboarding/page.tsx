"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Megaphone } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function selectRole(role: "influencer" | "ugc_creator") {
    setLoading(role);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to set role");
      await user?.reload();
      router.push("/influencer/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Em & Me Studio</h1>
          <p className="mt-2 text-gray-600">How will you be working with us?</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer border-2 transition-all hover:border-rose-400 hover:shadow-lg"
            onClick={() => selectRole("influencer")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                <Megaphone className="h-7 w-7 text-rose-600" />
              </div>
              <CardTitle>Influencer</CardTitle>
              <CardDescription>
                I create content and promote products on my social channels (Instagram, TikTok, YouTube, Pinterest)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-rose-600 hover:bg-rose-700"
                disabled={loading !== null}
                onClick={(e) => { e.stopPropagation(); selectRole("influencer"); }}
              >
                {loading === "influencer" ? "Setting up..." : "I'm an Influencer"}
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-2 transition-all hover:border-pink-400 hover:shadow-lg"
            onClick={() => selectRole("ugc_creator")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100">
                <Camera className="h-7 w-7 text-pink-600" />
              </div>
              <CardTitle>UGC Creator</CardTitle>
              <CardDescription>
                I create raw content assets (photos, videos) for the brand to use on their own channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-pink-600 hover:bg-pink-700"
                disabled={loading !== null}
                onClick={(e) => { e.stopPropagation(); selectRole("ugc_creator"); }}
              >
                {loading === "ugc_creator" ? "Setting up..." : "I'm a UGC Creator"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
