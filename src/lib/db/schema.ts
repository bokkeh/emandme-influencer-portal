import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "influencer",
  "ugc_creator",
]);

export const influencerTierEnum = pgEnum("influencer_tier", [
  "nano",
  "micro",
  "macro",
  "mega",
]);

export const platformEnum = pgEnum("platform", [
  "instagram",
  "tiktok",
  "youtube",
  "pinterest",
  "blog",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "invited",
  "accepted",
  "declined",
  "active",
  "completed",
  "removed",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "pending_review",
  "approved",
  "rejected",
  "revision_requested",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "reel",
  "static_post",
  "story",
  "tiktok_video",
  "youtube_video",
  "youtube_short",
  "pin",
  "blog_post",
  "ugc_video",
  "ugc_photo",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
]);

export const paymentTypeEnum = pgEnum("payment_type", [
  "campaign_fee",
  "bonus",
  "gift_card",
  "product_credit",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "preparing",
  "shipped",
  "delivered",
  "returned",
]);

export const stripeAccountStatusEnum = pgEnum("stripe_account_status", [
  "not_connected",
  "pending",
  "active",
  "restricted",
  "disabled",
]);

export const rosterPlatformEnum = pgEnum("roster_platform", [
  "instagram",
  "tiktok",
  "youtube",
  "pinterest",
  "other",
]);

export const rosterStatusEnum = pgEnum("roster_status", [
  "prospect",
  "contacted",
  "in_conversation",
  "negotiating",
  "confirmed",
  "active",
  "completed",
  "archived",
]);

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("influencer"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("users_clerk_user_id_idx").on(t.clerkUserId),
    index("users_email_idx").on(t.email),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// INFLUENCER PROFILES
// ─────────────────────────────────────────────────────────────────────────────

export const influencerProfiles = pgTable(
  "influencer_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),

    displayName: varchar("display_name", { length: 150 }),
    bio: text("bio"),
    niche: varchar("niche", { length: 100 }),
    tier: influencerTierEnum("tier").notNull().default("nano"),

    phone: varchar("phone", { length: 30 }),
    shippingAddressLine1: varchar("shipping_address_line1", { length: 255 }),
    shippingAddressLine2: varchar("shipping_address_line2", { length: 255 }),
    shippingCity: varchar("shipping_city", { length: 100 }),
    shippingState: varchar("shipping_state", { length: 100 }),
    shippingPostalCode: varchar("shipping_postal_code", { length: 20 }),
    shippingCountry: varchar("shipping_country", { length: 2 }).default("US"),

    stripeAccountId: varchar("stripe_account_id", { length: 255 }),
    stripeAccountStatus: stripeAccountStatusEnum("stripe_account_status")
      .notNull()
      .default("not_connected"),
    stripeOnboardingUrl: text("stripe_onboarding_url"),
    stripeDetailsSubmitted: boolean("stripe_details_submitted").notNull().default(false),
    stripePayoutsEnabled: boolean("stripe_payouts_enabled").notNull().default(false),

    hubspotContactId: varchar("hubspot_contact_id", { length: 100 }),
    hubspotLastSyncedAt: timestamp("hubspot_last_synced_at", { withTimezone: true }),

    totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalCampaigns: integer("total_campaigns").notNull().default(0),
    totalAssetsSubmitted: integer("total_assets_submitted").notNull().default(0),

    notes: text("notes"),
    isVerified: boolean("is_verified").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("influencer_profiles_user_id_idx").on(t.userId),
    index("influencer_profiles_tier_idx").on(t.tier),
    index("influencer_profiles_hubspot_idx").on(t.hubspotContactId),
  ]
);

// -----------------------------------------------------------------------------
// INFLUENCER ROSTER (lightweight CRM)
// -----------------------------------------------------------------------------

type RosterHistoryItem = {
  date: string;
  title: string;
  notes?: string;
};

