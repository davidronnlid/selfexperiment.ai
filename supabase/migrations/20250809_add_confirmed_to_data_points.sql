-- Add confirmed flag to data_points and default behavior for auto-tracked rows

-- 1) Column + default
ALTER TABLE data_points
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;

ALTER TABLE data_points
ALTER COLUMN confirmed SET DEFAULT TRUE;

-- 2) Backfill existing rows
-- Mark routine/auto sources as unconfirmed unless already set
UPDATE data_points
SET confirmed = FALSE
WHERE confirmed IS NULL
  AND (
    COALESCE(source, '') ILIKE '%routine%'
    OR COALESCE(source, '') ILIKE '%auto%'
  );

-- Everything else defaults to confirmed = TRUE
UPDATE data_points
SET confirmed = TRUE
WHERE confirmed IS NULL;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_data_points_confirmed ON data_points(confirmed);
CREATE INDEX IF NOT EXISTS idx_data_points_user_confirmed ON data_points(user_id, confirmed);

-- 4) Trigger to enforce default for inserts (cannot reference other columns in DEFAULT)
CREATE OR REPLACE FUNCTION set_data_points_confirmed_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmed IS NULL THEN
    IF COALESCE(NEW.source, '') ILIKE '%routine%' OR COALESCE(NEW.source, '') ILIKE '%auto%' THEN
      NEW.confirmed := FALSE;
    ELSE
      NEW.confirmed := TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_confirmed_default ON data_points;
CREATE TRIGGER trg_set_confirmed_default
BEFORE INSERT ON data_points
FOR EACH ROW
EXECUTE FUNCTION set_data_points_confirmed_default();

COMMENT ON COLUMN data_points.confirmed IS 'Whether the data point has been user-confirmed. Auto-tracked points default to false until confirmed.';


