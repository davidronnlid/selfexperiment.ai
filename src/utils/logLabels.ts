// Evidence-backed log variables for sleep/HR analysis
export interface LogLabel {
  label: string;
  type: "number" | "scale" | "text" | "time" | "yesno" | "dropdown";
  description: string;
  options?: string[];
  icon?: string;
  constraints?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    required?: boolean;
    unit?: string;
    scaleMin?: number;
    scaleMax?: number;
  };
}

export const LOG_LABELS: LogLabel[] = [
  // Substances Consumed
  {
    label: "Caffeine",
    type: "number",
    description: "Total caffeine consumed and timing.",
    icon: "☕",
    constraints: {
      min: 0,
      max: 1000,
      unit: "mg",
      required: true,
    },
  },
  {
    label: "Alcohol",
    type: "number",
    description: "Alcohol intake and timing.",
    icon: "🍷",
    constraints: {
      min: 0,
      max: 20,
      unit: "units",
      required: true,
    },
  },
  {
    label: "Nicotine",
    type: "yesno",
    description: "Nicotine use.",
    icon: "🚬",
    constraints: {
      required: true,
    },
  },
  {
    label: "Cannabis/THC",
    type: "yesno",
    description: "Cannabis or THC use.",
    icon: "🌿",
    constraints: {
      required: true,
    },
  },
  {
    label: "Medications/Supplements",
    type: "text",
    description: "Any medications or supplements taken.",
    icon: "💊",
    constraints: {
      maxLength: 500,
      required: false,
    },
  },

  // Mental & Emotional State
  {
    label: "Stress",
    type: "scale",
    description: "Stress level (1–10).",
    icon: "😰",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Cognitive Control",
    type: "scale",
    description:
      "Subjective level of cognitive control and mental clarity (1–10).",
    icon: "🧠",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Anxiety Before Bed",
    type: "scale",
    description: "Anxiety or racing thoughts before bed (1–10).",
    icon: "😬",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Mood",
    type: "scale",
    description: "Overall mood (1–10).",
    icon: "🙂",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Emotional Event",
    type: "text",
    description: "Conflict or emotional event that day.",
    icon: "💔",
    constraints: {
      maxLength: 1000,
      required: false,
    },
  },

  // Sleep Behaviors
  {
    label: "Sleep Time",
    type: "time",
    description: "Time you went to bed.",
    icon: "🛏️",
    constraints: {
      required: true,
    },
  },
  {
    label: "Fell Asleep Time",
    type: "time",
    description: "Time you fell asleep.",
    icon: "😴",
    constraints: {
      required: true,
    },
  },
  {
    label: "Sleep Duration",
    type: "number",
    description: "Total sleep duration (hours).",
    icon: "⏰",
    constraints: {
      min: 0,
      max: 24,
      unit: "hours",
      required: true,
    },
  },
  {
    label: "Sleep Quality",
    type: "scale",
    description: "Subjective sleep quality (1–10).",
    icon: "⭐",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Naps",
    type: "number",
    description: "Number of naps during the day.",
    icon: "🛌",
    constraints: {
      min: 0,
      max: 10,
      unit: "naps",
      required: true,
    },
  },

  // Physical Factors
  {
    label: "Exercise",
    type: "text",
    description: "Type and timing of exercise.",
    icon: "🏋️",
    constraints: {
      maxLength: 500,
      required: false,
    },
  },
  {
    label: "Illness/Symptoms",
    type: "text",
    description: "Any illness or symptoms.",
    icon: "🤒",
    constraints: {
      maxLength: 500,
      required: false,
    },
  },
  {
    label: "Body Temp (subjective)",
    type: "scale",
    description: "Perceived body temperature (1–10).",
    icon: "🌡️",
    constraints: {
      scaleMin: 1,
      scaleMax: 10,
      required: true,
    },
  },
  {
    label: "Menstrual Phase",
    type: "dropdown",
    description: "Menstrual cycle phase.",
    options: ["Menstrual", "Follicular", "Ovulatory", "Luteal", "None"],
    icon: "🩸",
    constraints: {
      required: true,
    },
  },

  // Diet & Meal Timing
  {
    label: "Big Meal Late",
    type: "yesno",
    description: "Heavy meal close to bedtime.",
    icon: "🍽️",
    constraints: {
      required: true,
    },
  },
  {
    label: "Late Sugar Intake",
    type: "yesno",
    description: "Sugar intake late in the day.",
    icon: "🍬",
    constraints: {
      required: true,
    },
  },
  {
    label: "Intermittent Fasting",
    type: "yesno",
    description: "Practiced intermittent fasting or early dinner.",
    icon: "⏳",
    constraints: {
      required: true,
    },
  },
  {
    label: "Hydration",
    type: "dropdown",
    description: "Hydration status.",
    options: ["Low", "Medium", "High"],
    icon: "💧",
    constraints: {
      required: true,
    },
  },

  // Environmental Context
  {
    label: "Room Temp",
    type: "number",
    description: "Room temperature (°C or subjective).",
    icon: "🌡️",
    constraints: {
      min: 0,
      max: 50,
      unit: "°C",
      required: true,
    },
  },
  {
    label: "Light Exposure",
    type: "yesno",
    description: "Bright light exposure before bed.",
    icon: "💡",
    constraints: {
      required: true,
    },
  },
  {
    label: "Noise Disturbances",
    type: "yesno",
    description: "Noise disturbances during sleep.",
    icon: "🔊",
    constraints: {
      required: true,
    },
  },
  {
    label: "Travel/Jet Lag",
    type: "yesno",
    description: "Travel or jet lag.",
    icon: "✈️",
    constraints: {
      required: true,
    },
  },
  {
    label: "Altitude Change",
    type: "yesno",
    description: "Change in altitude.",
    icon: "⛰️",
    constraints: {
      required: true,
    },
  },
];

