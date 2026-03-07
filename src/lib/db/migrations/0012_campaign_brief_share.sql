ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS brief_content jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS brief_share_token varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_brief_share_token_idx
  ON campaigns (brief_share_token);

