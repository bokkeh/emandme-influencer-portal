ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'affiliate';

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS campaign_type varchar(20) NOT NULL DEFAULT 'influencer';
