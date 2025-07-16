import { Variable } from "../types/variables";

// Unit group definitions with conversion capabilities
export interface UnitGroup {
  name: string;
  description: string;
  units: string[];
  conversionBase: string; // The canonical unit for storage
  icon?: string;
  category: string;
}

export const UNIT_GROUPS: Record<string, UnitGroup> = {
  mass: {
    name: "Mass/Weight",
    description: "Units for measuring weight and mass",
    units: ["kg", "lb", "g", "oz", "mg", "mcg"],
    conversionBase: "kg",
    icon: "⚖️",
    category: "Physical"
  },
  volume: {
    name: "Volume",
    description: "Units for measuring liquid and volume",
    units: ["L", "ml", "cups", "fl oz", "gal", "pt"],
    conversionBase: "L",
    icon: "🥤", 
    category: "Physical"
  },
  time: {
    name: "Time",
    description: "Units for measuring duration and time",
    units: ["hours", "minutes", "seconds", "days", "weeks", "months"],
    conversionBase: "hours",
    icon: "⏰",
    category: "Temporal"
  },
  temperature: {
    name: "Temperature",
    description: "Units for measuring temperature",
    units: ["°C", "°F", "K"],
    conversionBase: "°C",
    icon: "🌡️",
    category: "Physical"
  },
  distance: {
    name: "Distance",
    description: "Units for measuring length and distance",
    units: ["km", "mi", "m", "ft", "cm", "in"],
    conversionBase: "m",
    icon: "📏",
    category: "Physical"
  },
  speed: {
    name: "Speed",
    description: "Units for measuring velocity and speed",
    units: ["mph", "km/h", "m/s", "knots"],
    conversionBase: "m/s",
    icon: "🏃‍♂️",
    category: "Physical"
  },
  pressure: {
    name: "Pressure",
    description: "Units for measuring pressure",
    units: ["mmHg", "kPa", "psi", "bar"],
    conversionBase: "mmHg",
    icon: "🩺",
    category: "Medical"
  },
  frequency: {
    name: "Frequency",
    description: "Units for measuring occurrence frequency",
    units: ["per day", "per week", "per month", "per year", "times", "Hz"],
    conversionBase: "per day",
    icon: "🔄",
    category: "Temporal"
  },
  boolean: {
    name: "Boolean",
    description: "Units for yes/no, true/false values",
    units: ["true/false", "yes/no", "0/1", "on/off"],
    conversionBase: "true/false",
    icon: "🔘",
    category: "Logical"
  },
  subjective: {
    name: "Subjective",
    description: "Units for ratings, scores, and subjective measures",
    units: ["rating", "score", "level", "points", "stars"],
    conversionBase: "rating",
    icon: "⭐",
    category: "Subjective"
  },
  general: {
    name: "General",
    description: "Generic units for counting and general measurements",
    units: ["units", "pieces", "items", "count", "percentage", "%"],
    conversionBase: "units",
    icon: "📊",
    category: "General"
  }
};

// Get unit group for a specific unit
export function getUnitGroupForUnit(unit: string): UnitGroup | null {
  for (const [groupKey, group] of Object.entries(UNIT_GROUPS)) {
    if (group.units.includes(unit)) {
      return group;
    }
  }
  return null;
}

// Get all convertible units for a given unit
export function getConvertibleUnits(unit: string): string[] {
  const group = getUnitGroupForUnit(unit);
  return group ? group.units.filter(u => u !== unit) : [];
}

// Get unit group name for a unit
export function getUnitGroupName(unit: string): string | null {
  const group = getUnitGroupForUnit(unit);
  return group ? group.name : null;
}

// Check if two units are in the same group (convertible)
export function areUnitsConvertible(unit1: string, unit2: string): boolean {
  const group1 = getUnitGroupForUnit(unit1);
  const group2 = getUnitGroupForUnit(unit2);
  return !!(group1 && group2 && group1 === group2);
}

// Get unit group icon
export function getUnitGroupIcon(unit: string): string {
  const group = getUnitGroupForUnit(unit);
  return group?.icon || "📊";
}

