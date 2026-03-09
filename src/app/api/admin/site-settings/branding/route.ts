import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, appSettings, users } from "@/lib/db";
import { uploadPublicFile } from "@/lib/storage";
import { BRANDING_KEYS } from "@/lib/branding";

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

function isAllowedType(file: File) {
  return file.type.startsWith("image/");
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

function isStorageConfigError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("blob_read_write_token") ||
    lowered.includes("read-write token") ||
    lowered.includes("vercel blob") ||
    lowered.includes("gcs_") ||
    lowered.includes("google cloud")
  );
}

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const rows = await db
      .select({ key: appSettings.key, value: appSettings.value })
      .from(appSettings)
      .where(inArray(appSettings.key, [BRANDING_KEYS.logoDark, BRANDING_KEYS.logoLight]));

    return NextResponse.json({
      logoDarkUrl: rows.find((row) => row.key === BRANDING_KEYS.logoDark)?.value ?? null,
      logoLightUrl: rows.find((row) => row.key === BRANDING_KEYS.logoLight)?.value ?? null,
    });
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Site settings table is missing. Run DB migrations to create app_settings first.",
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to load branding settings";
    return new NextResponse(message, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const variant = String(formData.get("variant") ?? "").trim().toLowerCase();
    if (!file) return new NextResponse("No file uploaded", { status: 400 });
    if (!isAllowedType(file)) return new NextResponse("Use image files only", { status: 400 });
    if (variant !== "dark" && variant !== "light") {
      return new NextResponse("Variant must be dark or light", { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return new NextResponse("Logo file must be <= 5MB", { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const pathname = `settings/logo-${variant}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const uploaded = await uploadPublicFile(pathname, file, file.type);

    const key = variant === "dark" ? BRANDING_KEYS.logoDark : BRANDING_KEYS.logoLight;
    await db
      .insert(appSettings)
      .values({ key, value: uploaded.url, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: uploaded.url, updatedAt: new Date() },
      });

    return NextResponse.json({
      variant,
      url: uploaded.url,
    });
  } catch (error) {
    if (isSchemaError(error)) {
      return new NextResponse(
        "Site settings table is missing. Run DB migrations to create app_settings first.",
        { status: 500 }
      );
    }
    if (isStorageConfigError(error)) {
      return new NextResponse(
        "Storage is not configured. Set either GCS_* env vars or BLOB_READ_WRITE_TOKEN and redeploy.",
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to upload logo";
    return new NextResponse(message, { status: 500 });
  }
}

