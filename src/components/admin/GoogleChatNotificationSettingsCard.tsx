"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS,
  type GoogleChatNotificationSettings,
  type GoogleChatNotificationEvent,
} from "@/lib/notifications/google-chat-settings-shared";

type SettingsResponse = {
  settings: GoogleChatNotificationSettings;
  webhookConfigured: boolean;
};

const EVENT_META: Array<{
  key: GoogleChatNotificationEvent;
  label: string;
  description: string;
}> = [
  {
    key: "influencer_joined",
    label: "Influencer joined",
    description: "Notify when a creator joins the portal.",
  },
  {
    key: "campaign_signup_requested",
    label: "Campaign signup requested",
    description: "Notify when an influencer clicks Sign up for campaign.",
  },
  {
    key: "campaign_enrollment_accepted",
    label: "Campaign enrollment accepted",
    description: "Notify when admin accepts an influencer into a campaign.",
  },
  {
    key: "campaign_enrollment_declined",
    label: "Campaign enrollment declined",
    description: "Notify when admin declines an influencer for a campaign.",
  },
  {
    key: "asset_submitted",
    label: "Asset submitted",
    description: "Notify when a creator uploads campaign content.",
  },
  {
    key: "payment_processed",
    label: "Payment processed",
    description: "Notify when a payment is sent.",
  },
  {
    key: "payment_failed",
    label: "Payment failed",
    description: "Notify when a Stripe payout fails.",
  },
  {
    key: "shipment_reminder",
    label: "Shipping reminder",
    description: "Notify on shipment reminder events.",
  },
  {
    key: "campaign_milestone",
    label: "Campaign milestone",
    description: "Notify on campaign milestone updates.",
  },
];

export function GoogleChatNotificationSettingsCard() {
  const [settings, setSettings] = useState<GoogleChatNotificationSettings>(
    DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/site-settings/google-chat-notifications");
        if (!res.ok) throw new Error((await res.text()) || "Failed to load settings");
        const data = (await res.json()) as SettingsResponse;
        setSettings(data.settings);
        setWebhookConfigured(Boolean(data.webhookConfigured));
        setInitialSnapshot(JSON.stringify(data.settings));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load Google Chat notification settings";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty = useMemo(() => JSON.stringify(settings) !== initialSnapshot, [settings, initialSnapshot]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings/google-chat-notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save settings");
      const data = (await res.json()) as { settings: GoogleChatNotificationSettings };
      setSettings(data.settings);
      setInitialSnapshot(JSON.stringify(data.settings));
      toast.success("Google Chat notification settings saved");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save Google Chat notification settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: GoogleChatNotificationEvent, checked: boolean) {
    setSettings((prev) => ({ ...prev, [key]: checked }));
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Google Chat Notifications</CardTitle>
            <CardDescription>Choose which events post to your Google Chat webhook</CardDescription>
          </div>
          <Badge
            className={
              webhookConfigured
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-600"
            }
          >
            {webhookConfigured ? "Webhook Configured" : "Webhook Missing"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">
          Set <code className="bg-gray-100 px-1 rounded text-xs">GOOGLE_CHAT_WEBHOOK_URL</code>{" "}
          in Vercel/ENV first. Toggles only control event routing when a webhook is configured.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Loading notification settings...</p>
        ) : (
          <div className="space-y-3">
            {EVENT_META.map((item) => (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <Switch
                  checked={settings[item.key]}
                  onCheckedChange={(checked) => toggle(item.key, checked)}
                  aria-label={item.label}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={loading || saving || !dirty}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {saving ? "Saving..." : "Save Notification Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