export const influencerRoster = pgTable(
  "influencer_roster",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    handle: varchar("handle", { length: 120 }),
    platform: rosterPlatformEnum("platform").notNull().default("instagram"),
    profileUrl: text("profile_url"),
    portfolioUrl: text("portfolio_url"),
    avatarUrl: text("avatar_url"),

    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 30 }),
    manager: varchar("manager", { length: 200 }),
    creatorType: varchar("creator_type", { length: 20 }).notNull().default("influencer"),
    influencerTier: influencerTierEnum("influencer_tier").notNull().default("nano"),
    niche: varchar("niche", { length: 120 }),
    location: varchar("location", { length: 160 }),

    audienceNotes: text("audience_notes"),
    followerCount: integer("follower_count").notNull().default(0),
    engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }),
    avgViews: integer("avg_views"),
    contentStyleNotes: text("content_style_notes"),
    brandFitScore: integer("brand_fit_score"),
    totalRevenueGenerated: decimal("total_revenue_generated", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalCampaigns: integer("total_campaigns").notNull().default(0),
    stripePayoutStatus: stripeAccountStatusEnum("stripe_payout_status")
      .notNull()
      .default("not_connected"),
    portalProfileUrl: text("portal_profile_url"),

    status: rosterStatusEnum("status").notNull().default("prospect"),
    tags: text("tags").array().notNull().default([]),
    internalNotes: text("internal_notes"),
    pricingNotes: text("pricing_notes"),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),

    campaignHistory: jsonb("campaign_history").$type<RosterHistoryItem[]>().notNull().default([]),
    deliverablesCompleted: jsonb("deliverables_completed")
      .$type<RosterHistoryItem[]>()
      .notNull()
      .default([]),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("influencer_roster_full_name_idx").on(t.fullName),
    index("influencer_roster_status_idx").on(t.status),
    index("influencer_roster_platform_idx").on(t.platform),
    index("influencer_roster_last_contacted_idx").on(t.lastContactedAt),
  ]
);

