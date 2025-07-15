# Display Unit System

This system allows users to set their preferred display unit for each variable and ensures that preference is used consistently throughout the application.

## Database Schema

### user_variable_preferences Table

- Added `display_unit` column (TEXT) to store user's preferred unit
- Migration script: `database/add_display_unit_column.sql`

## Frontend Implementation

### Core Utilities (`src/utils/variableUtils.ts`)

- `getUserDisplayUnit()` - Fetches user's preferred display unit with caching
- `formatVariableWithUserUnit()` - Formats values with user's preferred unit
- `clearDisplayUnitCache()` - Clears cache when preferences are updated

### React Hook (`src/hooks/useUserDisplayUnit.ts`)

- `useUserDisplayUnit()` - React hook for managing display unit preferences
- `useFormattedVariableValue()` - Hook for formatting values with preferred units

### UI Components

- `VariableValueDisplay` - Component that automatically displays values with preferred units
- Unit selector on variable pages for changing preferences
- Cache clearing when preferences are updated

## Usage Examples

### Using the Hook

```typescript
const { displayUnit, loading } = useUserDisplayUnit(variableId, variable);
```

### Using the Component

```tsx
<VariableValueDisplay
  value={logValue}
  variableId={variable.id}
  variable={variable}
  showUnit={true}
/>
```

### Manual Formatting

```typescript
const { formattedValue, unit } = await formatVariableWithUserUnit(
  value,
  userId,
  variableId,
  variable
);
```

## Features

1. **Automatic Preference Loading** - Loads user's preferred display unit when available
2. **Fallback System** - Uses variable's canonical unit if no preference is set
3. **Caching** - Caches preferences to reduce database queries
4. **Cache Invalidation** - Clears cache when preferences are updated
5. **Consistent Display** - All variable values use the same preferred unit throughout the app

## Integration Points

- Variable pages (unit selector dropdown)
- Log displays (manual and auto logs)
- Analytics charts and components
- Variable tables and lists
- Any component displaying variable values with units

The system ensures that once a user sets their preferred unit (e.g., kg instead of lb), all displays of that variable's values will use the preferred unit consistently across the entire application.
