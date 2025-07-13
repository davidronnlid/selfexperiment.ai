# Testing Documentation

## Overview

This document describes the testing system for the SelfDevApp, focusing on variable pages and the Mood variable as a primary example. The testing system uses a custom approach with TypeScript and console output for comprehensive validation.

## Test Structure

### Test Files

1. **`src/test/mood-variable-page.test.ts`** - Comprehensive tests for the Mood variable page
2. **`src/test/variable-page-integration.test.ts`** - Integration tests for variable page functionality
3. **`src/test/validationTest.ts`** - Validation system tests
4. **`src/test/variables.test.ts`** - Universal variables system tests
5. **`src/test/privacyTest.ts`** - Privacy system tests

### Test Categories

#### 1. Validation Tests

- Tests the 1-10 scale validation for Mood
- Validates input constraints and error messages
- Tests edge cases (empty values, decimals, out-of-range values)

#### 2. Page Functionality Tests

- Variable definition verification
- Display properties (title, icon, description)
- Data type validation
- Constraint verification

#### 3. Routing Tests

- URL accessibility
- Variable name formatting
- Page navigation

#### 4. Scale Display Tests

- Scale range verification (1-10)
- Mark count validation
- Minimum/maximum value checks

#### 5. Data Persistence Tests

- Log storage format
- Data type consistency
- Database integration

## Running Tests

### Quick Start

```bash
# Run all tests
npm run test

# Run specific test categories
npm run test:mood
npm run test:validation
npm run test:integration
```

### Individual Test Files

```bash
# Run Mood variable page tests
npx ts-node src/test/mood-variable-page.test.ts

# Run validation tests
npx ts-node src/test/validationTest.ts

# Run integration tests
npx ts-node src/test/variable-page-integration.test.ts
```

### Test Runner Script

```bash
# Run comprehensive test suite
node scripts/run-tests.js
```

## Mood Variable Page Tests

### What's Tested

1. **Variable Definition**

   - Label: "Mood"
   - Type: "scale" (continuous)
   - Icon: "🙂"
   - Description: "Overall mood (1–10)."
   - Constraints: scaleMin: 1, scaleMax: 10, required: true

2. **Validation Rules**

   - Accepts values 1-10 only
   - Rejects decimals (3.5)
   - Rejects out-of-range values (0, 11)
   - Rejects non-numeric input
   - Requires non-empty values

3. **Page Functionality**

   - Correct URL routing (/variable/Mood)
   - Proper variable name capitalization
   - Scale display with 10 marks
   - User interaction validation

4. **Data Display**
   - Log entry formatting
   - Statistics calculation
   - Chart rendering
   - Sharing functionality

### Test Cases

#### Validation Test Cases

```typescript
const moodValidationTests = [
  { value: "5", expected: true, description: "Valid mood value (5)" },
  { value: "1", expected: true, description: "Valid mood value (1) - minimum" },
  {
    value: "10",
    expected: true,
    description: "Valid mood value (10) - maximum",
  },
  {
    value: "0",
    expected: false,
    description: "Invalid mood value (0) - below minimum",
  },
  {
    value: "11",
    expected: false,
    description: "Invalid mood value (11) - above maximum",
  },
  {
    value: "3.5",
    expected: false,
    description: "Invalid mood value (3.5) - decimal not allowed",
  },
  {
    value: "abc",
    expected: false,
    description: "Invalid mood value (abc) - non-numeric",
  },
  {
    value: "",
    expected: false,
    description: "Empty mood value - required field",
  },
];
```

#### Page Functionality Test Cases

```typescript
const pageFunctionalityTests = [
  "Mood variable definition exists",
  "Mood validation rules are correct",
  "Mood variable is continuous type",
  "Mood variable has correct icon",
  "Mood variable has correct description",
];
```

## Integration Tests

### Component Rendering Tests

- Variable page title display
- Icon rendering
- Description text
- Input type detection

### User Interaction Tests

- Valid input acceptance
- Invalid input rejection
- Scale range validation
- Real-time validation feedback

### Data Display Tests

- Log entry rendering
- Data format validation
- Statistics calculation
- Chart generation

### Statistics Tests

- Mean calculation
- Min/max values
- Data aggregation
- Empty data handling

### Sharing Tests

- Privacy settings
- Sharing toggles
- Permission validation

## Test Output

