# Universal Variables System

## Overview

The Universal Variables System is a comprehensive data architecture that provides a unified, type-safe, and analytics-ready foundation for all variable tracking in the self-experimentation application. It replaces the previous fragmented approach with a single, extensible system that supports unit conversion, validation, privacy controls, and advanced analytics.

## 🎯 Key Benefits

### 1. **Data Consistency**

- **Canonical Storage**: All values stored in standardized units (kg, hours, °C, etc.)
- **Automatic Conversion**: Seamless unit conversion for display and analysis
- **Type Safety**: Strong TypeScript interfaces prevent data inconsistencies

### 2. **Analytics Ready**

- **Correlation Analysis**: Built-in support for variable relationships
- **Trend Detection**: Automatic pattern recognition across variables
- **Statistical Insights**: Pre-calculated metrics and confidence scores

### 3. **User Experience**

- **Personalized Units**: Users can set preferred display units (kg/lb, °C/°F)
- **Smart Validation**: Real-time validation with helpful error messages
- **Flexible Input**: Support for multiple input types (sliders, toggles, text)

### 4. **Privacy & Sharing**

- **Granular Control**: Per-variable and per-log privacy settings
- **Community Features**: Safe sharing with anonymization options
- **Data Export**: Privacy-respecting data export capabilities

## 🏗️ Architecture

### Core Tables

#### `variables`

The central definition table for all variables in the system.

```sql
CREATE TABLE variables (
    id UUID PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,           -- Internal identifier
    label TEXT NOT NULL,                 -- Human-readable name
    data_type TEXT NOT NULL,             -- continuous, categorical, boolean, time, text
    canonical_unit TEXT,                 -- Base unit for storage
    unit_group TEXT,                     -- Group for conversion
    convertible_units JSONB,             -- Available units
    validation_rules JSONB,              -- Flexible validation schema
    source_type TEXT,                    -- manual, withings, oura, etc.
    category TEXT,                       -- Primary categorization
    subcategory TEXT,                    -- Secondary categorization
    tags TEXT[],                         -- Flexible tagging
    is_active BOOLEAN DEFAULT true
);
```

#### `variable_logs`

Universal log table for all variable data.

```sql
CREATE TABLE variable_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    variable_id UUID REFERENCES variables(id),
    canonical_value NUMERIC,             -- Stored in canonical unit
    display_value TEXT,                  -- Human-readable value
    display_unit TEXT,                   -- Unit used for display
    logged_at TIMESTAMP WITH TIME ZONE,
    source TEXT,                         -- How data was collected
    confidence_score NUMERIC DEFAULT 1.0,
    notes TEXT,
    tags TEXT[],
    context JSONB,                       -- Additional context
    is_private BOOLEAN DEFAULT false
);
```

#### `user_variable_preferences`

User-specific settings for each variable.

```sql
CREATE TABLE user_variable_preferences (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    variable_id UUID REFERENCES variables(id),
    preferred_unit TEXT,                 -- User's preferred display unit
    display_name TEXT,                   -- Custom name for this user
    is_tracked BOOLEAN DEFAULT true,     -- Whether user wants to track
    is_shared BOOLEAN DEFAULT false,     -- Whether this variable is shared
    share_level TEXT DEFAULT 'private',  -- private, friends, public
    display_order INTEGER DEFAULT 0,     -- Custom ordering
    is_favorite BOOLEAN DEFAULT false    -- Quick access flag
);
```

### Unit Conversion System

The system includes a comprehensive unit conversion system:

```sql
CREATE TABLE unit_conversions (
    id UUID PRIMARY KEY,
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL,
    conversion_factor NUMERIC NOT NULL,
    offset NUMERIC DEFAULT 0,
    formula TEXT,                        -- For complex conversions
    unit_group TEXT NOT NULL
);
```

**Supported Unit Groups:**

- **Mass**: kg ↔ lb ↔ g ↔ oz
- **Distance**: km ↔ mi ↔ m ↔ ft ↔ cm ↔ in
- **Time**: hours ↔ minutes ↔ seconds
- **Temperature**: °C ↔ °F (with formula)

## 📊 Data Types & Validation

### Continuous Variables

- **Numbers with units**: Weight (kg/lb), Distance (km/mi), Temperature (°C/°F)
- **Scores**: Mood (1-10), Stress (1-10), Sleep Quality (1-10)
- **Validation**: Min/max ranges, unit constraints

### Categorical Variables

- **Dropdowns**: Exercise Type, Medication, Weather
- **Validation**: Must match predefined options

