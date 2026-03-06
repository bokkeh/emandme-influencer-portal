export const ROSTER_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "pinterest",
  "other",
] as const;

export const ROSTER_STATUSES = [
  "prospect",
  "contacted",
  "in_conversation",
  "negotiating",
  "confirmed",
  "active",
  "completed",
  "archived",
] as const;

export const INFLUENCER_TIERS = ["nano", "micro", "macro", "mega"] as const;
export const STRIPE_PAYOUT_STATUSES = [
  "not_connected",
  "pending",
  "active",
  "restricted",
  "disabled",
] as const;

export type RosterPlatform = (typeof ROSTER_PLATFORMS)[number];
export type RosterStatus = (typeof ROSTER_STATUSES)[number];
export type InfluencerTier = (typeof INFLUENCER_TIERS)[number];
export type StripePayoutStatus = (typeof STRIPE_PAYOUT_STATUSES)[number];

export type RosterHistoryItem = {
  date: string;
  title: string;
  notes?: string;
};

export type InfluencerProfile = {
  id: string;
  fullName: string;
  handle: string | null;
  platform: RosterPlatform;
  profileUrl: string | null;
  portfolioUrl: string | null;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  manager: string | null;
  influencerTier: InfluencerTier;
  niche: string | null;
  location: string | null;
  followerCount: number;
  engagementRate: number | null;
  avgViews: number | null;
  audienceNotes: string | null;
  contentStyleNotes: string | null;
  brandFitScore: number | null;
  totalRevenueGenerated: number;
  totalCampaigns: number;
  stripePayoutStatus: StripePayoutStatus;
  portalProfileUrl: string | null;
  status: RosterStatus;
  tags: string[];
  internalNotes: string | null;
  pricingNotes: string | null;
  lastContactedAt: string | null;
  campaignHistory: RosterHistoryItem[];
  deliverablesCompleted: RosterHistoryItem[];
  createdAt: string;
  updatedAt: string;
};

export type RosterActivity = {
  id: string;
  rosterId: string;
  type: string;
  note: string;
  createdByUserId: string | null;
  createdAt: string;
};
