import { eq } from "drizzle-orm";
import { appSettings, db } from "@/lib/db";
import {
  DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS,
  GOOGLE_CHAT_NOTIFICATION_EVENTS,
  GOOGLE_CHAT_NOTIFICATION_SETTINGS_KEY,
  normalizeGoogleChatNotificationSettings,
  type GoogleChatNotificationSettings,
} from "@/lib/notifications/google-chat-settings-shared";

const CACHE_TTL_MS = 30_000;
let cache: { expiresAt: number; settings: GoogleChatNotificationSettings } | null = null;

async function readSettingsFromDb(): Promise<GoogleChatNotificationSettings> {
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, GOOGLE_CHAT_NOTIFICATION_SETTINGS_KEY))
      .limit(1);

    if (!row?.value) return { ...DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS };

    const parsed = JSON.parse(row.value);
    return normalizeGoogleChatNotificationSettings(parsed);
  } catch (error) {
    console.error("[Google Chat] Failed to read notification settings. Using defaults.", error);
    return { ...DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS };
  }
}

export async function getGoogleChatNotificationSettings(): Promise<GoogleChatNotificationSettings> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.settings;

  const settings = await readSettingsFromDb();
  cache = { settings, expiresAt: now + CACHE_TTL_MS };
  return settings;
}

export async function saveGoogleChatNotificationSettings(
  value: unknown
): Promise<GoogleChatNotificationSettings> {
  const settings = normalizeGoogleChatNotificationSettings(value);

  await db
    .insert(appSettings)
    .values({
      key: GOOGLE_CHAT_NOTIFICATION_SETTINGS_KEY,
      value: JSON.stringify(settings),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: JSON.stringify(settings),
        updatedAt: new Date(),
      },
    });

  cache = {
    settings,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return settings;
}

export {
  GOOGLE_CHAT_NOTIFICATION_EVENTS,
  GOOGLE_CHAT_NOTIFICATION_SETTINGS_KEY,
  DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS,
  normalizeGoogleChatNotificationSettings,
};
export type { GoogleChatNotificationSettings };
