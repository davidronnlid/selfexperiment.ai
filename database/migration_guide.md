-- Migration script to convert existing daily_logs to new daily_logs_v2 format
-- Run this AFTER the variables_schema.sql has been applied

-- Create a temporary mapping table for label to variable_id conversion
CREATE TEMP TABLE label_to_variable_mapping AS
SELECT label, id as variable_id FROM variables WHERE is_predefined = true;

-- Migrate continuous/ordinal variables (numeric values)
INSERT INTO daily_logs_v2 (
  user_id,
  variable_id, 
  value,
  canonical_value,
  date,
  timestamp,
  method,
  confidence,
  created_at,
  updated_at
)
SELECT 
  dl.user_id,
  lvm.variable_id,
  CASE 
    WHEN dl.value ~ '^[0-9]+\.?[0-9]*$' THEN dl.value::numeric
    ELSE NULL
  END as value,
  -- For now, assume canonical value same as value (no unit conversion needed for existing data)
  CASE 
    WHEN dl.value ~ '^[0-9]+\.?[0-9]*$' THEN dl.value::numeric
    ELSE NULL
  END as canonical_value,
  dl.date,
  dl.created_at as timestamp,
  'manual_entry' as method,
  1.0 as confidence,
  dl.created_at,
  dl.updated_at
FROM daily_logs dl
JOIN label_to_variable_mapping lvm ON dl.label = lvm.label
JOIN variables v ON lvm.variable_id = v.id
WHERE v.type IN ('continuous', 'ordinal')
AND dl.value IS NOT NULL
AND dl.value != '';

-- Migrate categorical/boolean variables (text values)
INSERT INTO daily_logs_v2 (
  user_id,
  variable_id,
  text_value,
  date,
  timestamp, 
  method,
  confidence,
  created_at,
  updated_at
)
SELECT 
  dl.user_id,
  lvm.variable_id,
  dl.value as text_value,
  dl.date,
  dl.created_at as timestamp,
  'manual_entry' as method,
  1.0 as confidence,
  dl.created_at,
  dl.updated_at
FROM daily_logs dl
JOIN label_to_variable_mapping lvm ON dl.label = lvm.label  
JOIN variables v ON lvm.variable_id = v.id
WHERE v.type IN ('categorical', 'boolean')
AND dl.value IS NOT NULL
AND dl.value != '';

-- Verify migration results
SELECT 
  'Original daily_logs' as source,
  count(*) as count
FROM daily_logs
UNION ALL
SELECT 
  'Migrated daily_logs_v2' as source, 
  count(*) as count
FROM daily_logs_v2;

-- Show migration summary by variable type
SELECT 
  v.type,
  v.label,
  count(*) as migrated_count
FROM daily_logs_v2 dl2
JOIN variables v ON dl2.variable_id = v.id
GROUP BY v.type, v.label
ORDER BY v.type, migrated_count DESC;