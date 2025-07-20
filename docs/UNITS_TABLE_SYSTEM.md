# Units Table System

## Overview

The Units Table System provides a centralized, database-driven approach to managing units of measurement across the application. This system replaces hardcoded unit definitions with a flexible, extensible database table that supports unit conversions, validation, and dynamic unit selection.

## 🎯 Key Benefits

### 1. **Centralized Unit Management**

- All units defined in a single database table
- Consistent unit definitions across the application
- Easy to add new units without code changes

### 2. **Foreign Key Relationships**

- Variables table references units table via foreign keys
- Data integrity enforced at the database level
- Automatic validation of unit references

### 3. **Flexible Unit Conversions**

- Built-in conversion factors for standard units
- Special handling for complex conversions (temperature)
- Support for formula-based conversions

### 4. **Dynamic Unit Selection**

- Frontend can fetch available units from the database
- Unit groups for organized unit selection
- Base units for canonical storage

## 🏗️ Database Schema

### Units Table

```sql
CREATE TABLE units (
    id TEXT PRIMARY KEY,                    -- Unit identifier (e.g., "kg", "lb", "°C")
    label TEXT NOT NULL,                    -- Human-readable label (e.g., "Kilograms")
    symbol TEXT NOT NULL,                   -- Symbol for display (e.g., "kg")
    unit_group TEXT NOT NULL,               -- Group for conversion (e.g., "mass")
    conversion_to TEXT,                     -- What unit this converts to
    conversion_factor NUMERIC,              -- Conversion factor to target unit
    is_base BOOLEAN DEFAULT false,          -- Whether this is the base unit
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Variables Table Updates

The variables table now references the units table:

```sql
-- Foreign key constraints
ALTER TABLE variables
ADD CONSTRAINT fk_variables_canonical_unit
FOREIGN KEY (canonical_unit) REFERENCES units(id);

