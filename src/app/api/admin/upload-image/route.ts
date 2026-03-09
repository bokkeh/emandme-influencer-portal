import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { uploadPublicFile } from "@/lib/storage";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_MB = 10;

async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized", userId: null };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role;
  }
  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden", userId };
  return { ok: true as const, userId };
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return new NextResponse("No file provided", { status: 400 });

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return new NextResponse("Unsupported image type. Use JPG, PNG, WEBP, or GIF.", { status: 400 });
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_IMAGE_MB) {
      return new NextResponse(`Image too large. Max ${MAX_IMAGE_MB}MB.`, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const pathname = `campaign-briefs/${guard.userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const uploaded = await uploadPublicFile(pathname, file, file.type);

    return NextResponse.json({ url: uploaded.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload image";
    return new NextResponse(message, { status: 500 });
  }
}
