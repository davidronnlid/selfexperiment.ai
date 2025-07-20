# Oura Variable Update Guide

## Overview

This guide provides SQL scripts to update variable labels and slugs for all variables that start with "oura" or "Oura" in the `variables` table.

## What the Script Does

### 1. **Label Updates**

- Removes "Oura " or "oura " prefix from variable labels
- Examples:
  - `"Oura Sleep Score"` → `"Sleep Score"`
  - `"oura readiness score"` → `"readiness score"`

### 2. **Slug Updates**

- Removes the first underscore after "oura" in slugs
- Examples:
  - `"oura_sleep_score"` → `"ourasleep_score"`
  - `"oura_readiness_score"` → `"ourareadiness_score"`

## Files Created

### 1. `scripts/check_oura_variables.sql`

**Purpose:** Check current state before updating
**Usage:** Run this first to see what will be changed

### 2. `scripts/update_oura_variables_safe.sql`

**Purpose:** Main update script with safe slug handling
**Usage:** Run this to perform the actual updates

### 3. `scripts/test_oura_variable_update.js`

**Purpose:** JavaScript test script to verify changes
**Usage:** Run with `node scripts/test_oura_variable_update.js`

## Step-by-Step Instructions

### Step 1: Check Current State

```sql
-- Run in Supabase SQL Editor
\i scripts/check_oura_variables.sql
```

### Step 2: Perform Updates

```sql
-- Run in Supabase SQL Editor
\i scripts/update_oura_variables_safe.sql
```

### Step 3: Verify Changes

```bash
# Run in terminal
node scripts/test_oura_variable_update.js
```

## Expected Results

### Before Update

```
label: "Oura Sleep Score"
slug: "oura_sleep_score"
```

### After Update

```
label: "Sleep Score"
slug: "ourasleep_score"
```

## Safety Features

1. **Dry Run First:** The script shows what will be changed before making updates
2. **Safe Slug Handling:** Properly handles cases with multiple underscores
3. **Verification:** Includes checks to ensure updates were successful
4. **Backup:** Consider backing up the variables table before running

## Common Oura Variables

The script will likely affect these variables:

- Sleep Score
- Readiness Score
- Total Sleep Duration
- REM Sleep Duration
- Deep Sleep Duration
- Sleep Efficiency
- Sleep Latency
- Temperature Deviation
- Heart Rate (Lowest/Average)

## Troubleshooting

### If Script Fails

1. Check for duplicate slugs after update
2. Verify all variables have proper source_type
3. Ensure no foreign key constraints are violated

### Rollback Plan

If needed, you can restore from backup or manually revert changes using the original labels and slugs.

## Notes

- The script updates `updated_at` timestamp for modified records
- Only affects variables with `source_type = 'oura'` or labels starting with "oura"/"Oura"
- Maintains referential integrity with other tables
