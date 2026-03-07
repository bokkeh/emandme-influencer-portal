"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HubSpotSyncTestCard() {
  const [profileId, setProfileId] = useState("");
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function checkConfig() {
    setChecking(true);
    try {
      const res = await fetch("/api/hubspot/sync");
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to check HubSpot config");
      const data = JSON.parse(text) as { configured: boolean; hasAppUrl: boolean };
      const message = `Token: ${data.configured ? "OK" : "Missing"} | APP URL: ${data.hasAppUrl ? "OK" : "Missing"}`;
      setStatus(message);
      toast.success(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check HubSpot config";
      setStatus(message);
      toast.error(message);
    } finally {
      setChecking(false);
    }
  }

  async function runSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/hubspot/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerProfileId: profileId || undefined }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "HubSpot sync failed");
      const data = JSON.parse(text) as { contactId?: string; email?: string; influencerProfileId?: string };
      const message = `Synced ${data.email ?? "profile"} (contact ${data.contactId ?? "unknown"})`;
      setStatus(message);
      toast.success(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "HubSpot sync failed";
      setStatus(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">HubSpot Sync Test</CardTitle>
        <CardDescription>Validate token config and run a manual test sync.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={checkConfig} disabled={checking}>
            {checking ? "Checking..." : "Check HubSpot Config"}
          </Button>
          <Button type="button" className="bg-rose-600 hover:bg-rose-700" onClick={runSync} disabled={syncing}>
            {syncing ? "Syncing..." : "Run Test Sync"}
          </Button>
        </div>
        <div>
          <Label>Influencer Profile ID (optional)</Label>
          <Input
            placeholder="Leave blank to sync latest updated profile"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
          />
        </div>
        {status ? <p className="text-xs text-gray-600">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
