import { validateValue, LOG_LABELS } from "../utils/logLabels";

describe("Mood Validation Tests", () => {
  const moodVariable = LOG_LABELS.find((label) => label.label === "Mood");

  describe("Valid Mood Values", () => {
    const validValues = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

    validValues.forEach((value) => {
      it(`should accept mood value ${value}`, () => {
        const result = validateValue("Mood", value);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe("Invalid Mood Values", () => {
    const invalidCases = [
      { value: "0", description: "below minimum" },
      { value: "11", description: "above maximum" },
      { value: "3.5", description: "decimal not allowed" },
      { value: "2.7", description: "decimal not allowed" },
      { value: "abc", description: "non-numeric" },
      { value: "", description: "empty value" },
      { value: " ", description: "whitespace only" },
    ];

    invalidCases.forEach(({ value, description }) => {
      it(`should reject ${description}: "${value}"`, () => {
        const result = validateValue("Mood", value);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe("Mood Variable Definition", () => {
    it("should exist in LOG_LABELS", () => {
      expect(moodVariable).toBeTruthy();
    });

    it("should have correct properties", () => {
      expect(moodVariable?.label).toBe("Mood");
      expect(moodVariable?.type).toBe("scale");
      expect(moodVariable?.icon).toBe("🙂");
      expect(moodVariable?.description).toBe("Overall mood (1–10).");
    });

    it("should have correct constraints", () => {
      const constraints = moodVariable?.constraints;
      expect(constraints?.scaleMin).toBe(1);
      expect(constraints?.scaleMax).toBe(10);
      expect(constraints?.required).toBe(true);
    });
  });

  describe("Scale Range Validation", () => {
    it("should have exactly 10 valid values (1-10)", () => {
      const { scaleMin, scaleMax } = moodVariable?.constraints || {};
      if (scaleMin === undefined || scaleMax === undefined) {
        throw new Error("Scale min or max is undefined");
      }
      const range = scaleMax - scaleMin + 1;
      expect(range).toBe(10);
    });

    it("should reject values outside 1-10 range", () => {
      const outOfRangeValues = ["-1", "0", "11", "12", "100"];
      outOfRangeValues.forEach((value) => {
        const result = validateValue("Mood", value);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe("Decimal Validation", () => {
    it("should reject decimal values", () => {
      const decimalValues = [
        "1.5",
        "2.3",
        "3.7",
        "4.2",
        "5.8",
        "6.1",
        "7.9",
        "8.4",
        "9.6",
      ];
      decimalValues.forEach((value) => {
        const result = validateValue("Mood", value);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("whole number");
      });
    });

    it("should reject comma-separated decimals", () => {
      const commaValues = ["1,5", "2,3", "3,7"];
      commaValues.forEach((value) => {
        const result = validateValue("Mood", value);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("whole number");
      });
    });
  });
});
