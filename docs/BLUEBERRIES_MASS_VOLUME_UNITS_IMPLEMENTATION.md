# Blueberries Variable: Mass/Volume Units Implementation

## Overview

This implementation adds support for both **mass** and **volume** measurements to the blueberries variable, allowing users to track their blueberry consumption in either:

- **Mass units**: grams (g), kilograms (kg), pounds (lb), ounces (oz), etc.
- **Volume units**: milliliters (mL), liters (L), cups, tablespoons (tbsp), teaspoons (tsp), etc.

## Key Features

### ✅ **Multi-Unit Group Support**

- Variables can now support multiple unit groups (e.g., `["mass", "volume"]`)
- Default unit group prioritization (mass is default for blueberries)
- User preferences override defaults

### ✅ **User Preference System**

- User selections are saved in `user_variable_preferences.display_unit` as JSON
- Preferences take priority over `is_base` units
- Automatic fallback to base units when no preference exists

### ✅ **Smart Unit Selection UI**

- Grouped unit dropdown with clear categorization
- Default group highlighted with badge
- Base units marked for easy identification
- Responsive to user preferences

## Database Changes

### 1. Enhanced `variable_units` Table

```sql
-- New columns added
ALTER TABLE variable_units
ADD COLUMN unit_groups TEXT[] DEFAULT NULL,
ADD COLUMN default_unit_group TEXT DEFAULT NULL;
```

**Purpose:**

- `unit_groups`: Array of supported unit groups (e.g., `["mass", "volume"]`)
- `default_unit_group`: Which group to use by default (`"mass"` for blueberries)

### 2. Volume Units Added

```sql
-- Complete set of volume units
INSERT INTO units (id, label, symbol, unit_group, ...) VALUES
('l', 'Liters', 'L', 'volume', NULL, NULL, true),        -- Base unit
('ml', 'Milliliters', 'mL', 'volume', 'l', 0.001, false),
('cup', 'Cups', 'cup', 'volume', 'l', 0.236588, false),
('tbsp', 'Tablespoons', 'tbsp', 'volume', 'l', 0.0147868, false),
-- ... more volume units
```

### 3. Enhanced Functions

#### `get_variable_units(var_id UUID)`

Returns all available units for a variable across supported unit groups:

```sql
SELECT * FROM get_variable_units('blueberries-variable-id');
-- Returns mass units (g, kg, lb, oz) AND volume units (ml, l, cup, tbsp)
```

#### `get_user_preferred_unit(user_id, variable_id)`

Gets user's preferred unit with fallback logic:

1. User's saved preference in `display_unit` JSON
2. Base unit of default group
3. Any associated unit

#### `set_user_unit_preference(user_id, variable_id, unit_id, unit_group)`

Saves user preference as JSON:

```json
{
  "unit_id": "cup",
  "unit_group": "volume"
}
```

## Frontend Components

### 1. `VariableUnitSelector` Component

**File:** `src/components/VariableUnitSelector.tsx`

**Features:**

- Fetches available units via `get_variable_units()` RPC
- Groups units by type (Mass/Volume) with visual separation
- Highlights default group with badge
- Saves preferences automatically
- Fallback handling for loading/error states

**Props:**

```typescript
interface VariableUnitSelectorProps {
  variableId: string;
  userId: string;
  currentUnit?: string;
  onUnitChange: (unitId: string, unitGroup: string) => void;
  disabled?: boolean;
  label?: string;
  size?: "small" | "medium";
}
```

### 2. `VariablePageUnitSection` Component

**File:** `src/components/VariablePageUnitSection.tsx`

**Features:**

- Complete unit management section for variable pages
- Shows current preference with chips
- Multi-unit support notification
- Integrates seamlessly with existing variable page layout

## Priority System

The system follows this priority order for unit selection:

1. **User Preference** (highest priority)

   - Stored in `user_variable_preferences.display_unit`
   - JSON format: `{"unit_id": "cup", "unit_group": "volume"}`

