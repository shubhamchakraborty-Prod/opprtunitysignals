-- Noida 62/63 opportunity evidence: PostgreSQL + PostGIS schema.
-- Records keep the full provenance document (JSONB) plus indexed columns used
-- for filtering, spatial checks and history. Nothing is ever hard-deleted.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Approximate sector areas for orientation and scope checks. Not official boundaries.
CREATE TABLE IF NOT EXISTS sector_areas (
  sector text PRIMARY KEY,
  area geography(Polygon, 4326) NOT NULL,
  is_approximate boolean NOT NULL DEFAULT true,
  source_note text NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_records (
  source_id text PRIMARY KEY,
  doc jsonb NOT NULL,
  sector text GENERATED ALWAYS AS (doc->>'sector') STORED,
  source_type text GENERATED ALWAYS AS (doc->>'source_type') STORED,
  evidence_type text GENERATED ALWAYS AS (doc->>'evidence_type') STORED,
  verification_status text GENERATED ALWAYS AS (doc->>'verification_status') STORED,
  review_state text GENERATED ALWAYS AS (doc->'review'->>'state') STORED,
  dedupe_cluster text GENERATED ALWAYS AS (doc->>'dedupe_cluster') STORED,
  location_precision text GENERATED ALWAYS AS (doc->'geo'->>'granularity') STORED,
  captured_at date NOT NULL,
  -- Only set for verified geocodes; sector-level records have no point.
  location geography(Point, 4326),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'system',
  CONSTRAINT presence_has_no_vacancies CHECK (
    doc->>'evidence_type' <> 'employer_presence'
    OR (coalesce(doc->>'vacancy_count_verified', '') = '' AND coalesce(doc->>'vacancy_claimed', '') = '')
  ),
  CONSTRAINT verified_count_only_when_confirmed CHECK (
    coalesce(doc->>'vacancy_count_verified', '') = '' OR doc->>'verification_status' = 'employer_confirmed'
  )
);
CREATE INDEX IF NOT EXISTS evidence_records_sector_idx ON evidence_records (sector, verification_status);
CREATE INDEX IF NOT EXISTS evidence_records_cluster_idx ON evidence_records (dedupe_cluster);
CREATE INDEX IF NOT EXISTS evidence_records_location_idx ON evidence_records USING gist (location);

-- Full version history of every record (provenance).
CREATE TABLE IF NOT EXISTS evidence_record_history (
  id bigserial PRIMARY KEY,
  source_id text NOT NULL,
  doc jsonb NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by text NOT NULL
);

CREATE OR REPLACE FUNCTION evidence_records_history_fn() RETURNS trigger AS $$
BEGIN
  INSERT INTO evidence_record_history (source_id, doc, changed_at, changed_by)
  VALUES (OLD.source_id, OLD.doc, now(), NEW.updated_by);
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evidence_records_history_tg ON evidence_records;
CREATE TRIGGER evidence_records_history_tg
  BEFORE UPDATE ON evidence_records
  FOR EACH ROW WHEN (OLD.doc IS DISTINCT FROM NEW.doc)
  EXECUTE FUNCTION evidence_records_history_fn();

CREATE TABLE IF NOT EXISTS verifications (id text PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS interviews (id text PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS passouts (id text PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS source_flags (id text PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL);

-- Append-only audit log: updates and deletes are rejected.
CREATE TABLE IF NOT EXISTS audit_log (
  seq bigserial PRIMARY KEY,
  id text NOT NULL UNIQUE,
  at timestamptz NOT NULL,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION audit_log_immutable_fn() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable_tg ON audit_log;
CREATE TRIGGER audit_log_immutable_tg
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable_fn();
