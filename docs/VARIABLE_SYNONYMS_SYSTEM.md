# Variable Synonyms System

## Overview

The Variable Synonyms System allows multiple labels/names to point to the same variable, making it easier for users to find variables using their preferred terminology. This system enhances searchability and user experience by supporting natural language variations and user-specific naming conventions.

## 🎯 Key Benefits

### 1. **Improved Searchability**

- Users can find variables using different terms (e.g., "Body Weight" → "Weight")
- Supports natural language variations and colloquial terms
- Reduces frustration when users can't find variables with their preferred names

### 2. **Flexible Naming**

- Multiple ways to refer to the same variable
- Support for different languages and regional variations
- User-specific customizations

### 3. **Better User Experience**

- Intuitive variable discovery
- Reduced cognitive load when searching
- Consistent variable pages regardless of search term used

## 🏗️ Database Schema

### Core Tables

#### `variables` (Updated)

```sql
-- New columns added to existing variables table
ALTER TABLE variables
ADD COLUMN primary_label TEXT NOT NULL DEFAULT '', -- The main/canonical label
ADD COLUMN search_labels TEXT[] DEFAULT '{}', -- Array of all searchable labels
ADD COLUMN synonym_count INTEGER DEFAULT 0; -- Count of synonyms
```

#### `variable_synonyms`

```sql
CREATE TABLE variable_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    synonym_label TEXT NOT NULL, -- The synonym text
    synonym_type TEXT DEFAULT 'user' CHECK (synonym_type IN ('system', 'user', 'common')),
    language TEXT DEFAULT 'en', -- Language code
    is_primary BOOLEAN DEFAULT false, -- Whether this is the primary label
    search_weight INTEGER DEFAULT 1, -- Higher weight = higher priority in search
    created_by UUID REFERENCES auth.users(id), -- Who created this synonym
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(variable_id, synonym_label, language)
);
```

#### `variable_search_index`

```sql
CREATE TABLE variable_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    search_text TEXT NOT NULL, -- Normalized search text
    search_type TEXT DEFAULT 'label' CHECK (search_type IN ('label', 'description', 'synonym', 'tag')),
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(variable_id, search_text, search_type, language)
);
```

## 🔍 Search Functionality

### Search Methods

#### 1. **Comprehensive Search with Synonyms**

```typescript
import { searchVariablesWithSynonyms } from "@/utils/variableSearchUtils";

const results = await searchVariablesWithSynonyms("body weight", {
  includeSynonyms: true,
  includeDescriptions: true,
  limit: 50,
});
```

#### 2. **Fast Index-Based Search**

```typescript
import { searchVariablesUsingIndex } from "@/utils/variableSearchUtils";

const results = await searchVariablesUsingIndex("weight", {
  limit: 50,
});
```

#### 3. **Get Variable by Any Label**

```typescript
import { getVariableByAnyLabel } from "@/utils/variableSearchUtils";

const variable = await getVariableByAnyLabel("Body Weight");
// Returns the "weight" variable regardless of which synonym was used
```

### Search Result Scoring

Results are scored based on match type and relevance:

- **Exact Label Match**: 100 points
- **Primary Label Match**: 95 points
- **Synonym Match**: 80 points (weighted by search_weight)
- **Description Match**: 40 points
- **Tag Match**: 30 points

## 🛠️ Synonym Management

### Adding Synonyms

#### Programmatically

```typescript
import { addVariableSynonym } from "@/utils/variableSearchUtils";

const result = await addVariableSynonym(variableId, "Body Weight", {
  synonymType: "system",
  searchWeight: 8,
  userId: user.id,
});
```

#### Via UI Component

```typescript
import VariableSynonymsManager from "@/components/VariableSynonymsManager";

<VariableSynonymsManager
  variable={variable}
  open={open}
  onClose={handleClose}
  onSynonymsUpdated={handleSynonymsUpdated}
/>;
```

### Synonym Types

1. **System Synonyms** (`system`)

   - Pre-defined by the application
   - Cannot be deleted by users
   - High search weight (8-10)

2. **Common Synonyms** (`common`)

   - Widely recognized terms
   - Can be managed by admins
   - Medium search weight (5-7)

3. **User Synonyms** (`user`)
   - Personal customizations
   - Can be edited/deleted by the creator
   - Lower search weight (1-4)

### Search Weight System

- **10**: Primary labels and exact matches
- **8-9**: System synonyms
- **5-7**: Common synonyms
- **1-4**: User synonyms

## 📱 User Interface Integration

