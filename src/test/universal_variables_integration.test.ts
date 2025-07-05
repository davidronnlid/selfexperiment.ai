import { supabase } from "../utils/supaBase";
import {
  createVariable,
  createVariableLog,
  searchVariables,
  validateVariableValue,
  convertUnit,
} from "../utils/variableUtils";
import {
  fetchVariableSharingSettings,
  upsertVariableSharingSetting,
} from "../utils/privacyApi";
import {
  Variable,
  CreateVariableRequest,
  CreateVariableLogRequest,
} from "../types/variables";

// Simple test runner
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private results: Array<{ name: string; passed: boolean; error?: string }> =
    [];

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log("🧪 Running Universal Variables Integration Tests...\n");

    for (const test of this.tests) {
      try {
        await test.fn();
        this.results.push({ name: test.name, passed: true });
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.results.push({
          name: test.name,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(
          `❌ ${test.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const passed = this.results.filter((r) => r.passed).length;
    const total = this.results.length;

    console.log(`\n📊 Test Results: ${passed}/${total} passed`);

    if (passed === total) {
      console.log("🎉 All tests passed!");
    } else {
      console.log("❌ Some tests failed");
      process.exit(1);
    }
  }
}

// Helper functions
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error("Expected value to be defined");
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected ${actual} to be null`);
      }
    },
    toContain: (expected: any) => {
      if (!actual || !actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    },
  };
}

function expectArray(actual: any) {
  if (!Array.isArray(actual)) {
    throw new Error(`Expected ${actual} to be an array`);
  }
  return actual;
}

function expectType(actual: any, type: string) {
  if (typeof actual !== type) {
    throw new Error(`Expected ${actual} to be of type ${type}`);
  }
}

// Test setup
const testUserId = "test-user-123";
let testVariable: Variable;

async function setupTest() {
  console.log("🔧 Setting up test environment...");

  // Create a test variable
  const variableRequest: CreateVariableRequest = {
    slug: "test_mood_integration",
    label: "Test Mood Integration",
    description: "A test mood variable for integration testing",
    data_type: "continuous",
    canonical_unit: "score",
    source_type: "manual",
    category: "Mental & Emotional",
    validation_rules: {
      min: 1,
      max: 10,
      required: true,
    },
  };

  const created = await createVariable(variableRequest, testUserId);
  if (created) {
    testVariable = created;
    console.log("✅ Test variable created");
  } else {
    throw new Error("Failed to create test variable");
  }
}

async function teardownTest() {
  console.log("🧹 Cleaning up test environment...");

  if (testVariable) {
    await supabase.from("variables").delete().eq("id", testVariable.id);
    console.log("✅ Test variable cleaned up");
  }
}

// Main test function
async function runIntegrationTests() {
  const runner = new TestRunner();

  // Setup
  await setupTest();

  // Variable Management Tests
  runner.test("should create a variable successfully", () => {
    expect(testVariable).toBeDefined();
    expect(testVariable.slug).toBe("test_mood_integration");
    expect(testVariable.label).toBe("Test Mood Integration");
    expect(testVariable.data_type).toBe("continuous");
  });

  runner.test("should search variables", async () => {
    const result = await searchVariables(
      {
        query: "mood",
        limit: 10,
      },
      testUserId
    );

    expect(result.variables).toBeDefined();
    expectArray(result.variables);
  });

  runner.test("should validate variable values", () => {
    const validResult = validateVariableValue(5, testVariable);
    expect(validResult.isValid).toBe(true);

    const invalidResult = validateVariableValue(15, testVariable);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toContain("must be no more than 10");
  });

  // Variable Logging Tests
  runner.test("should create a variable log", async () => {
    const logRequest: CreateVariableLogRequest = {
      variable_id: testVariable.id,
      display_value: "7",
      display_unit: "score",
      notes: "Test log entry",
    };

    const log = await createVariableLog(logRequest, testUserId);
    expect(log).toBeDefined();
    expect(log?.display_value).toBe("7");
    expect(log?.notes).toBe("Test log entry");
  });

  // Privacy Settings Tests
  runner.test("should fetch variable sharing settings", async () => {
    const result = await fetchVariableSharingSettings(testUserId);
    expect(result.data).toBeDefined();
    expectArray(result.data);
  });

  runner.test("should upsert variable sharing setting", async () => {
    const result = await upsertVariableSharingSetting({
      userId: testUserId,
      variableName: testVariable.slug,
      isShared: true,
      variableType: testVariable.data_type,
      category: testVariable.category,
    });

    expect(result.error).toBeNull();
  });

  // Unit Conversion Tests
  runner.test("should convert units when available", async () => {
    const result = await convertUnit(5, "kg", "kg");
    expect(result).toBe(5);
  });

  // Database Integration Tests
  runner.test("should connect to Supabase", async () => {
    const { data, error } = await supabase
      .from("variables")
      .select("count(*)")
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  runner.test("should respect RLS policies", async () => {
    const { data, error } = await supabase
      .from("user_variable_preferences")
      .select("*")
      .eq("user_id", testUserId)
      .limit(1);

    expect(error).toBeNull();
    expectArray(data);
  });

  // Frontend Component Integration Tests
  runner.test("should handle variable loading in components", async () => {
    const result = await searchVariables({
      query: "",
      limit: 100,
      category: "Mental & Emotional",
    });

    expect(result.variables).toBeDefined();
    expectType(result.total, "number");
    expectType(result.has_more, "boolean");
  });

  runner.test("should handle privacy API calls", async () => {
    const result = await fetchVariableSharingSettings(testUserId);

    expect(result.data).toBeDefined();
    expectArray(result.data);
  });

  // Error Handling Tests
  runner.test("should handle invalid variable creation", async () => {
    const invalidRequest = {
      slug: "", // Invalid empty slug
      label: "Test",
      data_type: "continuous" as const,
      source_type: "manual" as const,
    };

    const result = await createVariable(invalidRequest, testUserId);
    expect(result).toBeNull();
  });

  runner.test("should handle invalid variable log creation", async () => {
    const invalidRequest = {
      variable_id: "non-existent-id",
      display_value: "5",
    };

    const result = await createVariableLog(invalidRequest, testUserId);
    expect(result).toBeNull();
  });

  // Run all tests
  await runner.run();

  // Cleanup
  await teardownTest();
}

// Export for use in other files
export { runIntegrationTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch((error) => {
    console.error("❌ Integration tests failed:", error);
    process.exit(1);
  });
}
