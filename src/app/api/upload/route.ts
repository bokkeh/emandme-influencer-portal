import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { validateFile } from "@/lib/blob/upload";
import { db, users, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return new NextResponse("No file provided", { status: 400 });

  const validation = validateFile(file);
  if (!validation.valid) return new NextResponse(validation.error, { status: 400 });

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user) return new NextResponse("User not found", { status: 404 });

  const [profile] = await db
    .select({ id: influencerProfiles.id })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);

  if (!profile) return new NextResponse("Profile not found", { status: 404 });

  const ext = file.name.split(".").pop() ?? "bin";
  const pathname = `assets/${profile.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
  });

  const fileType = file.type.startsWith("image/") ? "image" : "video";
  const fileSizeMb = file.size / (1024 * 1024);

  return NextResponse.json({
    url: blob.url,
    fileType,
    fileSizeMb: Math.round(fileSizeMb * 100) / 100,
    influencerProfileId: profile.id,
  });
}