// Validation functions
export const validateValue = (
  label: string,
  value: string
): { isValid: boolean; error?: string } => {
  const variable = LOG_LABELS.find((v) => v.label === label);
  if (!variable) {
    return { isValid: true }; // Custom variables have no constraints
  }

  const { type, constraints } = variable;
  if (!constraints) {
    return { isValid: true };
  }

  // Required validation
  if (constraints.required && (!value || value.trim() === "")) {
    return { isValid: false, error: `${label} is required` };
  }

  // Type-specific validation
  switch (type) {
    case "number":
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return { isValid: false, error: `${label} must be a number` };
      }
      if (constraints.min !== undefined && numValue < constraints.min) {
        return {
          isValid: false,
          error: `${label} must be at least ${constraints.min}${
            constraints.unit ? ` ${constraints.unit}` : ""
          }`,
        };
      }
      if (constraints.max !== undefined && numValue > constraints.max) {
        return {
          isValid: false,
          error: `${label} must be at most ${constraints.max}${
            constraints.unit ? ` ${constraints.unit}` : ""
          }`,
        };
      }
      break;

    case "scale":
      // Check for decimals in scale values
      if (value.includes(".") || value.includes(",")) {
        return { isValid: false, error: `${label} must be a whole number` };
      }
      const scaleValue = parseInt(value);
      if (isNaN(scaleValue)) {
        return { isValid: false, error: `${label} must be a number` };
      }
      if (
        constraints.scaleMin !== undefined &&
        scaleValue < constraints.scaleMin
      ) {
        return {
          isValid: false,
          error: `${label} must be at least ${constraints.scaleMin}`,
        };
      }
      if (
        constraints.scaleMax !== undefined &&
        scaleValue > constraints.scaleMax
      ) {
        return {
          isValid: false,
          error: `${label} must be at most ${constraints.scaleMax}`,
        };
      }
      break;

    case "text":
      if (
        constraints.minLength !== undefined &&
        value.length < constraints.minLength
      ) {
        return {
          isValid: false,
          error: `${label} must be at least ${constraints.minLength} characters`,
        };
      }
      if (
        constraints.maxLength !== undefined &&
        value.length > constraints.maxLength
      ) {
        return {
          isValid: false,
          error: `${label} must be at most ${constraints.maxLength} characters`,
        };
      }
      break;

    case "time":
      const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timePattern.test(value)) {
        return {
          isValid: false,
          error: `${label} must be in HH:MM format (e.g., 23:30)`,
        };
      }
      break;

    case "yesno":
      const validYesNo = [
        "yes",
        "no",
        "true",
        "false",
        "1",
        "0",
        "y",
        "n",
      ].includes(value.toLowerCase());
      if (!validYesNo) {
        return {
          isValid: false,
          error: `${label} must be yes/no, true/false, or 1/0`,
        };
      }
      break;

    case "dropdown":
      if (variable.options && !variable.options.includes(value)) {
        return {
          isValid: false,
          error: `${label} must be one of: ${variable.options.join(", ")}`,
        };
      }
      break;
  }

  return { isValid: true };
};

// Get input type and props for form fields
export const getInputProps = (label: string) => {
  const variable = LOG_LABELS.find((v) => v.label === label);
  if (!variable) {
    return { type: "text" as const, placeholder: "Enter value..." };
  }

  const { type, constraints } = variable;

  switch (type) {
    case "number":
      return {
        type: "number" as const,
        min: constraints?.min,
        max: constraints?.max,
        step: "any",
        placeholder: constraints?.unit
          ? `Enter ${constraints.unit}...`
          : "Enter number...",
      };

    case "scale":
      return {
        type: "number" as const,
        min: constraints?.scaleMin,
        max: constraints?.scaleMax,
        step: 1,
        placeholder: `${constraints?.scaleMin || 1}-${
          constraints?.scaleMax || 10
        }`,
      };

    case "time":
      return {
        type: "time" as const,
        placeholder: "HH:MM",
      };

    case "text":
      return {
        type: "text" as const,
        maxLength: constraints?.maxLength,
        placeholder: "Enter text...",
      };

    case "yesno":
      return {
        type: "text" as const,
        placeholder: "yes/no, true/false, or 1/0",
      };

    case "dropdown":
      return {
        type: "text" as const,
        placeholder: `Choose: ${variable.options?.join(", ")}`,
      };

    default:
      return { type: "text" as const, placeholder: "Enter value..." };
  }
};
