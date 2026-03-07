ALTER TABLE campaign_influencers
ADD COLUMN IF NOT EXISTS pet_name varchar(120),
ADD COLUMN IF NOT EXISTS pet_breed varchar(120),
ADD COLUMN IF NOT EXISTS pet_age varchar(40),
ADD COLUMN IF NOT EXISTS pet_personality text,
ADD COLUMN IF NOT EXISTS tag_personalization_text text,
ADD COLUMN IF NOT EXISTS pet_info_submitted_at timestamptz;

