CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE proposal_type AS ENUM (
  'sponsorship_proposal',
  'idea',
  'general'
);

CREATE TABLE proposals (
  proposal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin_bucc_id UUID NOT NULL,
  author_uid TEXT NOT NULL,
  type proposal_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  beneficiary_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proposals_origin_bucc_id ON proposals(origin_bucc_id);
CREATE INDEX idx_proposals_author_uid ON proposals(author_uid);
CREATE INDEX idx_proposals_type ON proposals(type);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
