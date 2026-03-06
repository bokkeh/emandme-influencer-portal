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

export type RosterPlatform = (typeof ROSTER_PLATFORMS)[number];
export type RosterStatus = (typeof ROSTER_STATUSES)[number];

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
  email: string | null;
  phone: string | null;
  manager: string | null;
  niche: string | null;
  location: string | null;
  followerCount: number;
  engagementRate: number | null;
  avgViews: number | null;
  audienceNotes: string | null;
  contentStyleNotes: string | null;
  brandFitScore: number | null;
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
