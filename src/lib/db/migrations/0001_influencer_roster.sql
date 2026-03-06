DO $$
BEGIN
  CREATE TYPE roster_platform AS ENUM ('instagram', 'tiktok', 'youtube', 'pinterest', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE roster_status AS ENUM (
    'prospect',
    'contacted',
    'in_conversation',
    'negotiating',
    'confirmed',
    'active',
    'completed',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS influencer_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(200) NOT NULL,
  handle varchar(120),
  platform roster_platform NOT NULL DEFAULT 'instagram',
  profile_url text,
  email varchar(320),
  phone varchar(30),
  manager varchar(200),
  niche varchar(120),
  location varchar(160),
  audience_notes text,
  follower_count integer NOT NULL DEFAULT 0,
  engagement_rate numeric(5, 2),
  avg_views integer,
  content_style_notes text,
  brand_fit_score integer,
  status roster_status NOT NULL DEFAULT 'prospect',
  tags text[] NOT NULL DEFAULT '{}',
  internal_notes text,
  pricing_notes text,
  last_contacted_at timestamptz,
  campaign_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  deliverables_completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS influencer_roster_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES influencer_roster(id) ON DELETE CASCADE,
  type varchar(40) NOT NULL DEFAULT 'note',
  note text NOT NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS influencer_roster_full_name_idx ON influencer_roster (full_name);
CREATE INDEX IF NOT EXISTS influencer_roster_status_idx ON influencer_roster (status);
CREATE INDEX IF NOT EXISTS influencer_roster_platform_idx ON influencer_roster (platform);
CREATE INDEX IF NOT EXISTS influencer_roster_last_contacted_idx ON influencer_roster (last_contacted_at);
CREATE INDEX IF NOT EXISTS influencer_roster_activities_roster_idx ON influencer_roster_activities (roster_id);
CREATE INDEX IF NOT EXISTS influencer_roster_activities_created_at_idx ON influencer_roster_activities (created_at);
