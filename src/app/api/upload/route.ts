import { auth } from "@clerk/nextjs/server";
import { HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles } from "@/lib/db";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_FILE_MB } from "@/lib/blob/upload";

async function resolveInfluencerProfileId(clerkUserId: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!user) return null;

  const [profile] = await db
    .select({ id: influencerProfiles.id })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);
  return profile?.id ?? null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const influencerProfileId = await resolveInfluencerProfileId(userId);
  if (!influencerProfileId) return new NextResponse("Profile not found", { status: 404 });

  return NextResponse.json({ influencerProfileId, maxUploadMb: MAX_UPLOAD_FILE_MB });
}

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const influencerProfileId = await resolveInfluencerProfileId(userId);
        if (!influencerProfileId) throw new Error("Profile not found");

        const allowedPrefix = `assets/${influencerProfileId}/`;
        if (!pathname.startsWith(allowedPrefix)) {
          throw new Error("Invalid upload path");
        }

        return {
          allowedContentTypes: ALLOWED_UPLOAD_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_FILE_MB * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ influencerProfileId }),
        };
      },
      onUploadCompleted: async () => {
        // Upload completion is persisted when /api/assets is called from the client.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload initialization failed";
    return new NextResponse(message, { status: 400 });
  }
}

