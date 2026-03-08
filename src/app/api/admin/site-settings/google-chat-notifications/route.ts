import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS,
  normalizeGoogleChatNotificationSettings,
  getGoogleChatNotificationSettings,
  saveGoogleChatNotificationSettings,
} from "@/lib/notifications/google-chat-settings";

async function requireAdminApi() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    role = dbUser?.role;
  }

  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const };
}

function isSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("app_settings") ||
    lowered.includes("does not exist") ||
    lowered.includes("undefined table") ||
    lowered.includes("undefined column")
  );
}

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const settings = await getGoogleChatNotificationSettings();
    return NextResponse.json({
      settings,
      defaults: DEFAULT_GOOGLE_CHAT_NOTIFICATION_SETTINGS,
      webhookConfigured: Boolean(process.env.GOOGLE_CHAT_WEBHOOK_URL),
    });
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Site settings table is missing. Run DB migrations to create app_settings first.",
        { status: 500 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to load Google Chat notification settings";
    return new NextResponse(message, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const body = (await req.json()) as { settings?: unknown };
    if (!body || !("settings" in body)) {
      return new NextResponse("Missing settings payload", { status: 400 });
    }

    const normalized = normalizeGoogleChatNotificationSettings(body.settings);
    const settings = await saveGoogleChatNotificationSettings(normalized);
    return NextResponse.json({ settings });
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Site settings table is missing. Run DB migrations to create app_settings first.",
        { status: 500 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to save Google Chat notification settings";
    return new NextResponse(message, { status: 500 });
  }
}

