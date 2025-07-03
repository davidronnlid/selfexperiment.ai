// Test script for variable validation system
import { validateValue } from "../utils/logLabels";

console.log("🧪 Testing Variable Validation System\n");

// Test cases
const testCases = [
  // Number validation tests
  {
    label: "Caffeine (mg)",
    value: "200",
    expected: true,
    description: "Valid caffeine amount",
  },
  {
    label: "Caffeine (mg)",
    value: "1500",
    expected: false,
    description: "Caffeine amount exceeds maximum (1000mg)",
  },
  {
    label: "Caffeine (mg)",
    value: "-50",
    expected: false,
    description: "Negative caffeine amount",
  },
  {
    label: "Caffeine (mg)",
    value: "abc",
    expected: false,
    description: "Non-numeric caffeine amount",
  },

  // Scale validation tests
  {
    label: "Stress",
    value: "5",
    expected: true,
    description: "Valid stress level (1-10)",
  },
  {
    label: "Stress",
    value: "11",
    expected: false,
    description: "Stress level exceeds maximum (10)",
  },
  {
    label: "Stress",
    value: "0",
    expected: false,
    description: "Stress level below minimum (1)",
  },
  {
    label: "Stress",
    value: "3.5",
    expected: false,
    description: "Decimal stress level (should be integer)",
  },
  {
    label: "Cognitive Control",
    value: "7",
    expected: true,
    description: "Valid cognitive control level (1-10)",
  },
  {
    label: "Cognitive Control",
    value: "10",
    expected: true,
    description: "Maximum cognitive control level",
  },
  {
    label: "Cognitive Control",
    value: "0",
    expected: false,
    description: "Cognitive control below minimum (1)",
  },

  // Time validation tests
  {
    label: "Sleep Time",
    value: "23:30",
    expected: true,
    description: "Valid time format",
  },
  {
    label: "Sleep Time",
    value: "09:15",
    expected: true,
    description: "Valid time format with leading zero",
  },
  {
    label: "Sleep Time",
    value: "25:00",
    expected: false,
    description: "Invalid hour (25)",
  },
  {
    label: "Sleep Time",
    value: "23:60",
    expected: false,
    description: "Invalid minute (60)",
  },
  {
    label: "Sleep Time",
    value: "11:30 PM",
    expected: false,
    description: "12-hour format not supported",
  },

  // Yes/No validation tests
  {
    label: "Nicotine",
    value: "yes",
    expected: true,
    description: "Valid yes/no value",
  },
  {
    label: "Nicotine",
    value: "NO",
    expected: true,
    description: "Valid yes/no value (uppercase)",
  },
  {
    label: "Nicotine",
    value: "1",
    expected: true,
    description: "Valid yes/no value (1)",
  },
  {
    label: "Nicotine",
    value: "maybe",
    expected: false,
    description: "Invalid yes/no value",
  },

  // Dropdown validation tests
  {
    label: "Hydration",
    value: "Medium",
    expected: true,
    description: "Valid dropdown option",
  },
  {
    label: "Hydration",
    value: "High",
    expected: true,
    description: "Valid dropdown option",
  },
  {
    label: "Hydration",
    value: "Very High",
    expected: false,
    description: "Invalid dropdown option",
  },

  // Text validation tests
  {
    label: "Exercise",
    value: "30 minutes running",
    expected: true,
    description: "Valid text within length limit",
  },
  {
    label: "Exercise",
    value: "A".repeat(600),
    expected: false,
    description: "Text exceeds maximum length (500 chars)",
  },

  // Required field tests
  {
    label: "Caffeine (mg)",
    value: "",
    expected: false,
    description: "Required field cannot be empty",
  },
  {
    label: "Medications/Supplements",
    value: "",
    expected: true,
    description: "Optional field can be empty",
  },
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = validateValue(testCase.label, testCase.value);
  const success = result.isValid === testCase.expected;

  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result.isValid}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
});

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("🎉 All tests passed! Validation system is working correctly.");
} else {
  console.log("⚠️  Some tests failed. Please check the validation logic.");
}

export { testCases, validateValue };