// Get suggested convertible units for a variable based on its current unit
export function getSuggestedConvertibleUnits(variable: Variable): string[] {
  if (!variable.canonical_unit) return [];
  
  const group = getUnitGroupForUnit(variable.canonical_unit);
  if (!group) return [variable.canonical_unit];
  
  // Return the most commonly used units from the group
  const commonUnits: Record<string, string[]> = {
    mass: ["kg", "lb", "g"],
    volume: ["L", "ml", "cups"],
    time: ["hours", "minutes", "seconds"],
    temperature: ["°C", "°F"],
    distance: ["km", "mi", "m"],
    speed: ["mph", "km/h"],
    boolean: ["true/false", "yes/no", "0/1"],
    subjective: ["rating", "score"],
    general: ["units", "percentage"]
  };
  
  const groupKey = Object.keys(UNIT_GROUPS).find(key => UNIT_GROUPS[key] === group);
  return groupKey ? (commonUnits[groupKey] || group.units) : [variable.canonical_unit];
}

// Generate conversion preview text
export function getConversionPreview(value: number, fromUnit: string, toUnit: string): string {
  // Simple conversion factors for preview (more comprehensive conversion would be in backend)
  const conversions: Record<string, Record<string, number | ((val: number) => number)>> = {
    kg: { lb: 2.20462, g: 1000 },
    lb: { kg: 0.453592, oz: 16 },
    g: { kg: 0.001, mg: 1000 },
    L: { ml: 1000, "fl oz": 33.814 },
    ml: { L: 0.001, "fl oz": 0.033814 },
    hours: { minutes: 60, seconds: 3600 },
    minutes: { hours: 0.016667, seconds: 60 },
    "°C": { "°F": (val: number) => (val * 9/5) + 32 },
    "°F": { "°C": (val: number) => (val - 32) * 5/9 },
  };

  const conversionMap = conversions[fromUnit];
  if (!conversionMap || !conversionMap[toUnit]) {
    return `${value} ${fromUnit}`;
  }

  const factor = conversionMap[toUnit];
  let convertedValue: number;
  
  if (typeof factor === 'function') {
    convertedValue = factor(value);
  } else {
    convertedValue = value * factor;
  }

  // Round to reasonable precision
  const roundedValue = Math.round(convertedValue * 100) / 100;
  return `${roundedValue} ${toUnit}`;
}

// Get unit display info for UI components
export interface UnitDisplayInfo {
  unit: string;
  group?: UnitGroup;
  icon: string;
  category: string;
  isConvertible: boolean;
  convertibleUnits: string[];
}

export function getUnitDisplayInfo(unit: string): UnitDisplayInfo {
  const group = getUnitGroupForUnit(unit);
  const convertibleUnits = getConvertibleUnits(unit);
  
  return {
    unit,
    group: group || undefined,
    icon: getUnitGroupIcon(unit),
    category: group?.category || "General",
    isConvertible: convertibleUnits.length > 0,
    convertibleUnits
  };
}

// Generate variable unit configuration for creation
export function generateVariableUnitConfig(
  selectedUnit: string,
  dataType: string
): {
  canonical_unit: string;
  unit_group: string | null;
  convertible_units: string[] | null;
  default_display_unit: string;
} {
  const group = getUnitGroupForUnit(selectedUnit);
  
  if (dataType === "boolean" || selectedUnit.includes("/")) {
    // Boolean units always get the full boolean group
    return {
      canonical_unit: "true/false",
      unit_group: "boolean", 
      convertible_units: ["true/false", "yes/no", "0/1"],
      default_display_unit: selectedUnit
    };
  }
  
  if (group) {
    return {
      canonical_unit: group.conversionBase,
      unit_group: Object.keys(UNIT_GROUPS).find(key => UNIT_GROUPS[key] === group) || null,
      convertible_units: group.units,
      default_display_unit: selectedUnit
    };
  }
  
  // Custom unit without group
  return {
    canonical_unit: selectedUnit,
    unit_group: null,
    convertible_units: null,
    default_display_unit: selectedUnit
  };
} 