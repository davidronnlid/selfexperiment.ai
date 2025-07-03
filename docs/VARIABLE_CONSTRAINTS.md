# Variable Constraints System

## Overview

The variable constraints system provides data validation and quality control for logging variables in the self-experimentation app. It ensures that users enter valid, consistent data that can be reliably analyzed.

## Features

### 1. **Type-Based Validation**

- **Number**: Validates numeric ranges with optional units
- **Scale**: Validates 1-10 or custom scale ranges
- **Text**: Validates text length and patterns
- **Time**: Validates HH:MM time format
- **Yes/No**: Validates boolean-like inputs
- **Dropdown**: Validates against predefined options

### 2. **Real-Time Validation**

- Instant feedback as users type
- Visual indicators (✅ for valid, ❌ for invalid)
- Helper text showing constraints and format requirements
- Submit button disabled when validation fails

### 3. **Server-Side Validation**

- API endpoint for server-side validation
- Database integrity protection
- Consistent validation across client and server

### 4. **Custom Variable Constraints**

- Users can define constraints for custom variables
- Constraint management interface
- Persistent storage in database

## Implementation Details

### Data Structure

```typescript
interface VariableConstraint {
  min?: number; // Minimum value for numbers
  max?: number; // Maximum value for numbers
  minLength?: number; // Minimum text length
  maxLength?: number; // Maximum text length
  required?: boolean; // Whether field is required
  unit?: string; // Unit of measurement
  scaleMin?: number; // Scale minimum (e.g., 1)
  scaleMax?: number; // Scale maximum (e.g., 10)
  options?: string[]; // Dropdown options
}
```

### Validation Rules

#### Number Type

- Must be a valid number
- Must be within min/max range if specified
- Supports decimal values
- Optional unit display

#### Scale Type

- Must be a whole number
- Must be within scaleMin/scaleMax range
- Default: 1-10 scale
- Used for subjective ratings

#### Text Type

- Length validation (minLength/maxLength)
- Pattern validation (future enhancement)
- Character count display

#### Time Type

- Must match HH:MM format
- 24-hour format
- Examples: "23:30", "09:15"

#### Yes/No Type

- Accepts: yes/no, true/false, 1/0, y/n
- Case-insensitive
- Converts to standardized format

#### Dropdown Type

- Must match one of predefined options
- Case-sensitive matching
- Custom options for user variables

### Components

#### ValidatedInput

- Main input component with real-time validation
- Type-specific input fields
- Visual feedback and helper text
- Integration with form validation

#### DropdownInput

- Specialized component for dropdown variables
- Native select element
- Option validation
- Preview of available options

#### VariableConstraintManager

- Dialog for managing custom variable constraints
- Type selection and constraint configuration
- Database persistence
- Constraint validation

### API Endpoints

#### POST /api/validate-log

```typescript
// Request
{
  label: string;
  value: string;
}

// Response
{
  isValid: boolean;
  error?: string;
  label: string;
  value: string;
}
```

## Usage Examples

### Predefined Variables

The system includes predefined variables with evidence-based constraints:

```typescript
{
  label: "Caffeine (mg)",
  type: "number",
  constraints: {
    min: 0,
    max: 1000,
    unit: "mg",
    required: true
  }
}
```

### Custom Variables

Users can create custom variables with their own constraints:

```typescript
{
  label: "Custom Metric",
  type: "scale",
  constraints: {
    scaleMin: 1,
    scaleMax: 5,
    required: true
  }
}
```

## Database Schema

### user_variables Table

```sql
CREATE TABLE user_variables (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  constraints JSONB,
  icon TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Best Practices

### 1. **Constraint Design**

- Set realistic min/max values
- Use appropriate units
- Consider data analysis needs
- Balance flexibility with data quality

### 2. **User Experience**

- Provide clear error messages
- Show helpful placeholder text
- Use visual indicators consistently
- Don't over-validate during typing

### 3. **Performance**

- Client-side validation for immediate feedback
- Server-side validation for data integrity
- Debounced validation for real-time feedback
- Efficient constraint checking

### 4. **Data Quality**

- Required fields for critical data
- Reasonable ranges to prevent outliers
- Consistent formatting for analysis
- Clear documentation of constraints

## Future Enhancements

### 1. **Advanced Validation**

- Regular expression patterns
- Conditional constraints
- Cross-field validation
- Historical data validation

### 2. **Smart Suggestions**

- Auto-complete based on history
- Intelligent defaults
- Context-aware validation
- Machine learning insights

### 3. **Constraint Templates**

- Pre-built constraint sets
- Industry-specific templates
- Community-shared constraints
- Import/export functionality

### 4. **Analytics Integration**

- Constraint effectiveness tracking
- Data quality metrics
- Validation failure analysis
- User behavior insights

## Troubleshooting

### Common Issues

1. **Validation not working**

   - Check if variable exists in LOG_LABELS
   - Verify constraint definitions
   - Ensure proper component imports

2. **Database errors**

   - Check Supabase connection
   - Verify table schema
   - Review constraint JSON format

3. **UI not updating**
   - Check state management
   - Verify event handlers
   - Review component props

### Debug Mode

Enable debug logging to troubleshoot validation issues:

```typescript
const DEBUG_VALIDATION = process.env.NODE_ENV === "development";

if (DEBUG_VALIDATION) {
  console.log("Validation result:", validation);
}
```

## Contributing

When adding new variable types or constraints:

1. Update the `LogLabel` interface
2. Add validation logic to `validateValue`
3. Update `getInputProps` for proper input configuration
4. Add type-specific UI components if needed
5. Update documentation and examples
6. Add tests for new functionality
