# Oura Incremental Sync

## Overview

The new **Oura Incremental Sync** functionality solves the problem of duplicate data and unnecessary API calls by only fetching missing data instead of re-syncing everything each time.

## Problem with Original Sync

The original `oura-sync-all` function had these issues:

1. **Always cleared existing data** (`clearExisting = true` by default)
2. **Re-fetched everything** from startYear to today on each sync
3. **Wasted API quota** on duplicate requests
4. **Slow syncing** when you just wanted recent data

## How Incremental Sync Works

### 🔍 Smart Gap Detection

The incremental sync analyzes your existing data and identifies exactly what's missing:

1. **Initial Sync**: If no data exists, fetches everything from `startYear` to today
2. **Historical Backfill**: Fills gaps before your earliest existing data
3. **Gap Fill**: Finds and fills missing dates within your existing data range
4. **Recent Data**: Only fetches new data since your latest existing date

### 📊 Example Scenarios

#### Scenario 1: First Time Sync

```
Existing data: None
Action: Fetch 2020-01-01 to 2024-01-15 (initial_sync)
```

#### Scenario 2: Daily Update

```
Existing data: 2020-01-01 to 2024-01-14
Action: Fetch 2024-01-14 to 2024-01-15 (recent_data)
```

#### Scenario 3: Gap Filling

```
Existing data: 2020-01-01 to 2020-06-30, 2020-08-01 to 2024-01-14
Action: Fetch 2020-07-01 to 2020-07-31 (gap_fill) + 2024-01-14 to 2024-01-15 (recent_data)
```

## Functions Available

### 1. Original Sync (oura-sync-all)

- **Location**: `supabase/functions/oura-sync-all/index.ts`
- **Use case**: Full re-sync when you want to clear and rebuild everything
- **Default**: `clearExisting = true`

### 2. Incremental Sync (oura-sync-incremental)

- **Location**: `supabase/functions/oura-sync-incremental/index.ts`
- **Use case**: Daily/regular syncing to get only new data
- **Default**: `clearExisting = false`

## Usage Scripts

### Incremental Sync (Recommended)

```bash
# Smart sync - only fetches missing data
node scripts/sync_oura_incremental.js

# Force full re-sync if needed
node scripts/sync_oura_incremental.js --full
```

### Original Full Sync

```bash
# Always clears and re-fetches everything
node scripts/sync_all_oura_variables.js
```

## API Parameters

### Incremental Sync Parameters

```typescript
{
  userId: string,           // Required: User ID
  clearExisting?: boolean,  // Default: false
  startYear?: number,       // Default: 2020
  forceFullSync?: boolean   // Default: false - forces full re-sync
}
```

### Response Data

```typescript
{
  success: boolean,
  data: {
    syncType: 'incremental_sync' | 'full_sync',
    totalUpserted: number,
    dateRangesProcessed: number,
    dateRangesFailed: number,
    totalDateRanges: number,
    existingDatesCount: number,
    missingRanges: Array<{
      type: 'initial_sync' | 'historical_backfill' | 'gap_fill' | 'recent_data',
      start: string,
      end: string
    }>
  }
}
```

## Benefits

### ⚡ Performance

- **Faster syncing**: Only fetches what's needed
- **API efficiency**: Reduces Oura API quota usage
- **Bandwidth savings**: Less data transfer

### 🛡️ Data Integrity

- **No duplicates**: Uses upsert with conflict resolution
- **Gap detection**: Finds and fills missing data
- **Preserve existing**: Doesn't delete your historical data

### 🔄 Flexibility

- **Daily sync**: Run daily to get just new data
- **Full re-sync**: Use `forceFullSync = true` when needed
- **Custom ranges**: Can be extended for specific date ranges

## Migration Strategy

### If you have existing data:

1. **Use incremental sync** - it will preserve your data and only fetch missing pieces
2. **No need to clear** existing data unless corrupted

### If you want to start fresh:

1. **Use original sync** with `clearExisting = true`
2. **Or use incremental** with `forceFullSync = true`

## When to Use Which

### Use Incremental Sync When:

- ✅ Running daily/regular syncs
- ✅ You have existing data you want to preserve
- ✅ You want to minimize API usage
- ✅ You just need recent updates

### Use Full Sync When:

- ✅ First time setup
- ✅ Data corruption issues
- ✅ Major schema changes
- ✅ You want to completely rebuild the dataset

## Deployment

### Deploy the new incremental function:

```bash
cd supabase
supabase functions deploy oura-sync-incremental
```

### Test the function:

```bash
node scripts/sync_oura_incremental.js
```

## Monitoring

The incremental sync provides detailed logging about what it's doing:

```
[Oura Sync Incremental] Found 3 missing date ranges to sync
  - historical_backfill: 2020-01-01 to 2023-06-01
  - gap_fill: 2023-08-15 to 2023-08-20
  - recent_data: 2024-01-10 to 2024-01-15
```

This helps you understand exactly what data is being fetched and why.
