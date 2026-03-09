import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, campaignInfluencers, users, campaigns, influencerProfiles } from "@/lib/db";
import { googleChat } from "@/lib/notifications/google-chat";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const { id, enrollmentId } = await params;
    const body = (await req.json()) as {
      status?: string;
      pipelineStage?: string;
      contractStatus?: string;
      proposedFee?: number | string | null;
      agreedFee?: number | string | null;
      includesFreeProduct?: boolean;
      contentDueDate?: string | null;
      contractUrl?: string | null;
      contractSentAt?: string | null;
      contractSignedAt?: string | null;
      notes?: string | null;
    };

    const [existing] = await db
      .select({
        status: campaignInfluencers.status,
        influencerName: influencerProfiles.displayName,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        campaignTitle: campaigns.title,
      })
      .from(campaignInfluencers)
      .innerJoin(influencerProfiles, eq(campaignInfluencers.influencerProfileId, influencerProfiles.id))
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .innerJoin(campaigns, eq(campaignInfluencers.campaignId, campaigns.id))
      .where(and(eq(campaignInfluencers.id, enrollmentId), eq(campaignInfluencers.campaignId, id)))
      .limit(1);

    if (!existing) return new NextResponse("Enrollment not found", { status: 404 });

    const [updated] = await db
      .update(campaignInfluencers)
      .set({
        status: body.status as
          | "invited"
          | "accepted"
          | "declined"
          | "active"
          | "completed"
          | "removed"
          | undefined,
        pipelineStage: body.pipelineStage?.trim() || undefined,
        contractStatus: body.contractStatus?.trim() || undefined,
        proposedFee:
          body.proposedFee !== undefined
            ? body.proposedFee !== null && body.proposedFee !== ""
              ? String(body.proposedFee)
              : null
            : undefined,
        agreedFee:
          body.agreedFee !== undefined
            ? body.agreedFee !== null && body.agreedFee !== ""
              ? String(body.agreedFee)
              : null
            : undefined,
        includesFreeProduct:
          body.includesFreeProduct !== undefined ? Boolean(body.includesFreeProduct) : undefined,
        contentDueDate:
          body.contentDueDate !== undefined ? (body.contentDueDate ? new Date(body.contentDueDate) : null) : undefined,
        contractUrl: body.contractUrl !== undefined ? (body.contractUrl?.trim() || null) : undefined,
        contractSentAt:
          body.contractSentAt !== undefined ? (body.contractSentAt ? new Date(body.contractSentAt) : null) : undefined,
        contractSignedAt:
          body.contractSignedAt !== undefined
            ? body.contractSignedAt
              ? new Date(body.contractSignedAt)
              : null
            : undefined,
        notes: body.notes !== undefined ? (body.notes?.trim() || null) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(campaignInfluencers.id, enrollmentId), eq(campaignInfluencers.campaignId, id)))
      .returning();

    if (!updated) return new NextResponse("Enrollment not found", { status: 404 });

    const nextStatus = updated.status;
    const priorStatus = existing.status;
    if (
      priorStatus !== nextStatus &&
      (nextStatus === "accepted" || nextStatus === "declined")
    ) {
      const influencerName =
        (existing.influencerName ?? "").trim() ||
        `${existing.userFirstName ?? ""} ${existing.userLastName ?? ""}`.trim() ||
        existing.userEmail;
      googleChat
        .campaignEnrollmentDecision(existing.campaignTitle, influencerName, nextStatus)
        .catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update enrollment";
    return new NextResponse(message, { status: 500 });
  }
}