### Boolean Variables

- **Yes/No**: Nicotine use, Cannabis use, Medication taken
- **Validation**: Accepts yes/no, true/false, 1/0, y/n

### Time Variables

- **Time of day**: Sleep time, Wake time, Exercise time
- **Validation**: HH:MM format (24-hour)

### Text Variables

- **Free text**: Notes, Symptoms, Exercise description
- **Validation**: Length limits, optional patterns

## 🔧 Usage Examples

### Creating a Variable

```typescript
import { createVariable } from "@/utils/variableUtils";

const weightVariable = await createVariable(
  {
    slug: "weight",
    label: "Weight",
    description: "Body weight measurement",
    data_type: "continuous",
    canonical_unit: "kg",
    unit_group: "mass",
    convertible_units: ["kg", "lb", "g"],
    source_type: "manual",
    category: "Physical Health",
    subcategory: "Body Metrics",
    validation_rules: {
      min: 20,
      max: 300,
      unit: "kg",
      required: true,
    },
  },
  userId
);
```

### Logging a Value

```typescript
import { createVariableLog } from "@/utils/variableUtils";

const log = await createVariableLog(
  {
    variable_id: weightVariable.id,
    display_value: "150",
    display_unit: "lb",
    notes: "Morning weight after breakfast",
    tags: ["morning", "post-meal"],
  },
  userId
);
```

### Unit Conversion

```typescript
import { convertUnit } from "@/utils/variableUtils";

// Convert 150 lb to kg
const kgValue = await convertUnit(150, "lb", "kg");
// Result: 68.0389 kg

// Convert 25 °C to °F
const fahrenheitValue = await convertUnit(25, "°C", "°F");
// Result: 77 °F
```

### Display with User Preferences

```typescript
import { formatVariableValue } from "@/utils/variableUtils";

const displayData = await formatVariableValue(
  weightVariable,
  "68.0389",
  "kg",
  userId
);

// If user prefers pounds, automatically converts and displays in lb
console.log(`${displayData.value} ${displayData.unit}`);
// Output: "150 lb" (if user prefers pounds)
```

## 🚀 Migration from Daily Logs

The system includes a comprehensive migration script that:

1. **Preserves all existing data**
2. **Creates variables from existing labels**
3. **Migrates all logs to the new system**
4. **Sets up user preferences**
5. **Maintains backward compatibility**

### Running Migration

```bash
# Preview migration (dry run)
node scripts/migrate_to_universal_variables.js --dry-run

# Run actual migration
node scripts/migrate_to_universal_variables.js
```

### Migration Safety Features

- **Automatic backups** before migration
- **Data validation** to ensure integrity
- **Rollback capability** if issues arise
- **Incremental migration** for large datasets
- **Progress tracking** and error reporting

## 📈 Analytics Capabilities

### Correlation Analysis

```typescript
import { getVariableCorrelations } from "@/utils/variableUtils";

const correlations = await getVariableCorrelations("weight", userId, {
  startDate: "2024-01-01",
  endDate: "2024-12-31",
});

// Returns correlation data with other variables
// Example: { sleep_duration: 0.3, stress: -0.2, mood: 0.1 }
```

### Trend Detection

```typescript
import { getVariableTrends } from "@/utils/variableUtils";

const trends = await getVariableTrends("weight", userId, {
  period: "30d",
  granularity: "daily",
});

// Returns trend data with direction, change percentage, confidence
```

### Statistical Insights

```typescript
import { getVariableInsights } from "@/utils/variableUtils";

const insights = await getVariableInsights("weight", userId, {
  includePatterns: true,
  includeAnomalies: true,
});

// Returns insights like:
// - "Weight tends to be higher on weekends"
// - "Unusual weight drop detected on 2024-03-15"
// - "Strong correlation with sleep duration"
```

## 🔒 Privacy & Sharing

### Variable-Level Privacy

```typescript
import { updateUserVariablePreference } from "@/utils/variableUtils";

await updateUserVariablePreference(userId, variableId, {
  is_shared: true,
  share_level: "friends", // private, friends, public
});
```

### Log-Level Privacy

```typescript
import { createVariableLog } from "@/utils/variableUtils";

await createVariableLog(
  {
    variable_id: variableId,
    display_value: "150",
    is_private: true, // Hide this specific log
  },
  userId
);
```

### Community Sharing

```typescript
import { getSharedVariables } from "@/utils/variableUtils";

const sharedVars = await getSharedVariables(targetUserId, viewerUserId);
// Returns only variables and logs that should be visible
// Respects all privacy settings
```