2. **Default Group Base Unit**

   - Uses `variable_units.default_unit_group` to find group
   - Selects `is_base = true` unit from that group
   - For blueberries: `kg` (mass group base unit)

3. **Any Associated Unit** (fallback)
   - Uses `variable_units.unit_id` if nothing else available

## Usage Examples

### For Blueberries Variable

#### Database Configuration:

```sql
-- Blueberries supports both mass and volume, defaults to mass
INSERT INTO variable_units (variable_id, unit_id, unit_groups, default_unit_group)
VALUES (
  'blueberries-uuid',
  'kg',                          -- Default unit
  ARRAY['mass', 'volume'],       -- Supported groups
  'mass'                         -- Default group
);
```

#### User Preferences:

```sql
-- User prefers to measure blueberries in cups
SELECT set_user_unit_preference(
  'user-uuid',
  'blueberries-uuid',
  'cup',
  'volume'
);
```

#### Frontend Integration:

```tsx
// In variable page
<VariableUnitSelector
  variableId="blueberries-uuid"
  userId="user-uuid"
  onUnitChange={(unitId, unitGroup) => {
    console.log(`User selected: ${unitId} (${unitGroup})`);
  }}
/>
```

## Unit Conversion Support

The existing `convert_unit()` function supports conversions within unit groups:

```sql
-- Convert 1 cup to milliliters
SELECT convert_unit(1, 'cup', 'ml'); -- Returns ~236.588

-- Convert 100g to ounces
SELECT convert_unit(100, 'g', 'oz'); -- Returns ~3.527
```

**Note:** Cross-group conversions (mass ↔ volume) are not supported as they require density information.

## Testing

### SQL Testing:

```sql
-- 1. Run the migration script
\i database/update_blueberries_variable_with_mass_volume_units.sql

-- 2. Test unit selection
SELECT * FROM get_variable_units(
  (SELECT id FROM variables WHERE slug = 'blueberries')
);

-- 3. Test user preferences
SELECT set_user_unit_preference(
  'your-user-id',
  (SELECT id FROM variables WHERE slug = 'blueberries'),
  'cup',
  'volume'
);
```

### Frontend Testing:

1. Navigate to `/variable/blueberries`
2. Look for the new unit selector
3. Try switching between mass and volume units
4. Verify preferences are saved and restored

## Migration Path

### For Existing Variables:

```sql
-- Add mass/volume support to any food variable
UPDATE variable_units
SET
  unit_groups = ARRAY['mass', 'volume'],
  default_unit_group = 'mass'
WHERE variable_id = (SELECT id FROM variables WHERE slug = 'your-food-variable');
```

### For New Variables:

```sql
-- Create variable with multi-unit support from start
INSERT INTO variable_units (variable_id, unit_id, unit_groups, default_unit_group)
VALUES (
  'new-variable-uuid',
  'kg',                          -- Default unit
  ARRAY['mass', 'volume'],       -- Multiple groups
  'mass'                         -- Default group
);
```

## Benefits

1. **Flexibility**: Users can choose their preferred measurement method
2. **Accuracy**: More precise tracking based on user's measurement tools
3. **Usability**: Familiar units for different cooking/eating contexts
4. **Scalability**: System can be extended to other food variables
5. **Consistency**: Maintains existing unit conversion capabilities

## Files Changed

### Database:

- `database/update_blueberries_variable_with_mass_volume_units.sql` - Main migration script
- `database/fix_units_rls_policies.sql` - Fixed RLS policies for units table

### Frontend:

- `src/components/VariableUnitSelector.tsx` - New unit selection component
- `src/components/VariablePageUnitSection.tsx` - Variable page integration component

### Documentation:

- `docs/BLUEBERRIES_MASS_VOLUME_UNITS_IMPLEMENTATION.md` - This file
- `docs/UNITS_TABLE_RLS_EXPLANATION.md` - RLS policy explanation

The implementation provides a robust foundation for multi-unit variable support while maintaining backward compatibility and user preference persistence.
