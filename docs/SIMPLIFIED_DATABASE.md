# Simplified Database Schema

## Overview

The database has been simplified to only include tables and columns that are actually used in the application. This reduces complexity, improves performance, and makes the codebase easier to maintain.

## What Was Removed

### Tables Removed

- `user_variable_preferences` - User preferences were not being used consistently
- `unit_conversions` - Unit conversion system was overly complex for current needs
- `variable_relationships` - Analytics features not yet implemented
- `routine_log_history` - Redundant with variable_logs table
- `log_privacy_settings` - Privacy system simplified to use is_private flag
- `user_follows` - Social features not yet implemented
- `user_profile_settings` - Profile settings not yet implemented

### Columns Removed from `variable_logs`

- `canonical_value` - Not being used in the app
- `confidence_score` - Data quality scoring not implemented
- `tags` - Tagging system not used
- `location` - GPS tracking not implemented

### Columns Removed from `variables`

- `collection_method` - Not being used
- `frequency` - Not being used
- `subcategory` - Simplified to just category
- `tags` - Tagging system not used
- `is_public` - Simplified privacy system
- `privacy_level` - Simplified privacy system

## Current Schema

### Core Tables

#### `variables`

```sql
CREATE TABLE variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    data_type TEXT NOT NULL,
    validation_rules JSONB,
    canonical_unit TEXT,
    unit_group TEXT,
    convertible_units JSONB,
    default_display_unit TEXT,
    source_type TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);
```

#### `variable_logs`

```sql
CREATE TABLE variable_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    display_value TEXT,
    display_unit TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT,
    notes TEXT,
    context JSONB,
    is_private BOOLEAN DEFAULT false
);
```

#### `daily_routines`

```sql
CREATE TABLE daily_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_name TEXT NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    weekdays INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_auto_logged TIMESTAMP WITH TIME ZONE
);
```

#### `routine_times`

```sql
CREATE TABLE routine_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE,
    time_of_day TIME NOT NULL,
    time_name TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `routine_time_variables`

```sql
CREATE TABLE routine_time_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_time_id UUID REFERENCES routine_times(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    default_value TEXT NOT NULL,
    default_unit TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `variable_sharing_settings`

```sql
CREATE TABLE variable_sharing_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_name TEXT NOT NULL,
    is_shared BOOLEAN DEFAULT false,
    variable_type TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Migration

To apply the simplified schema:

1. Run the simplification script:

   ```bash
   node scripts/simplify_database.js
   ```

2. The script will:
   - Remove unused columns from existing tables
   - Drop unused tables
   - Remove unused indexes
   - Update constraints
   - Clean up orphaned data

## Benefits

1. **Reduced Complexity**: Fewer tables and columns to understand and maintain
2. **Better Performance**: Fewer indexes and simpler queries
3. **Easier Development**: Clearer data model that matches actual usage
4. **Faster Migrations**: Simpler schema changes
5. **Reduced Storage**: Less data to store and backup

## Future Considerations

If you need to add back any features in the future:

- **Unit Conversions**: Can be added back as a separate table when needed
- **User Preferences**: Can be added as a simple JSONB column in variables
- **Analytics**: Can be implemented as separate tables when the features are ready
- **Social Features**: Can be added as new tables when implementing sharing

## Data Integrity

The simplified schema maintains all necessary relationships and constraints:

- Foreign key relationships are preserved
- Row Level Security (RLS) policies are maintained
- Unique constraints are kept where needed
- Check constraints are simplified but still effective

## Testing

After applying the simplified schema, test:

1. Variable creation and editing
2. Log creation and management
3. Routine creation and management
4. Data retrieval and display
5. Privacy settings functionality

The simplified schema should work seamlessly with the existing application code.