## 🎨 UI Components

### Variable Input Component

```typescript
import { VariableInput } from "@/components/VariableInput";

<VariableInput
  variable={weightVariable}
  userPreferences={userPrefs}
  onValueChange={(value, unit) => {
    // Handle value changes with automatic validation
  }}
  onUnitChange={(unit) => {
    // Handle unit preference changes
  }}
/>;
```

### Variable Display Component

```typescript
import { VariableDisplay } from "@/components/VariableDisplay";

<VariableDisplay
  variable={weightVariable}
  value={68.0389}
  unit="kg"
  userPreferences={userPrefs}
  showTrend={true}
  showCorrelations={true}
/>;
```

### Variable Management Component

```typescript
import { VariableManager } from "@/components/VariableManager";

<VariableManager
  userId={userId}
  onVariableCreate={(variable) => {
    // Handle new variable creation
  }}
  onVariableUpdate={(variable) => {
    // Handle variable updates
  }}
  onPreferenceUpdate={(preferences) => {
    // Handle preference changes
  }}
/>;
```

## 🔧 Configuration

### Environment Variables

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Features
ENABLE_UNIT_CONVERSION=true
ENABLE_ANALYTICS=true
ENABLE_PRIVACY_CONTROLS=true
```

### Feature Flags

```typescript
// Enable/disable features
const FEATURES = {
  UNIT_CONVERSION: process.env.ENABLE_UNIT_CONVERSION === "true",
  ANALYTICS: process.env.ENABLE_ANALYTICS === "true",
  PRIVACY_CONTROLS: process.env.ENABLE_PRIVACY_CONTROLS === "true",
  COMMUNITY_SHARING: process.env.ENABLE_COMMUNITY_SHARING === "true",
};
```

## 🧪 Testing

### Unit Tests

```bash
# Run variable system tests
npm test src/test/variables.test.ts

# Run migration tests
npm test src/test/migration.test.ts

# Run integration tests
npm test src/test/integration.test.ts
```

### Performance Tests

```bash
# Test unit conversion performance
npm run test:performance

# Test database query performance
npm run test:db-performance
```

## 📚 API Reference

### Core Functions

- `createVariable(request, userId)` - Create new variable
- `updateVariable(request)` - Update existing variable
- `getVariable(id)` - Get variable by ID
- `searchVariables(request, userId)` - Search variables with filters

### Logging Functions

- `createVariableLog(request, userId)` - Create new log
- `getVariableLogs(variableId, userId, options)` - Get logs for variable
- `updateVariableLog(request)` - Update existing log
- `deleteVariableLog(id, userId)` - Delete log

### Utility Functions

- `convertUnit(value, fromUnit, toUnit)` - Convert between units
- `validateVariableValue(value, variable, context)` - Validate value
- `formatVariableValue(variable, value, unit, userId)` - Format for display
- `getUserPreferredUnit(userId, variableId)` - Get user's preferred unit

### Analytics Functions

- `getVariableCorrelations(variableId, userId, options)` - Get correlations
- `getVariableTrends(variableId, userId, options)` - Get trends
- `getVariableInsights(variableId, userId, options)` - Get insights

## 🚀 Future Enhancements

### Planned Features

1. **Machine Learning Integration**

   - Predictive analytics
   - Anomaly detection
   - Personalized insights

2. **Advanced Unit Conversion**

   - More unit groups (pressure, volume, etc.)
   - Custom conversion formulas
   - Unit preference learning

3. **Enhanced Analytics**

   - Cross-variable analysis
   - Seasonal pattern detection
   - Goal tracking and progress

4. **Community Features**

   - Variable sharing templates
   - Community benchmarks
   - Collaborative experiments

5. **Mobile Optimization**
   - Offline data collection
   - Sync capabilities
   - Mobile-specific UI components

### API Extensions

- GraphQL support for complex queries
- WebSocket real-time updates
- Bulk import/export capabilities
- Advanced filtering and search

## 🤝 Contributing

### Development Setup

```bash
# Install dependencies
npm install

# Set up database
npm run db:setup

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Husky for pre-commit hooks

### Testing Strategy

- Unit tests for all utilities
- Integration tests for database operations
- E2E tests for critical user flows
- Performance tests for scalability

## 📄 License

This system is part of the self-experimentation application and follows the same licensing terms as the main project.

---

**The Universal Variables System provides a robust, scalable foundation for all variable tracking needs while maintaining simplicity for developers and users alike.**