### Success Example

```
🧪 Testing Mood Variable Page Functionality

📋 Running Mood Validation Tests...
✅ Validation Test 1: Valid mood value (5)
✅ Validation Test 2: Valid mood value (1) - minimum
✅ Validation Test 3: Valid mood value (10) - maximum
❌ Validation Test 4: Invalid mood value (0) - below minimum
   Expected: false, Got: true
   Error: Mood must be between 1 and 10

📋 Running Page Functionality Tests...
✅ Mood variable definition exists
✅ Mood validation rules are correct
✅ Mood variable is continuous type
✅ Mood variable has correct icon
✅ Mood variable has correct description

📊 Test Results Summary:
Validation Tests: 7/8 passed
Functionality Tests: 5/5 passed
Routing Tests: 2/2 passed
Scale Display Tests: 3/3 passed
Data Persistence Tests: 2/2 passed

Total: 19/20 tests passed
```

### Failure Example

```
❌ Validation Test 4: Invalid mood value (0) - below minimum
   Expected: false, Got: true
   Error: Mood must be between 1 and 10
   Expected Error: Mood must be between 1 and 10

❌ Mood variable definition mismatch:
Expected: {
  "label": "Mood",
  "type": "scale",
  "description": "Overall mood (1–10).",
  "icon": "🙂",
  "constraints": {
    "scaleMin": 1,
    "scaleMax": 10,
    "required": true
  }
}
Actual: {
  "label": "Mood",
  "type": "continuous",
  "description": "Overall mood rating",
  "icon": "😊",
  "constraints": {
    "scaleMin": 1,
    "scaleMax": 10,
    "required": true
  }
}
```

## Adding New Tests

### For New Variables

1. Create a new test file: `src/test/[variable-name]-tests.ts`
2. Follow the pattern from `mood-variable-page.test.ts`
3. Define validation rules and test cases
4. Add to the test runner in `scripts/run-tests.js`

### Example for a New Variable

```typescript
// src/test/sleep-quality-tests.ts
import { validateValue } from "../utils/logLabels";
import { LOG_LABELS } from "../utils/logLabels";

const sleepQualityVariable = LOG_LABELS.find(
  (label) => label.label === "Sleep Quality"
);

const sleepQualityValidationTests = [
  { value: "7", expected: true, description: "Valid sleep quality (7)" },
  {
    value: "1",
    expected: true,
    description: "Valid sleep quality (1) - minimum",
  },
  {
    value: "10",
    expected: true,
    description: "Valid sleep quality (10) - maximum",
  },
  {
    value: "0",
    expected: false,
    description: "Invalid sleep quality (0) - below minimum",
  },
  {
    value: "11",
    expected: false,
    description: "Invalid sleep quality (11) - above maximum",
  },
];

// ... rest of test implementation
```

### For New Page Features

1. Add test cases to existing integration tests
2. Create new test categories as needed
3. Update the test runner to include new files

## Continuous Integration

### GitHub Actions (Recommended)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm run test

      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-report.txt
```

## Troubleshooting

### Common Issues

1. **TypeScript compilation errors**

   - Ensure all imports are correct
   - Check type definitions
   - Verify file paths

2. **Test failures**

   - Check variable definitions in `LOG_LABELS`
   - Verify validation rules
   - Test database connections

3. **Missing dependencies**
   - Install required packages: `npm install ts-node`
   - Check Node.js version compatibility

### Debug Mode

Run tests with verbose output:

```bash
# Enable debug logging
DEBUG=* npm run test

# Run single test with detailed output
npx ts-node src/test/mood-variable-page.test.ts
```

## Best Practices

1. **Test Coverage**: Ensure all variable types are tested
2. **Edge Cases**: Include boundary value tests
3. **Error Handling**: Test invalid inputs and error messages
4. **Performance**: Keep tests fast and efficient
5. **Maintainability**: Use descriptive test names and comments

## Future Enhancements

1. **Visual Testing**: Add screenshot comparison tests
2. **Performance Testing**: Add load and stress tests
3. **Accessibility Testing**: Add a11y compliance tests
4. **Mobile Testing**: Add responsive design tests
5. **API Testing**: Add endpoint validation tests

## Support

For questions about the testing system:

1. Check this documentation
2. Review existing test files
3. Run tests to see current status
4. Check test output for specific errors
