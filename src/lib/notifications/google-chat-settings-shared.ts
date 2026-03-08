export const GOOGLE_CHAT_NOTIFICATION_SETTINGS_KEY = "google_chat_notification_settings";

export const GOOGLE_CHAT_NOTIFICATION_EVENTS = [
  "influencer_joined",
  "asset_submitted",
  "payment_processed",
  "payment_failed",
  "shipment_reminder",
  "campaign_milestone",
  "campaign_signup_requested",
  "campaign_enrollment_accepted",
  "campaign_enrollment_declined",
] as const;

export type GoogleChatNotificationEvent = (typeof GOOGLE_CHAT_NOTIFICATION_EVENTS)[number];

export type GoogleChatNotificationSettings = Record<GoogleChatNotificationEvent, boolean>;

export const DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS: GoogleChatNotificationSettings = {
  influencer_joined: true,
  asset_submitted: true,
  payment_processed: true,
  payment_failed: true,
  shipment_reminder: true,
  campaign_milestone: true,
  campaign_signup_requested: true,
  campaign_enrollment_accepted: true,
  campaign_enrollment_declined: true,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function normalizeGoogleChatNotificationSettings(
  value: unknown
): GoogleChatNotificationSettings {
  const merged: GoogleChatNotificationSettings = {
    ...DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS,
  };

  if (!isObject(value)) return merged;

  for (const event of GOOGLE_CHAT_NOTIFICATION_EVENTS) {
    if (typeof value[event] === "boolean") {
      merged[event] = value[event];
    }
  }

  return merged;
}