export const influencerRosterActivities = pgTable(
  "influencer_roster_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => influencerRoster.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull().default("note"),
    note: text("note").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("influencer_roster_activities_roster_idx").on(t.rosterId),
    index("influencer_roster_activities_created_at_idx").on(t.createdAt),
  ]
);

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    influencerProfileId: uuid("influencer_profile_id")
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),

    handle: varchar("handle", { length: 255 }).notNull(),
    profileUrl: text("profile_url"),
    followerCount: integer("follower_count").notNull().default(0),
    avgEngagementRate: decimal("avg_engagement_rate", { precision: 5, scale: 2 }),
    avgViews: integer("avg_views"),
    avgLikes: integer("avg_likes"),
    avgComments: integer("avg_comments"),

    isVerified: boolean("is_verified").notNull().default(false),
    isPrimary: boolean("is_primary").notNull().default(false),

    lastStatsUpdatedAt: timestamp("last_stats_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("social_accounts_profile_platform_idx").on(
      t.influencerProfileId,
      t.platform
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

type CampaignProduct = {
  shopifyProductId: string;
  title: string;
  imageUrl?: string;
  variantId?: string;
};

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    briefUrl: text("brief_url"),

    status: campaignStatusEnum("status").notNull().default("draft"),
    platforms: platformEnum("platforms").array().notNull().default([]),

    totalBudget: decimal("total_budget", { precision: 12, scale: 2 }),
    spentBudget: decimal("spent_budget", { precision: 12, scale: 2 }).notNull().default("0"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),

    products: jsonb("products").$type<CampaignProduct[]>().default([]),

    hubspotDealId: varchar("hubspot_deal_id", { length: 100 }),
    totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
    totalOrders: integer("total_orders").notNull().default(0),

    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("campaigns_status_idx").on(t.status),
    index("campaigns_created_by_idx").on(t.createdByUserId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN INFLUENCERS (Junction)
// ─────────────────────────────────────────────────────────────────────────────

type Deliverable = {
  id: string;
  type: string;
  platform: string;
  dueDate: string;
  status: string;
  notes?: string;
};

export const campaignInfluencers = pgTable(
  "campaign_influencers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    influencerProfileId: uuid("influencer_profile_id")
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: "cascade" }),

    status: enrollmentStatusEnum("status").notNull().default("invited"),
    pipelineStage: varchar("pipeline_stage", { length: 30 }).notNull().default("outreach"),
    contractStatus: varchar("contract_status", { length: 30 }).notNull().default("not_sent"),
    proposedFee: decimal("proposed_fee", { precision: 12, scale: 2 }),
    agreedFee: decimal("agreed_fee", { precision: 12, scale: 2 }),
    contentDueDate: timestamp("content_due_date", { withTimezone: true }),
    contractUrl: text("contract_url"),
    contractSentAt: timestamp("contract_sent_at", { withTimezone: true }),
    contractSignedAt: timestamp("contract_signed_at", { withTimezone: true }),

    utmLinkId: uuid("utm_link_id"),
    discountCodeId: uuid("discount_code_id"),

    deliverables: jsonb("deliverables").$type<Deliverable[]>().default([]),
    notes: text("notes"),

    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("campaign_influencers_unique_idx").on(t.campaignId, t.influencerProfileId),
    index("campaign_influencers_campaign_idx").on(t.campaignId),
    index("campaign_influencers_influencer_idx").on(t.influencerProfileId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// ASSETS
// ─────────────────────────────────────────────────────────────────────────────

type AssetMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
};

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    influencerProfileId: uuid("influencer_profile_id")
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),

    blobUrl: text("blob_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    fileType: varchar("file_type", { length: 20 }).notNull(), // "image" | "video"
    fileSizeMb: decimal("file_size_mb", { precision: 8, scale: 2 }),
    contentType: contentTypeEnum("content_type"),

    platform: platformEnum("platform"),
    title: varchar("title", { length: 255 }),
    caption: text("caption"),
    postUrl: text("post_url"),
    postedAt: timestamp("posted_at", { withTimezone: true }),

    status: assetStatusEnum("status").notNull().default("pending_review"),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),

    metrics: jsonb("metrics").$type<AssetMetrics>().default({}),
    metricsUpdatedAt: timestamp("metrics_updated_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("assets_influencer_idx").on(t.influencerProfileId),
    index("assets_campaign_idx").on(t.campaignId),
    index("assets_status_idx").on(t.status),
    index("assets_platform_idx").on(t.platform),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// UTM LINKS
// ─────────────────────────────────────────────────────────────────────────────

export const utmLinks = pgTable(
  "utm_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    influencerProfileId: uuid("influencer_profile_id")
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),

    label: varchar("label", { length: 200 }),
    baseUrl: text("base_url").notNull(),
    utmSource: varchar("utm_source", { length: 100 }),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 200 }),
    utmTerm: varchar("utm_term", { length: 200 }),
    utmContent: varchar("utm_content", { length: 200 }),
    fullUrl: text("full_url").notNull(),

    clicks: integer("clicks").notNull().default(0),

    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("utm_links_influencer_idx").on(t.influencerProfileId),
    index("utm_links_campaign_idx").on(t.campaignId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// DISCOUNT CODES
// ─────────────────────────────────────────────────────────────────────────────

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    influencerProfileId: uuid("influencer_profile_id")
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),

    code: varchar("code", { length: 100 }).notNull().unique(),
    shopifyPriceRuleId: varchar("shopify_price_rule_id", { length: 100 }),
    shopifyDiscountCodeId: varchar("shopify_discount_code_id", { length: 100 }),

    discountType: varchar("discount_type", { length: 20 }).notNull().default("percentage"),
    discountValue: decimal("discount_value", { precision: 8, scale: 2 }).notNull(),

    usageCount: integer("usage_count").notNull().default(0),
    usageLimit: integer("usage_limit"),
    revenueGenerated: decimal("revenue_generated", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("discount_codes_influencer_idx").on(t.influencerProfileId),
    index("discount_codes_campaign_idx").on(t.campaignId),
    index("discount_codes_code_idx").on(t.code),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    influencerProfileId: uuid("influencer_profile_id")
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),

    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    paymentType: paymentTypeEnum("payment_type").notNull().default("campaign_fee"),

    stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
    stripePayoutId: varchar("stripe_payout_id", { length: 255 }),
    stripeFailureReason: text("stripe_failure_reason"),

    description: text("description"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    processedByUserId: uuid("processed_by_user_id").references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payments_influencer_idx").on(t.influencerProfileId),
    index("payments_campaign_idx").on(t.campaignId),
    index("payments_status_idx").on(t.status),
    index("payments_due_date_idx").on(t.dueDate),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// SHIPMENTS
// ─────────────────────────────────────────────────────────────────────────────

type ShipmentProduct = {
  name: string;
  variant?: string;
  qty: number;
  shopifyProductId?: string;
};

type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    influencerProfileId: uuid("influencer_profile_id")
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),

    products: jsonb("products").$type<ShipmentProduct[]>().notNull().default([]),

    shopifyOrderId: varchar("shopify_order_id", { length: 100 }),
    shopifyFulfillmentId: varchar("shopify_fulfillment_id", { length: 100 }),
    trackingNumber: varchar("tracking_number", { length: 200 }),
    carrier: varchar("carrier", { length: 100 }),
    trackingUrl: text("tracking_url"),

    status: shipmentStatusEnum("status").notNull().default("preparing"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>(),

    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    notes: text("notes"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("shipments_influencer_idx").on(t.influencerProfileId),
    index("shipments_campaign_idx").on(t.campaignId),
    index("shipments_status_idx").on(t.status),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE SNAPSHOTS
// ─────────────────────────────────────────────────────────────────────────────

export const performanceSnapshots = pgTable(
  "performance_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    influencerProfileId: uuid("influencer_profile_id")
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),

    platform: platformEnum("platform").notNull(),
    metricType: varchar("metric_type", { length: 50 }).notNull(),
    metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("perf_snapshots_influencer_idx").on(t.influencerProfileId),
    index("perf_snapshots_campaign_idx").on(t.campaignId),
    index("perf_snapshots_recorded_at_idx").on(t.recordedAt),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one }) => ({
  influencerProfile: one(influencerProfiles, {
    fields: [users.id],
    references: [influencerProfiles.userId],
  }),
}));

