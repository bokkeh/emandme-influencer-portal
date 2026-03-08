ALTER TABLE campaign_influencers
ADD COLUMN IF NOT EXISTS selected_product_id text,
ADD COLUMN IF NOT EXISTS selected_product_title text,
ADD COLUMN IF NOT EXISTS selected_product_variant_id text,
ADD COLUMN IF NOT EXISTS onboarding_submitted_at timestamptz;

