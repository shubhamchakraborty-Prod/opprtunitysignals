-- Government data feeds: run log (one row per fetch attempt) and latest normalised rows per source.
CREATE TABLE IF NOT EXISTS gov_runs (id text PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS gov_runs_source_idx ON gov_runs ((doc->>'source_id'), (doc->>'finished_at'));
CREATE TABLE IF NOT EXISTS gov_latest (id text PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