export const influencerProfilesRelations = relations(
  influencerProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [influencerProfiles.userId],
      references: [users.id],
    }),
    socialAccounts: many(socialAccounts),
    campaignInfluencers: many(campaignInfluencers),
    assets: many(assets),
    utmLinks: many(utmLinks),
    discountCodes: many(discountCodes),
    payments: many(payments),
    shipments: many(shipments),
    performanceSnapshots: many(performanceSnapshots),
  })
);

export const influencerRosterRelations = relations(influencerRoster, ({ many }) => ({
  activities: many(influencerRosterActivities),
}));

export const influencerRosterActivitiesRelations = relations(
  influencerRosterActivities,
  ({ one }) => ({
    influencer: one(influencerRoster, {
      fields: [influencerRosterActivities.rosterId],
      references: [influencerRoster.id],
    }),
    createdBy: one(users, {
      fields: [influencerRosterActivities.createdByUserId],
      references: [users.id],
    }),
  })
);

export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  influencerProfile: one(influencerProfiles, {
    fields: [socialAccounts.influencerProfileId],
    references: [influencerProfiles.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [campaigns.createdByUserId],
    references: [users.id],
  }),
  campaignInfluencers: many(campaignInfluencers),
  assets: many(assets),
  utmLinks: many(utmLinks),
  discountCodes: many(discountCodes),
  payments: many(payments),
  shipments: many(shipments),
}));

export const campaignInfluencersRelations = relations(
  campaignInfluencers,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignInfluencers.campaignId],
      references: [campaigns.id],
    }),
    influencerProfile: one(influencerProfiles, {
      fields: [campaignInfluencers.influencerProfileId],
      references: [influencerProfiles.id],
    }),
  })
);

export const assetsRelations = relations(assets, ({ one, many }) => ({
  influencerProfile: one(influencerProfiles, {
    fields: [assets.influencerProfileId],
    references: [influencerProfiles.id],
  }),
  campaign: one(campaigns, {
    fields: [assets.campaignId],
    references: [campaigns.id],
  }),
  reviewedBy: one(users, {
    fields: [assets.reviewedByUserId],
    references: [users.id],
  }),
  performanceSnapshots: many(performanceSnapshots),
}));

export const utmLinksRelations = relations(utmLinks, ({ one }) => ({
  influencerProfile: one(influencerProfiles, {
    fields: [utmLinks.influencerProfileId],
    references: [influencerProfiles.id],
  }),
  campaign: one(campaigns, {
    fields: [utmLinks.campaignId],
    references: [campaigns.id],
  }),
}));

export const discountCodesRelations = relations(discountCodes, ({ one }) => ({
  influencerProfile: one(influencerProfiles, {
    fields: [discountCodes.influencerProfileId],
    references: [influencerProfiles.id],
  }),
  campaign: one(campaigns, {
    fields: [discountCodes.campaignId],
    references: [campaigns.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  influencerProfile: one(influencerProfiles, {
    fields: [payments.influencerProfileId],
    references: [influencerProfiles.id],
  }),
  campaign: one(campaigns, {
    fields: [payments.campaignId],
    references: [campaigns.id],
  }),
  processedBy: one(users, {
    fields: [payments.processedByUserId],
    references: [users.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  influencerProfile: one(influencerProfiles, {
    fields: [shipments.influencerProfileId],
    references: [influencerProfiles.id],
  }),
  campaign: one(campaigns, {
    fields: [shipments.campaignId],
    references: [campaigns.id],
  }),
}));

export const performanceSnapshotsRelations = relations(
  performanceSnapshots,
  ({ one }) => ({
    influencerProfile: one(influencerProfiles, {
      fields: [performanceSnapshots.influencerProfileId],
      references: [influencerProfiles.id],
    }),
    asset: one(assets, {
      fields: [performanceSnapshots.assetId],
      references: [assets.id],
    }),
    campaign: one(campaigns, {
      fields: [performanceSnapshots.campaignId],
      references: [campaigns.id],
    }),
  })
);
