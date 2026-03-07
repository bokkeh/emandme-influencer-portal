ALTER TABLE campaign_influencers
ADD COLUMN IF NOT EXISTS pipeline_stage varchar(30) NOT NULL DEFAULT 'outreach',
ADD COLUMN IF NOT EXISTS contract_status varchar(30) NOT NULL DEFAULT 'not_sent',
ADD COLUMN IF NOT EXISTS proposed_fee numeric(12,2),
ADD COLUMN IF NOT EXISTS contract_url text,
ADD COLUMN IF NOT EXISTS contract_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz;
