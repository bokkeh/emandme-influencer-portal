import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, assets, campaigns, influencerProfiles, users } from "@/lib/db";
import { sendAssetReviewEmailViaHubSpot } from "@/lib/hubspot/sync";

async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);
  return user ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new NextResponse("Unauthorized", { status: 401 });
  if (currentUser.role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as {
    status?: "approved" | "rejected" | "revision_requested";
    reviewNotes?: string | null;
  };

  if (!body.status) return new NextResponse("Status is required", { status: 400 });

  const [existing] = await db
    .select({
      id: assets.id,
      influencerProfileId: assets.influencerProfileId,
      title: assets.title,
      campaignTitle: campaigns.title,
    })
    .from(assets)
    .leftJoin(campaigns, eq(assets.campaignId, campaigns.id))
    .where(eq(assets.id, id))
    .limit(1);
  if (!existing) return new NextResponse("Asset not found", { status: 404 });

  const [updated] = await db
    .update(assets)
    .set({
      status: body.status,
      reviewNotes: body.reviewNotes?.trim() || null,
      reviewedAt: new Date(),
      reviewedByUserId: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, id))
    .returning();

  if (!updated) return new NextResponse("Asset not found", { status: 404 });

  let emailSent = false;
  let emailError: string | null = null;
  try {
    const emailResult = await sendAssetReviewEmailViaHubSpot({
      influencerProfileId: existing.influencerProfileId,
      status: body.status,
      campaignTitle: existing.campaignTitle,
      assetTitle: existing.title,
      reviewNotes: body.reviewNotes ?? null,
    });
    emailSent = emailResult.sent;
    if (!emailResult.sent) {
      emailError =
        emailResult.reason === "MISSING_TEMPLATE_ID"
          ? "Missing HUBSPOT_ASSET_APPROVED_EMAIL_ID / HUBSPOT_ASSET_REJECTED_EMAIL_ID"
          : "Influencer email is missing";
    }
  } catch (error) {
    emailError = error instanceof Error ? error.message : "Unknown HubSpot email error";
    console.error("[HubSpot] Failed to send asset review email:", error);
  }

  return NextResponse.json({ ...updated, emailSent, emailError });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  if (currentUser.role === "admin") {
    const [deleted] = await db.delete(assets).where(eq(assets.id, id)).returning({ id: assets.id });
    if (!deleted) return new NextResponse("Asset not found", { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const [ownedAsset] = await db
    .select({ id: assets.id })
    .from(assets)
    .innerJoin(influencerProfiles, eq(assets.influencerProfileId, influencerProfiles.id))
    .where(and(eq(assets.id, id), eq(influencerProfiles.userId, currentUser.id)))
    .limit(1);

  if (!ownedAsset) return new NextResponse("Asset not found", { status: 404 });

  await db.delete(assets).where(eq(assets.id, id));
  return NextResponse.json({ ok: true });
}