### Variable Page Routing

The variable page now supports accessing variables by any synonym:

```
/variable/weight          → Weight variable page
/variable/body-weight     → Same Weight variable page
/variable/mass           → Same Weight variable page
```

### Search Components

Updated search components automatically include synonyms:

```typescript
// In Autocomplete components
filterOptions={(options, { inputValue }) => {
  // Now searches through synonyms automatically
  return options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
    option.search_labels?.some(label =>
      label.toLowerCase().includes(inputValue.toLowerCase())
    )
  );
}}
```

### Synonym Management UI

Users can manage synonyms through the `VariableSynonymsManager` component:

- Add new synonyms
- Edit existing user synonyms
- Remove user synonyms
- View all synonyms for a variable

## 🚀 Setup and Migration

### 1. Run Database Migration

Execute the SQL migration script:

```bash
# In Supabase SQL Editor
\i database/variable_synonyms_schema.sql
```

### 2. Add Initial Synonyms

Run the setup script to add common synonyms:

```bash
node scripts/setup_variable_synonyms.js
```

### 3. Update Existing Code

The system is backward compatible, but you can enhance existing search functionality:

```typescript
// Old way (still works)
const variables = await searchVariables("weight");

// New way (with synonym support)
const results = await searchVariablesWithSynonyms("body weight");
const variables = results.map((r) => r.variable);
```

## 📊 Example Use Cases

### 1. **Weight Tracking**

- Variable: `weight`
- Synonyms: "Body Weight", "Mass", "Scale Weight", "Body Mass"
- Users can search for any of these terms and find the same variable

### 2. **Sleep Tracking**

- Variable: `sleep_duration`
- Synonyms: "Sleep Time", "Hours of Sleep", "Sleep Hours", "Total Sleep"
- Supports different ways users think about sleep duration

### 3. **Mood Tracking**

- Variable: `mood`
- Synonyms: "Happiness", "Emotional State", "Feeling", "Mental State"
- Accommodates different emotional vocabulary

### 4. **Exercise Tracking**

- Variable: `exercise_duration`
- Synonyms: "Workout Time", "Exercise Time", "Training Duration", "Activity Time"
- Supports various fitness terminology

## 🔧 Advanced Features

### Multi-language Support

Synonyms can be language-specific:

```typescript
await addVariableSynonym(variableId, "Peso", {
  language: "es",
  synonymType: "system",
  searchWeight: 8,
});
```

### Automatic Search Index Updates

The system automatically maintains search indexes when synonyms are added/removed through database triggers.

### Performance Optimization

- Full-text search indexes for fast queries
- Cached search results
- Optimized database queries with proper indexing

## 🧪 Testing

### Test Synonym Search

```typescript
// Test that synonyms work
const weightVariable = await getVariableByAnyLabel("Body Weight");
console.log(weightVariable.slug); // Should be 'weight'

// Test search with synonyms
const results = await searchVariablesWithSynonyms("mass");
console.log(results.some((r) => r.variable.slug === "weight")); // Should be true
```

### Test Synonym Management

```typescript
// Test adding synonyms
const result = await addVariableSynonym(variableId, "Test Synonym");
console.log(result.success); // Should be true

// Test getting synonyms
const synonyms = await getVariableSynonyms(variableId);
console.log(synonyms.length); // Should be > 0
```

## 🚨 Important Notes

### 1. **Backward Compatibility**

- All existing code continues to work
- Variable slugs remain unchanged
- Existing search functionality is enhanced, not replaced

### 2. **Performance Considerations**

- Search indexes are automatically maintained
- Large numbers of synonyms may impact search performance
- Consider pagination for large result sets

### 3. **Data Integrity**

- Synonyms are validated before insertion
- Duplicate synonyms are prevented
- Cascade deletion ensures data consistency

### 4. **User Permissions**

- Users can only manage their own synonyms
- System synonyms are protected
- Admins can manage all synonym types

## 🔮 Future Enhancements

### Planned Features

1. **Synonym Suggestions**

   - AI-powered synonym suggestions
   - Community-contributed synonyms
   - Automatic synonym generation

2. **Advanced Search**

   - Fuzzy matching
   - Phonetic search
   - Context-aware search

3. **Analytics**

   - Synonym usage tracking
   - Search pattern analysis
   - Popular synonym identification

4. **Internationalization**
   - Multi-language synonym support
   - Regional terminology variations
   - Cultural context awareness

This system provides a robust foundation for flexible variable naming and discovery while maintaining data integrity and performance.
