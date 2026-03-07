ALTER TABLE influencer_roster
ADD COLUMN IF NOT EXISTS creator_type varchar(20) NOT NULL DEFAULT 'influencer';
