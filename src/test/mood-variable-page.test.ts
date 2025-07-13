// Test script for Mood variable page functionality
import { validateValue, LOG_LABELS } from "../utils/logLabels";

describe("Mood Variable Page", () => {
  const moodVariable = LOG_LABELS.find((label) => label.label === "Mood");

  describe("Validation", () => {
    const cases = [
      { value: "5", expected: true, description: "Valid mood value (5)" },
      {
        value: "1",
        expected: true,
        description: "Valid mood value (1) - minimum",
      },
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
    cases.forEach(({ value, expected, description }) => {
      it(description, () => {
        const result = validateValue("Mood", value);
        expect(result.isValid).toBe(expected);
      });
    });
  });

  describe("Variable Definition", () => {
    it("should exist in LOG_LABELS", () => {
      expect(moodVariable).toBeTruthy();
    });
    it("should have correct type", () => {
      expect(moodVariable?.type).toBe("scale");
    });
    it("should have correct icon", () => {
      expect(moodVariable?.icon).toBe("🙂");
    });
    it("should have correct description", () => {
      expect(moodVariable?.description).toBe("Overall mood (1–10).");
    });
    it("should have correct constraints", () => {
      expect(moodVariable?.constraints).toEqual({
        scaleMin: 1,
        scaleMax: 10,
        required: true,
      });
    });
  });

  describe("Scale Display", () => {
    it("should have 10 marks (1-10)", () => {
      const { scaleMin, scaleMax } = moodVariable?.constraints || {};
      expect(scaleMin).toBe(1);
      expect(scaleMax).toBe(10);
      expect(scaleMax - scaleMin + 1).toBe(10);
    });
  });
});
