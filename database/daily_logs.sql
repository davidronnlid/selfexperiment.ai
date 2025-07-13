-- Migration: Rename 'variable' to 'variable_id' in daily_logs
ALTER TABLE daily_logs RENAME COLUMN variable TO variable_id;
-- If you need to update foreign keys or indexes, add those statements as well.