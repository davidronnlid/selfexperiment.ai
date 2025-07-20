import { supabase } from "../utils/supaBase";
import {
  validateVariableValue,
  convertUnit,
} from "../utils/variableUtils";
import {
  Variable,
} from "../types/variables";

// Mock variable for testing
const mockVariable: Variable = {
  id: "test-variable-id",
  slug: "test_mood",
  label: "Test Mood",
  description: "A test mood variable",
  data_type: "continuous",
  source_type: "manual",
  category: "Mental & Emotional",
  validation_rules: {
    min: 1,
    max: 10,
    required: true,
  },
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Universal Variables Integration Tests", () => {
  describe("Variable Validation", () => {
    it("should validate variable values correctly", () => {
      const validResult = validateVariableValue(5, mockVariable);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateVariableValue(15, mockVariable);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain("must be no more than 10");
    });

    it("should handle edge cases in validation", () => {
      const minResult = validateVariableValue(1, mockVariable);
      expect(minResult.isValid).toBe(true);

      const maxResult = validateVariableValue(10, mockVariable);
      expect(maxResult.isValid).toBe(true);

      const belowMinResult = validateVariableValue(0, mockVariable);
      expect(belowMinResult.isValid).toBe(false);
    });
  });

  describe("Unit Conversion", () => {
    it("should convert units when available", async () => {
      const result = await convertUnit(5, "kg", "kg");
      expect(result).toBe(5);
    });

    it("should handle same unit conversion", async () => {
      const result = await convertUnit(10, "score", "score");
      expect(result).toBe(10);
    });
  });

  describe("Variable Structure", () => {
    it("should have correct variable structure", () => {
      expect(mockVariable.id).toBeDefined();
      expect(mockVariable.slug).toBe("test_mood");
      expect(mockVariable.label).toBe("Test Mood");
      expect(mockVariable.data_type).toBe("continuous");
      expect(mockVariable.source_type).toBe("manual");
      expect(mockVariable.is_active).toBe(true);
    });

    it("should have validation rules", () => {
      expect(mockVariable.validation_rules).toBeDefined();
      expect(mockVariable.validation_rules?.min).toBe(1);
      expect(mockVariable.validation_rules?.max).toBe(10);
      expect(mockVariable.validation_rules?.required).toBe(true);
    });
  });
});
