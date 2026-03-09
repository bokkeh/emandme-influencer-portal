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

  const profileIdProp =
    process.env.HUBSPOT_INFLUENCER_PROFILE_ID_PROPERTY?.trim() || "influencer_profile_id";
  const profileUrlProp =
    process.env.HUBSPOT_PORTAL_PROFILE_URL_PROPERTY?.trim() || "portal_profile_url";

  const properties: Record<string, string> = {
    email: profile.userEmail,
    firstname: profile.userFirstName ?? "",
    lastname: profile.userLastName ?? "",
    influencer_tier: profile.tier,
    influencer_niche: profile.niche ?? "",
    total_revenue_generated: profile.totalEarnings ?? "0",
    total_campaigns: String(profile.totalCampaigns),
    stripe_payout_status: profile.stripeAccountStatus,
    [profileIdProp]: profile.id,
    [profileUrlProp]: `${process.env.NEXT_PUBLIC_APP_URL}/admin/influencers/${profile.id}`,
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

  const statusProp = process.env.HUBSPOT_ASSET_REVIEW_STATUS_PROPERTY?.trim() || "asset_review_status";
  const feedbackProp = process.env.HUBSPOT_ASSET_FEEDBACK_PROPERTY?.trim() || "asset_feedback";
  const titleProp = process.env.HUBSPOT_ASSET_TITLE_PROPERTY?.trim() || "asset_title";
  const campaignProp = process.env.HUBSPOT_CAMPAIGN_TITLE_PROPERTY?.trim() || "campaign_title";
  const reviewedAtProp = process.env.HUBSPOT_ASSET_REVIEWED_AT_PROPERTY?.trim() || "asset_reviewed_at";
  const influencerNameProp = process.env.HUBSPOT_INFLUENCER_NAME_PROPERTY?.trim();

  const fullName = `${profile.userFirstName ?? ""} ${profile.userLastName ?? ""}`.trim();
  const reviewedAt = new Date();
  reviewedAt.setUTCHours(0, 0, 0, 0);
  const baseProperties: Record<string, string> = {
    email: profile.userEmail,
    firstname: profile.userFirstName ?? "",
    lastname: profile.userLastName ?? "",
    [feedbackProp]: reviewNotes ?? "",
    [titleProp]: assetTitle ?? "",
    [campaignProp]: campaignTitle ?? "",
    [reviewedAtProp]: String(reviewedAt.getTime()),
  };
  if (influencerNameProp) {
    baseProperties[influencerNameProp] = fullName || profile.userEmail;
  }

  let contactId = "";
  const [existingProfile] = await db
    .select({ hubspotContactId: influencerProfiles.hubspotContactId })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.id, influencerProfileId))
    .limit(1);
  if (existingProfile?.hubspotContactId) {
    contactId = existingProfile.hubspotContactId;
  } else {
    const search = await hubspot.getContactByEmail(profile.userEmail);
    if (search.total > 0) {
      contactId = String(search.results[0].id);
    }
  }

  if (contactId) {
    // Write supporting fields first, then flip status in a second update so
    // workflow enrollment sees the freshest feedback/title/campaign values.
    await hubspot.updateContact(contactId, baseProperties);
    await hubspot.updateContact(contactId, { [statusProp]: status });
  } else {
    const created = await hubspot.createContact(baseProperties);
    contactId = String(created.id);
    await hubspot.updateContact(contactId, { [statusProp]: status });
  }

  await db
    .update(influencerProfiles)
    .set({
      hubspotContactId: contactId || null,
      hubspotLastSyncedAt: new Date(),
    })
    .where(eq(influencerProfiles.id, influencerProfileId));

  // "sent" here means workflow trigger payload was successfully pushed to HubSpot.
  return {
    sent: true as const,
    debug: {
      recipientEmail: profile.userEmail,
      contactId,
      properties: {
        ...baseProperties,
        [statusProp]: status,
      },
    },
  };
}
