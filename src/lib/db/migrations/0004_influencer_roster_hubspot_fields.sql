ALTER TABLE influencer_roster
ADD COLUMN IF NOT EXISTS influencer_tier influencer_tier NOT NULL DEFAULT 'nano',
ADD COLUMN IF NOT EXISTS total_revenue_generated numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_campaigns integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_payout_status stripe_account_status NOT NULL DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS portal_profile_url text;
