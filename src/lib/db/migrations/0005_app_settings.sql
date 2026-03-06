CREATE TABLE IF NOT EXISTS app_settings (
  key varchar(100) PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
