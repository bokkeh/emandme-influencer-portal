DO $$
BEGIN
  CREATE TYPE platform AS ENUM ('instagram', 'tiktok', 'youtube', 'pinterest', 'blog');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(200) NOT NULL,
  description text,
  brief_url text,
  status campaign_status NOT NULL DEFAULT 'draft',
  platforms platform[] NOT NULL DEFAULT '{}',
  total_budget numeric(12,2),
  spent_budget numeric(12,2) NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  products jsonb DEFAULT '[]'::jsonb,
  hubspot_deal_id varchar(100),
  total_revenue numeric(12,2) NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS brief_url text,
ADD COLUMN IF NOT EXISTS status campaign_status NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS platforms platform[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_budget numeric(12,2),
ADD COLUMN IF NOT EXISTS spent_budget numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_date timestamptz,
ADD COLUMN IF NOT EXISTS end_date timestamptz,
ADD COLUMN IF NOT EXISTS products jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hubspot_deal_id varchar(100),
ADD COLUMN IF NOT EXISTS total_revenue numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_orders integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns (status);
CREATE INDEX IF NOT EXISTS campaigns_created_by_idx ON campaigns (created_by_user_id);
