# Withings Variables Migration Guide

This guide explains how to migrate your Withings integration from using hardcoded variable names to a proper variable system using the `variables` table.

## Overview

The new system provides several benefits:

1. **Clean Variable Names**: Removed units from slugs (e.g., `weight` instead of `weight_kg`)
2. **Centralized Variables**: All variables stored in the `variables` table
3. **Automatic Variable Creation**: Variables are created automatically when needed
4. **Better Data Relationships**: Uses `variable_id` foreign keys instead of text strings
5. **Consistent Schema**: Aligns with the universal variables system

## Changes Made

### 1. Updated Variable Mappings

**Old Mapping:**

```javascript
{
  1: "weight_kg",
  5: "fat_free_mass_kg",
  6: "fat_ratio",
  8: "fat_mass_weight_kg",
  76: "muscle_mass_kg",
  77: "hydration_kg",
  88: "bone_mass_kg"
}
```

**New Mapping:**

```javascript
{
  1: { slug: "weight", label: "Weight", unit: "kg", category: "Body Composition" },
  5: { slug: "fat_free_mass", label: "Fat Free Mass", unit: "kg", category: "Body Composition" },
  6: { slug: "fat_ratio", label: "Fat Ratio", unit: "%", category: "Body Composition" },
  8: { slug: "fat_mass", label: "Fat Mass", unit: "kg", category: "Body Composition" },
  76: { slug: "muscle_mass", label: "Muscle Mass", unit: "kg", category: "Body Composition" },
  77: { slug: "hydration", label: "Hydration", unit: "kg", category: "Body Composition" },
  88: { slug: "bone_mass", label: "Bone Mass", unit: "kg", category: "Body Composition" }
}
```

### 2. Database Schema Updates

**Old Schema:**

```sql
CREATE TABLE withings_variable_data_points (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    date DATE NOT NULL,
    variable TEXT NOT NULL,  -- Old: stored as text
    value DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date, variable)
);
```

**New Schema:**

```sql
CREATE TABLE withings_variable_data_points (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    date DATE NOT NULL,
    variable_id UUID REFERENCES variables(id),  -- New: foreign key
    value DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date, variable_id)
);
```

### 3. Edge Function Updates

The `withings-sync-all` edge function now:

- Automatically creates variables in the `variables` table if they don't exist
- Uses `variable_id` instead of variable names in data points
- Stores proper metadata (unit, category, description) for each variable

## Migration Steps

### Step 1: Run Database Migration

1. **Copy the migration SQL:**

   ```bash
   cat database/migrate_withings_to_variable_id.sql
   ```

2. **Execute in Supabase Dashboard:**
   - Go to your Supabase Dashboard → SQL Editor
   - Paste the migration SQL and execute it
   - This will:
     - Create Withings variables in the `variables` table
     - Add `variable_id` column to `withings_variable_data_points`
     - Migrate existing data to use `variable_id`
     - Update constraints and indexes

### Step 2: Verify Migration

Run the verification script:

```bash
node scripts/migrate_withings_variables.js --verify
```

This will check:

- ✅ `variable_id` column exists
- ✅ Withings variables are created
- ✅ Existing data has been migrated
- ✅ Constraints are updated

### Step 3: Deploy Updated Edge Function

Deploy the updated edge function:

```bash
supabase functions deploy withings-sync-all
```

### Step 4: Update Frontend Components

The following components have been updated to work with the new schema:

- `src/pages/withings-test.tsx` - Updated data preview and search
- `src/components/ComprehensiveHealthDashboard.tsx` - Updated data fetching
- More components may need updates based on your usage

## New Features

### 1. Automatic Variable Creation

The edge function now automatically creates variables when syncing:

```typescript
// Variables are created automatically with proper metadata
const variableInfo = {
  slug: "weight",
  label: "Weight",
  unit: "kg",
  category: "Body Composition",
  source_type: "withings",
};
```

### 2. Better Data Queries

You can now join with the variables table for richer queries:

```javascript
const { data } = await supabase
  .from("withings_variable_data_points")
  .select(
    `
    date,
    value,
    variables!inner(slug, label, canonical_unit)
  `
  )
  .eq("user_id", userId);
```

### 3. Consistent Variable Management

All Withings variables are now managed through the universal variables system:

- Consistent with Oura and manual variables
- Support for unit conversion
- Better categorization
- User preferences per variable

## Testing

### Test the Migration

1. **Check variables were created:**

   ```sql
   SELECT slug, label, canonical_unit
   FROM variables
   WHERE source_type = 'withings';
   ```

2. **Verify data migration:**

   ```sql
   SELECT COUNT(*) as migrated_records
   FROM withings_variable_data_points
   WHERE variable_id IS NOT NULL;
   ```

3. **Test the new edge function:**
   - Use the Withings test page (`/withings-test`)
   - Run a sync and verify variables are created correctly
   - Check that data points use `variable_id`

### Expected Results

After migration, you should see:

- 7 Withings variables in the `variables` table
- All existing data migrated to use `variable_id`
- New sync operations create proper variable relationships
- Clean variable names without units (e.g., "weight" instead of "weight_kg")

## Troubleshooting

### Common Issues

1. **Migration fails with constraint errors:**

   - Check if you have duplicate data
   - Ensure the `variables` table exists
   - Verify foreign key constraints

2. **Edge function fails to create variables:**

   - Check Supabase service role permissions
   - Verify the `variables` table schema
   - Check edge function logs

3. **Frontend components show errors:**
   - Update queries to use `variable_id` instead of `variable`
   - Join with `variables` table for labels
   - Handle the new data structure

### Rollback Plan

If you need to rollback:

1. **Keep old variable column:**
   The migration script keeps the old `variable` column by default (commented out drop)

2. **Update edge function:**
   You can temporarily revert the edge function to use the old schema

3. **Update frontend:**
   Revert frontend components to use the old `variable` field

## Benefits of the New System

1. **Cleaner Data Model**: Variable metadata is centralized
2. **Better Performance**: Foreign keys are more efficient than text comparisons
3. **Extensibility**: Easy to add new variable properties
4. **Consistency**: All data sources use the same variable system
5. **User Experience**: Better variable labels and categorization
6. **Future-Proof**: Supports advanced features like unit conversion

## Next Steps

After migration:

1. **Update remaining components** to use the new schema
2. **Test thoroughly** with real Withings data
3. **Monitor performance** and optimize queries if needed
4. **Consider adding** user preferences for Withings variables
5. **Implement unit conversion** if needed

## Support

If you encounter issues:

1. Check the migration verification output
2. Review Supabase edge function logs
3. Test queries in the Supabase SQL editor
4. Ensure all components are updated to use the new schema
