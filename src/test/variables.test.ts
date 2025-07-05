import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabase } from "../utils/supaBase";
import {
  createVariable,
  updateVariable,
  getVariable,
  searchVariables,
  createVariableLog,
  getVariableLogs,
  updateUserVariablePreference,
  getUserVariablePreference,
  convertUnit,
  validateVariableValue,
  formatVariableValue,
  getVariableCorrelations,
  getVariableTrends,
  getVariableInsights,
} from "../utils/variableUtils";
import type {
  CreateVariableRequest,
  Variable,
  UserVariablePreference,
} from "../types/variables";

// Test data
const testUserId = "test-user-id";
const testVariable: CreateVariableRequest = {
  slug: "test_weight",
  label: "Test Weight",
  description: "Test weight variable",
  data_type: "continuous",
  canonical_unit: "kg",
  unit_group: "mass",
  convertible_units: ["kg", "lb"],
  source_type: "manual",
  category: "Test",
  subcategory: "Test Metrics",
  tags: ["test"],
  validation_rules: {
    min: 20,
    max: 300,
    unit: "kg",
    required: true,
  },
};

describe("Universal Variables System", () => {
  let createdVariable: Variable | null = null;
  let createdLogId: string | null = null;

  beforeAll(async () => {
    // Clean up any existing test data
    await supabase.from("variable_logs").delete().eq("user_id", testUserId);
    await supabase
      .from("user_variable_preferences")
      .delete()
      .eq("user_id", testUserId);
    await supabase.from("variables").delete().eq("slug", testVariable.slug);
  });

  afterAll(async () => {
    // Clean up test data
    if (createdLogId) {
      await supabase.from("variable_logs").delete().eq("id", createdLogId);
    }
    if (createdVariable) {
      await supabase
        .from("user_variable_preferences")
        .delete()
        .eq("variable_id", createdVariable.id);
      await supabase.from("variables").delete().eq("id", createdVariable.id);
    }
  });

  describe("Variable Management", () => {
    it("should create a new variable", async () => {
      createdVariable = await createVariable(testVariable, testUserId);

      expect(createdVariable).toBeTruthy();
      expect(createdVariable?.slug).toBe(testVariable.slug);
      expect(createdVariable?.label).toBe(testVariable.label);
      expect(createdVariable?.data_type).toBe(testVariable.data_type);
      expect(createdVariable?.is_active).toBe(true);
    });

    it("should get a variable by ID", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const variable = await getVariable(createdVariable.id);

      expect(variable).toBeTruthy();
      expect(variable?.id).toBe(createdVariable.id);
      expect(variable?.slug).toBe(testVariable.slug);
    });

    it("should search variables", async () => {
      const result = await searchVariables(
        {
          query: "Test",
          limit: 10,
        },
        testUserId
      );

      expect(result.variables).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.has_more).toBeDefined();
    });

    it("should update a variable", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const updatedVariable = await updateVariable({
        id: createdVariable.id,
        description: "Updated test description",
      });

      expect(updatedVariable).toBeTruthy();
      expect(updatedVariable?.description).toBe("Updated test description");
    });
  });

  describe("Variable Logs", () => {
    it("should create a variable log", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const log = await createVariableLog(
        {
          variable_id: createdVariable.id,
          display_value: "75",
          display_unit: "kg",
          notes: "Test log",
        },
        testUserId
      );

      expect(log).toBeTruthy();
      expect(log?.variable_id).toBe(createdVariable.id);
      expect(log?.display_value).toBe("75");
      expect(log?.display_unit).toBe("kg");

      createdLogId = log?.id || null;
    });

    it("should get variable logs", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const logs = await getVariableLogs(createdVariable.id, testUserId, {
        limit: 10,
      });

      expect(logs).toBeInstanceOf(Array);
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe("User Preferences", () => {
    it("should update user preferences", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const preference = await updateUserVariablePreference(
        testUserId,
        createdVariable.id,
        {
          is_tracked: true,
          is_shared: false,
          share_level: "private",
          preferred_unit: "lb",
        }
      );

      expect(preference).toBeTruthy();
      expect(preference?.user_id).toBe(testUserId);
      expect(preference?.variable_id).toBe(createdVariable.id);
      expect(preference?.is_tracked).toBe(true);
      expect(preference?.preferred_unit).toBe("lb");
    });

    it("should get user preferences", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const preference = await getUserVariablePreference(
        testUserId,
        createdVariable.id
      );

      expect(preference).toBeTruthy();
      expect(preference?.user_id).toBe(testUserId);
      expect(preference?.variable_id).toBe(createdVariable.id);
    });
  });

  describe("Unit Conversion", () => {
    it("should convert between units", async () => {
      const kgToLb = await convertUnit(1, "kg", "lb");
      expect(kgToLb).toBeCloseTo(2.20462, 5);

      const lbToKg = await convertUnit(2.20462, "lb", "kg");
      expect(lbToKg).toBeCloseTo(1, 5);
    });

    it("should handle same unit conversion", async () => {
      const result = await convertUnit(100, "kg", "kg");
      expect(result).toBe(100);
    });

    it("should handle invalid conversion gracefully", async () => {
      const result = await convertUnit(100, "kg", "invalid_unit");
      expect(result).toBe(100); // Should return original value
    });
  });

  describe("Validation", () => {
    it("should validate continuous values", () => {
      if (!createdVariable) throw new Error("Variable not created");

      // Valid value
      const validResult = validateVariableValue("75", createdVariable);
      expect(validResult.isValid).toBe(true);

      // Invalid value (too low)
      const invalidResult = validateVariableValue("10", createdVariable);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain("must be at least");

      // Invalid value (too high)
      const tooHighResult = validateVariableValue("400", createdVariable);
      expect(tooHighResult.isValid).toBe(false);
      expect(tooHighResult.error).toContain("must be no more than");
    });

    it("should validate boolean values", () => {
      const booleanVariable: Variable = {
        ...createdVariable!,
        data_type: "boolean",
        validation_rules: { required: true },
      };

      // Valid boolean values
      expect(validateVariableValue("true", booleanVariable).isValid).toBe(true);
      expect(validateVariableValue("false", booleanVariable).isValid).toBe(
        true
      );
      expect(validateVariableValue("yes", booleanVariable).isValid).toBe(true);
      expect(validateVariableValue("no", booleanVariable).isValid).toBe(true);
      expect(validateVariableValue("1", booleanVariable).isValid).toBe(true);
      expect(validateVariableValue("0", booleanVariable).isValid).toBe(true);

      // Invalid boolean value
      expect(validateVariableValue("maybe", booleanVariable).isValid).toBe(
        false
      );
    });

    it("should validate time values", () => {
      const timeVariable: Variable = {
        ...createdVariable!,
        data_type: "time",
        validation_rules: { required: true },
      };

      // Valid time values
      expect(validateVariableValue("23:30", timeVariable).isValid).toBe(true);
      expect(validateVariableValue("09:15", timeVariable).isValid).toBe(true);

      // Invalid time values
      expect(validateVariableValue("25:00", timeVariable).isValid).toBe(false);
      expect(validateVariableValue("12:60", timeVariable).isValid).toBe(false);
      expect(validateVariableValue("12:30:45", timeVariable).isValid).toBe(
        false
      );
    });
  });

  describe("Display Formatting", () => {
    it("should format variable values", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const displayData = await formatVariableValue(
        createdVariable,
        "75",
        "kg",
        testUserId
      );

      expect(displayData).toBeTruthy();
      expect(displayData.variable.id).toBe(createdVariable.id);
      expect(displayData.value).toBe("75");
      expect(displayData.unit).toBe("kg");
    });
  });

  describe("Analytics", () => {
    it("should get variable correlations", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const correlations = await getVariableCorrelations(
        createdVariable.id,
        testUserId,
        { startDate: "2024-01-01", endDate: "2024-12-31" }
      );

      expect(correlations).toBeInstanceOf(Array);
    });

    it("should get variable trends", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const trends = await getVariableTrends(createdVariable.id, testUserId, {
        period: "30d",
        granularity: "daily",
      });

      expect(trends).toBeTruthy();
      expect(trends.direction).toBeDefined();
      expect(trends.changePercentage).toBeDefined();
      expect(trends.period).toBeDefined();
    });

    it("should get variable insights", async () => {
      if (!createdVariable) throw new Error("Variable not created");

      const insights = await getVariableInsights(
        createdVariable.id,
        testUserId,
        { includePatterns: true, includeAnomalies: true }
      );

      expect(insights).toBeInstanceOf(Array);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing variable gracefully", async () => {
      const variable = await getVariable("non-existent-id");
      expect(variable).toBeNull();
    });

    it("should handle missing user preferences gracefully", async () => {
      const preference = await getUserVariablePreference(
        testUserId,
        "non-existent-id"
      );
      expect(preference).toBeNull();
    });

    it("should handle empty search results", async () => {
      const result = await searchVariables(
        {
          query: "non-existent-variable",
          limit: 10,
        },
        testUserId
      );

      expect(result.variables).toBeInstanceOf(Array);
      expect(result.variables.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.has_more).toBe(false);
    });
  });

  describe("Performance", () => {
    it("should handle bulk operations efficiently", async () => {
      const startTime = Date.now();

      // Create multiple variables
      const variables = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createVariable(
            {
              ...testVariable,
              slug: `test_variable_${i}`,
              label: `Test Variable ${i}`,
            },
            testUserId
          )
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(variables.length).toBe(5);
      expect(variables.every((v) => v !== null)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      await Promise.all(
        variables.map(
          (v) => v && supabase.from("variables").delete().eq("id", v.id)
        )
      );
    });
  });
});