ALTER TABLE variables
ADD CONSTRAINT fk_variables_default_display_unit
FOREIGN KEY (default_display_unit) REFERENCES units(id);
```

## 📊 Supported Unit Groups

### Mass Units

- **Base Unit**: kg (Kilograms)
- **Available Units**: kg, lb, g, oz, mg, mcg
- **Conversion**: Linear factors (e.g., 1 lb = 0.453592 kg)

### Distance Units

- **Base Unit**: m (Meters)
- **Available Units**: m, km, mi, ft, cm, in
- **Conversion**: Linear factors (e.g., 1 mi = 1609.34 m)

### Time Units

- **Base Unit**: hours
- **Available Units**: hours, minutes, seconds, days, weeks, months
- **Conversion**: Linear factors (e.g., 1 day = 24 hours)

### Temperature Units

- **Base Unit**: °C (Celsius)
- **Available Units**: °C, °F, K
- **Conversion**: Formula-based (e.g., °F = (°C × 9/5) + 32)

### Volume Units

- **Base Unit**: L (Liters)
- **Available Units**: L, ml, cups, fl oz, gal, pt
- **Conversion**: Linear factors (e.g., 1 gal = 3.78541 L)

### Speed Units

- **Base Unit**: m/s (Meters per Second)
- **Available Units**: m/s, mph, km/h, knots
- **Conversion**: Linear factors (e.g., 1 mph = 0.44704 m/s)

### Pressure Units

- **Base Unit**: mmHg (Millimeters of Mercury)
- **Available Units**: mmHg, kPa, psi, bar
- **Conversion**: Linear factors (e.g., 1 kPa = 7.50062 mmHg)

### Frequency Units

- **Base Unit**: per day
- **Available Units**: per day, per week, per month, per year, times, Hz
- **Conversion**: Linear factors (e.g., 1 per week = 0.142857 per day)

### Percentage Units

- **Base Unit**: %
- **Available Units**: %
- **Conversion**: No conversion needed

### Boolean Units

- **Base Unit**: true/false
- **Available Units**: true/false, yes/no, 0/1
- **Conversion**: 1:1 mapping

### Score Units

- **Base Unit**: 1-10
- **Available Units**: 1-10, 1-5, 0-100
- **Conversion**: Linear scaling (e.g., 1-5 scale = 2× 1-10 scale)

## 🔧 API Endpoints

### Get All Units

```http
GET /api/units
```

**Response:**

```json
[
  {
    "id": "kg",
    "label": "Kilograms",
    "symbol": "kg",
    "unit_group": "mass",
    "conversion_to": null,
    "conversion_factor": null,
    "is_base": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

## 🛠️ Frontend Integration

### TypeScript Interfaces

```typescript
export interface Unit {
  id: string;
  label: string;
  symbol: string;
  unit_group: string;
  conversion_to?: string;
  conversion_factor?: number;
  is_base: boolean;
  created_at: string;
  updated_at: string;
}
```

### Utility Functions

The `src/utils/unitsTableUtils.ts` file provides utilities for working with the units table:

- `fetchUnits()` - Get all units from the database
- `getUnitsByGroup(groupName)` - Get units for a specific group
- `getBaseUnit(groupName)` - Get the base unit for a group
- `convertUnit(value, fromUnitId, toUnitId)` - Convert between units
- `getConvertibleUnits(unitId)` - Get all convertible units for a given unit

### Example Usage

```typescript
import {
  fetchUnits,
  convertUnit,
  getUnitsByGroup,
} from "../utils/unitsTableUtils";

// Get all mass units
const massUnits = await getUnitsByGroup("mass");

// Convert 70 kg to pounds
const pounds = await convertUnit(70, "kg", "lb");

// Get all available units
const allUnits = await fetchUnits();
```

## 🔄 Migration from Old System

### Database Migration

1. **Create Units Table**: Run `database/create_units_table.sql`
2. **Update Variables Table**: Run `database/update_variables_to_reference_units.sql`
3. **Verify Setup**: Use the verification queries in the migration script

### Code Migration

1. **Update Imports**: Replace `unitGroupUtils` with `unitsTableUtils`
2. **Update API Calls**: Use the new `/api/units` endpoint
3. **Update Type Definitions**: Use the new `Unit` interface
4. **Test Unit Conversions**: Verify all conversions work correctly

### Migration Script

Run the setup script to automate the migration:

```bash
node scripts/setup_units_table.js
```

## 🧪 Testing

### Unit Tests

```typescript
import { convertUnit, getUnitsByGroup } from "../utils/unitsTableUtils";

describe("Units Table Utils", () => {
  test("converts kg to lb correctly", async () => {
    const result = await convertUnit(1, "kg", "lb");
    expect(result).toBeCloseTo(2.20462, 5);
  });

  test("gets mass units", async () => {
    const massUnits = await getUnitsByGroup("mass");
    expect(massUnits).toHaveLength(6); // kg, lb, g, oz, mg, mcg
  });
});
```

### Integration Tests

```typescript
describe("Units API", () => {
  test("returns all units", async () => {
    const response = await fetch("/api/units");
    const units = await response.json();
    expect(units.length).toBeGreaterThan(0);
  });
});
```

## 📈 Performance Considerations

### Caching

The frontend utilities include caching to minimize API calls:

- Units data is cached for 5 minutes
- Cache is automatically invalidated when data changes
- Manual cache clearing available for testing

### Database Indexes

Performance indexes are created automatically:

```sql
CREATE INDEX idx_units_unit_group ON units(unit_group);
CREATE INDEX idx_units_is_base ON units(is_base);
CREATE INDEX idx_variables_canonical_unit ON variables(canonical_unit);
CREATE INDEX idx_variables_default_display_unit ON variables(default_display_unit);
```

## 🔮 Future Enhancements

### Planned Features

1. **Custom Units**: Allow users to define custom units
2. **Unit Preferences**: User-specific unit preferences
3. **Advanced Conversions**: Support for more complex conversion formulas
4. **Unit Validation**: Real-time validation of unit combinations
5. **Unit History**: Track changes to unit definitions

### Extension Points

The system is designed to be easily extensible:

- Add new unit groups by inserting into the units table
- Add new conversion formulas in the `convert_unit` function
- Extend the Unit interface for additional properties
- Add new API endpoints for unit management

## 🐛 Troubleshooting

### Common Issues

1. **Foreign Key Violations**: Ensure all unit references exist in the units table
2. **Conversion Errors**: Check that units are in the same group
3. **Cache Issues**: Clear the units cache if data seems stale
4. **API Errors**: Verify the units table exists and is accessible

### Debug Queries

```sql
-- Check for invalid unit references
SELECT v.slug, v.canonical_unit
FROM variables v
WHERE v.canonical_unit NOT IN (SELECT id FROM units);

-- Check unit group consistency
SELECT v.slug, v.unit_group, u.unit_group as actual_group
FROM variables v
JOIN units u ON v.canonical_unit = u.id
WHERE v.unit_group != u.unit_group;
```

## 📚 Related Documentation

- [Universal Variables System](./UNIVERSAL_VARIABLES_SYSTEM.md)
- [Simplified Database Schema](./SIMPLIFIED_DATABASE.md)
- [Variable Constraints](./VARIABLE_CONSTRAINTS.md)
