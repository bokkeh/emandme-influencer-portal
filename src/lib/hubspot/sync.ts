import { hubspot } from "./client";
import { db } from "@/lib/db";
import { influencerProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type SyncParams = {
  influencerProfileId: string;
};

export async function syncInfluencerToHubSpot({ influencerProfileId }: SyncParams) {
  const [profile] = await db
    .select({
      id: influencerProfiles.id,
      displayName: influencerProfiles.displayName,
      tier: influencerProfiles.tier,
      niche: influencerProfiles.niche,
      totalEarnings: influencerProfiles.totalEarnings,
      totalCampaigns: influencerProfiles.totalCampaigns,
      hubspotContactId: influencerProfiles.hubspotContactId,
      stripeAccountStatus: influencerProfiles.stripeAccountStatus,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(influencerProfiles.id, influencerProfileId))
    .limit(1);

  if (!profile) return { success: false as const, reason: "PROFILE_NOT_FOUND" as const };

  const properties: Record<string, string> = {
    email: profile.userEmail,
    firstname: profile.userFirstName ?? "",
    lastname: profile.userLastName ?? "",
    influencer_tier: profile.tier,
    influencer_niche: profile.niche ?? "",
    total_revenue_generated: profile.totalEarnings ?? "0",
    total_campaigns: String(profile.totalCampaigns),
    stripe_payout_status: profile.stripeAccountStatus,
    portal_profile_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/influencers/${profile.id}`,
  };

  let contactId = profile.hubspotContactId;

  if (contactId) {
    await hubspot.updateContact(contactId, properties);
  } else {
    const searchResult = await hubspot.getContactByEmail(profile.userEmail);
    if (searchResult.total > 0) {
      contactId = String(searchResult.results[0].id);
      await hubspot.updateContact(contactId, properties);
    } else {
      const created = await hubspot.createContact(properties);
      contactId = created.id;
    }
  }

  // Save the HubSpot contact ID back
  if (contactId && contactId !== profile.hubspotContactId) {
    await db
      .update(influencerProfiles)
      .set({ hubspotContactId: contactId, hubspotLastSyncedAt: new Date() })
      .where(eq(influencerProfiles.id, influencerProfileId));
  } else {
    await db
      .update(influencerProfiles)
      .set({ hubspotLastSyncedAt: new Date() })
      .where(eq(influencerProfiles.id, influencerProfileId));
  }

  return {
    success: true as const,
    influencerProfileId: profile.id,
    contactId: contactId ?? null,
    email: profile.userEmail,
    syncedAt: new Date().toISOString(),
  };
}

type AssetReviewEmailParams = {
  influencerProfileId: string;
  status: "approved" | "rejected" | "revision_requested";
  campaignTitle?: string | null;
  assetTitle?: string | null;
  reviewNotes?: string | null;
};

export async function sendAssetReviewEmailViaHubSpot({
  influencerProfileId,
  status,
  campaignTitle,
  assetTitle,
  reviewNotes,
}: AssetReviewEmailParams) {
  const [profile] = await db
    .select({
      id: influencerProfiles.id,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(influencerProfiles.id, influencerProfileId))
    .limit(1);

  if (!profile?.userEmail) return { sent: false as const, reason: "MISSING_EMAIL" as const };

  const emailIdRaw =
    status === "approved"
      ? process.env.HUBSPOT_ASSET_APPROVED_EMAIL_ID
      : process.env.HUBSPOT_ASSET_REJECTED_EMAIL_ID;
  const emailId = Number(emailIdRaw);
  if (!Number.isFinite(emailId)) {
    return { sent: false as const, reason: "MISSING_TEMPLATE_ID" as const };
  }

  const fullName = `${profile.userFirstName ?? ""} ${profile.userLastName ?? ""}`.trim();
  await hubspot.sendSingleEmail({
    to: profile.userEmail,
    emailId,
    contactProperties: {
      firstname: profile.userFirstName ?? "",
      lastname: profile.userLastName ?? "",
      email: profile.userEmail,
    },
    customProperties: {
      influencer_name: fullName || profile.userEmail,
      asset_status: status,
      campaign_title: campaignTitle ?? "",
      asset_title: assetTitle ?? "",
      review_notes: reviewNotes ?? "",
      asset_feedback: reviewNotes ?? "",
    },
  });

  return { sent: true as const };
}
