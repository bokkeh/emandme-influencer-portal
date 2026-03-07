import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db, appSettings, users } from "@/lib/db";
import { eq } from "drizzle-orm";

async function requireAdminApi() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role;
  }
  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const };
}

function isAllowedType(file: File) {
  const allowed = new Set(["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml"]);
  return allowed.has(file.type);
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

function isBlobConfigError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("blob_read_write_token") ||
    lowered.includes("read-write token") ||
    lowered.includes("vercel blob")
  );
}

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, "favicon_url")).limit(1);
    return NextResponse.json({ faviconUrl: setting?.value ?? null });
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Site settings table is missing. Run DB migrations to create app_settings before using favicon upload.",
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to load favicon settings";
    return new NextResponse(message, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return new NextResponse("No file uploaded", { status: 400 });
    if (!isAllowedType(file)) {
      return new NextResponse("Use .ico, .png, or .svg favicon files only", { status: 400 });
    }
    if (file.size > 1024 * 1024) {
      return new NextResponse("Favicon file must be <= 1MB", { status: 400 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return new NextResponse(
        "Missing BLOB_READ_WRITE_TOKEN in Vercel environment variables.",
        { status: 500 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "ico";
    const pathname = `settings/favicon-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const blob = await put(pathname, file, { access: "public", contentType: file.type });

    await db
      .insert(appSettings)
      .values({
        key: "favicon_url",
        value: blob.url,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: blob.url,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ faviconUrl: blob.url });
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Site settings table is missing. Run DB migrations to create app_settings before using favicon upload.",
        { status: 500 }
      );
    }
    if (isBlobConfigError(error)) {
      return new NextResponse(
        "Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN in Production env and redeploy.",
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to upload favicon";
    return new NextResponse(message, { status: 500 });
  }
}
