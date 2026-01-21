-- Run this ONLY if you already executed supabase_schema.sql before.
-- It safely adds the new columns needed for:
-- - board colors
-- - card start/due dates
-- - task validation (completed)

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Optional helper: keep completed_at in sync when completed changes
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS DISTINCT FROM NEW.completed) THEN
    NEW.completed_at = TIMEZONE('utc', NOW());
  ELSIF NEW.completed = FALSE AND (OLD.completed IS DISTINCT FROM NEW.completed) THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cards_completed_at ON cards;
CREATE TRIGGER set_cards_completed_at
  BEFORE UPDATE OF completed ON cards
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

