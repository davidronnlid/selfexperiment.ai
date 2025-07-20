# Oura Variable Duplicate Solution

## Problem

When trying to update "Oura Readiness Score" to "Readiness Score", we get a duplicate key error because a "Readiness Score" variable already exists.

## Solution

We need to handle duplicates by migrating data and then deleting the Oura-labeled duplicates.

## Scripts Created

### 1. `scripts/check_oura_duplicates_impact.sql`

- **Purpose:** Check what data would be lost if we delete Oura duplicates
- **Usage:** Run first to understand the impact

### 2. `scripts/migrate_oura_data_before_update.sql`

- **Purpose:** Migrate data from Oura variables to existing variables
- **Usage:** Run before deletion to preserve data

### 3. `scripts/update_oura_variables_handle_duplicates.sql`

- **Purpose:** Main script that deletes Oura duplicates and updates remaining variables
- **Usage:** Run after migration to perform the updates

## Process

1. **Check Impact:** Run `check_oura_duplicates_impact.sql` to see what would be lost
2. **Migrate Data:** Run `migrate_oura_data_before_update.sql` to preserve data
3. **Update Variables:** Run `update_oura_variables_handle_duplicates.sql` to clean up

## Example

**Before:**

- Variable 1: "Readiness Score" (existing)
- Variable 2: "Oura Readiness Score" (duplicate)

**After Migration:**

- Data from "Oura Readiness Score" moved to "Readiness Score"

**After Update:**

- Variable 1: "Readiness Score" (kept)
- Variable 2: Deleted (duplicate removed)

## Safety Features

- ✅ Data migration before deletion
- ✅ Impact analysis before changes
- ✅ Verification steps included
- ✅ Handles multiple related tables
