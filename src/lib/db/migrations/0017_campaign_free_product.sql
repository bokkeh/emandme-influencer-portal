ALTER TABLE campaign_influencers
ADD COLUMN IF NOT EXISTS includes_free_product boolean NOT NULL DEFAULT false;

