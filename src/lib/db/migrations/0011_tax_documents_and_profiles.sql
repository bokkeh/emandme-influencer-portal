ALTER TABLE influencer_profiles
ADD COLUMN IF NOT EXISTS tax_legal_name varchar(200),
ADD COLUMN IF NOT EXISTS tax_classification varchar(50),
ADD COLUMN IF NOT EXISTS tax_id_last4 varchar(4),
ADD COLUMN IF NOT EXISTS tax_address_line1 varchar(255),
ADD COLUMN IF NOT EXISTS tax_address_line2 varchar(255),
ADD COLUMN IF NOT EXISTS tax_city varchar(100),
ADD COLUMN IF NOT EXISTS tax_state varchar(100),
ADD COLUMN IF NOT EXISTS tax_postal_code varchar(20),
ADD COLUMN IF NOT EXISTS tax_country varchar(2) DEFAULT 'US',
ADD COLUMN IF NOT EXISTS tax_form_submitted_at timestamptz;

CREATE TABLE IF NOT EXISTS tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_profile_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  document_type varchar(40) NOT NULL DEFAULT '1099_nec',
  file_url text NOT NULL,
  file_name varchar(255),
  uploaded_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tax_documents_profile_year_type_idx
  ON tax_documents (influencer_profile_id, tax_year, document_type);
CREATE INDEX IF NOT EXISTS tax_documents_profile_idx ON tax_documents (influencer_profile_id);
CREATE INDEX IF NOT EXISTS tax_documents_year_idx ON tax_documents (tax_year);
