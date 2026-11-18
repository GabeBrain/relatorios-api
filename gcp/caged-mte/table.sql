-- Execute in the chosen GCP project/dataset. Never use Supabase service-role here.
-- Replace PROJECT.DATASET with the deployment target before execution.
CREATE TABLE IF NOT EXISTS `PROJECT.DATASET.caged_mte_snapshots` (
  snapshot_version STRING NOT NULL,
  query_version STRING NOT NULL,
  coverage_start DATE NOT NULL,
  published_through DATE NOT NULL,
  loaded_at TIMESTAMP NOT NULL,
  month DATE NOT NULL,
  uf STRING NOT NULL,
  sector STRING NOT NULL,
  balance INT64 NOT NULL
)
PARTITION BY published_through
CLUSTER BY snapshot_version, uf, sector;
