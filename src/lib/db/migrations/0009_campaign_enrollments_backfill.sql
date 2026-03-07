DO $$
BEGIN
  CREATE TYPE enrollment_status AS ENUM ('invited', 'accepted', 'declined', 'active', 'completed', 'removed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS campaign_influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  influencer_profile_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'invited',
  agreed_fee numeric(12,2),
  content_due_date timestamptz,
  utm_link_id uuid,
  discount_code_id uuid,
  deliverables jsonb DEFAULT '[]'::jsonb,
  notes text,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_influencers
ADD COLUMN IF NOT EXISTS status enrollment_status NOT NULL DEFAULT 'invited',
ADD COLUMN IF NOT EXISTS agreed_fee numeric(12,2),
ADD COLUMN IF NOT EXISTS content_due_date timestamptz,
ADD COLUMN IF NOT EXISTS utm_link_id uuid,
ADD COLUMN IF NOT EXISTS discount_code_id uuid,
ADD COLUMN IF NOT EXISTS deliverables jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS enrolled_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS campaign_influencers_unique_idx
  ON campaign_influencers (campaign_id, influencer_profile_id);
CREATE INDEX IF NOT EXISTS campaign_influencers_campaign_idx
  ON campaign_influencers (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_influencers_influencer_idx
  ON campaign_influencers (influencer_profile_id);
