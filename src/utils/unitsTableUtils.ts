import { Unit, Variable } from "../types/variables";

// ============================================================================
// UNITS TABLE UTILITIES
// ============================================================================
// These utilities work with the units table from the database

// Cache for units data to avoid repeated API calls
let unitsCache: Unit[] | null = null;
let unitsCacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch units from the database
export async function fetchUnits(): Promise<Unit[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (unitsCache && (now - unitsCacheTimestamp) < CACHE_DURATION) {
    return unitsCache;
  }

  try {
    const response = await fetch('/api/units');
    if (!response.ok) {
      throw new Error('Failed to fetch units');
    }
    
    const units = await response.json();
    
    // Update cache
    unitsCache = units;
    unitsCacheTimestamp = now;
    
    return units;
  } catch (error) {
    console.error('Error fetching units:', error);
    // Return empty array if fetch fails
    return [];
  }
}

// Get units by group
export async function getUnitsByGroup(groupName: string): Promise<Unit[]> {
  const units = await fetchUnits();
  return units.filter(unit => unit.unit_group === groupName);
}

// Get base unit for a group
export async function getBaseUnit(groupName: string): Promise<Unit | null> {
  const units = await fetchUnits();
  return units.find(unit => unit.unit_group === groupName && unit.is_base) || null;
}

// Get unit by ID
export async function getUnitById(unitId: string): Promise<Unit | null> {
  const units = await fetchUnits();
  return units.find(unit => unit.id === unitId) || null;
}

// Get all unit groups
export async function getUnitGroups(): Promise<string[]> {
  const units = await fetchUnits();
  const groups = new Set(units.map(unit => unit.unit_group));
  return Array.from(groups).sort();
}

// Get convertible units for a given unit
export async function getConvertibleUnits(unitId: string): Promise<Unit[]> {
  const units = await fetchUnits();
  const targetUnit = units.find(unit => unit.id === unitId);
  
  if (!targetUnit) return [];
  
  return units.filter(unit => 
    unit.unit_group === targetUnit.unit_group && 
    unit.id !== unitId
  );
}

// Check if two units are convertible
export async function areUnitsConvertible(unitId1: string, unitId2: string): Promise<boolean> {
  const units = await fetchUnits();
  const unit1 = units.find(unit => unit.id === unitId1);
  const unit2 = units.find(unit => unit.id === unitId2);
  
  return !!(unit1 && unit2 && unit1.unit_group === unit2.unit_group);
}

// Convert value between units
export async function convertUnit(
  value: number, 
  fromUnitId: string, 
  toUnitId: string
): Promise<number> {
  const units = await fetchUnits();
  const fromUnit = units.find(unit => unit.id === fromUnitId);
  const toUnit = units.find(unit => unit.id === toUnitId);
  
  if (!fromUnit || !toUnit || fromUnit.unit_group !== toUnit.unit_group) {
    return value; // Return original value if conversion not possible
  }
  
  // Handle temperature conversions (special case)
  if (fromUnit.unit_group === 'temperature') {
    if (fromUnitId === '°C' && toUnitId === '°F') {
      return (value * 9/5) + 32;
    } else if (fromUnitId === '°F' && toUnitId === '°C') {
      return (value - 32) * 5/9;
    } else if (fromUnitId === '°C' && toUnitId === 'K') {
      return value + 273.15;
    } else if (fromUnitId === 'K' && toUnitId === '°C') {
      return value - 273.15;
    } else if (fromUnitId === '°F' && toUnitId === 'K') {
      return (value - 32) * 5/9 + 273.15;
    } else if (fromUnitId === 'K' && toUnitId === '°F') {
      return (value - 273.15) * 9/5 + 32;
    }
  }
  
  // Handle score conversions
  if (fromUnit.unit_group === 'score' && fromUnit.conversion_factor) {
    return value * fromUnit.conversion_factor;
  }
  
  // Handle boolean conversions (1:1)
  if (fromUnit.unit_group === 'boolean') {
    return value;
  }
  
  // Standard conversion using conversion factors
  if (fromUnit.conversion_to === toUnitId && fromUnit.conversion_factor) {
    return value * fromUnit.conversion_factor;
  } else if (toUnit.conversion_to === fromUnitId && toUnit.conversion_factor) {
    return value / toUnit.conversion_factor;
  } else if (fromUnit.conversion_to === toUnit.conversion_to && 
             fromUnit.conversion_factor && toUnit.conversion_factor) {
    return (value * fromUnit.conversion_factor) / toUnit.conversion_factor;
  }
  
  return value; // Return original value if no conversion found
}

// Get unit display info for UI components
export interface UnitDisplayInfo {
  unit: Unit;
  icon: string;
  category: string;
  isConvertible: boolean;
  convertibleUnits: Unit[];
}

export async function getUnitDisplayInfo(unitId: string): Promise<UnitDisplayInfo | null> {
  const unit = await getUnitById(unitId);
  if (!unit) return null;
  
  const convertibleUnits = await getConvertibleUnits(unitId);
  
  // Map unit groups to icons
  const groupIcons: Record<string, string> = {
    mass: "⚖️",
    volume: "🥤",
    time: "⏰",
    temperature: "🌡️",
    distance: "📏",
    speed: "🏃‍♂️",
    pressure: "🩺",
    frequency: "🔄",
    percentage: "📊",
    boolean: "🔘",
    score: "⭐"
  };
  
  return {
    unit,
    icon: groupIcons[unit.unit_group] || "📊",
    category: unit.unit_group,
    isConvertible: convertibleUnits.length > 0,
    convertibleUnits
  };
}

// Generate variable unit configuration for creation
export async function generateVariableUnitConfig(
  selectedUnitId: string,
  dataType: string
): Promise<{
  canonical_unit: string;
  unit_group: string | null;
  convertible_units: string[] | null;
  default_display_unit: string;
}> {
  const units = await fetchUnits();
  const selectedUnit = units.find(unit => unit.id === selectedUnitId);
  
  if (!selectedUnit) {
    return {
      canonical_unit: selectedUnitId,
      unit_group: null,
      convertible_units: null,
      default_display_unit: selectedUnitId
    };
  }
  
  if (dataType === "boolean") {
    // Boolean units always get the full boolean group
    const booleanUnits = units.filter(unit => unit.unit_group === 'boolean');
    return {
      canonical_unit: selectedUnit.is_base ? selectedUnit.id : 'true/false',
      unit_group: 'boolean',
      convertible_units: booleanUnits.map(unit => unit.id),
      default_display_unit: selectedUnitId
    };
  }
  
  // Get all units in the same group
  const groupUnits = units.filter(unit => unit.unit_group === selectedUnit.unit_group);
  const baseUnit = groupUnits.find(unit => unit.is_base);
  
  return {
    canonical_unit: baseUnit?.id || selectedUnit.id,
    unit_group: selectedUnit.unit_group,
    convertible_units: groupUnits.map(unit => unit.id),
    default_display_unit: selectedUnitId
  };
}

// Get suggested units for a variable based on its current unit
export async function getSuggestedUnits(variable: Variable): Promise<Unit[]> {
  if (!variable.canonical_unit) return [];
  
  const units = await fetchUnits();
  const baseUnit = units.find(unit => unit.id === variable.canonical_unit);
  
  if (!baseUnit) return [];
  
  // Get all units in the same group
  const groupUnits = units.filter(unit => unit.unit_group === baseUnit.unit_group);
  
  // Sort by common usage (base unit first, then by label)
  return groupUnits.sort((a, b) => {
    if (a.is_base && !b.is_base) return -1;
    if (!a.is_base && b.is_base) return 1;
    return a.label.localeCompare(b.label);
  });
}

// Validate unit references in a variable
export async function validateVariableUnits(variable: Variable): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const units = await fetchUnits();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check canonical_unit
  if (variable.canonical_unit && !units.find(unit => unit.id === variable.canonical_unit)) {
    errors.push(`Invalid canonical_unit: ${variable.canonical_unit}`);
  }
  
  // Check default_display_unit
  if (variable.default_display_unit && !units.find(unit => unit.id === variable.default_display_unit)) {
    errors.push(`Invalid default_display_unit: ${variable.default_display_unit}`);
  }
  
  // Check convertible_units
  if (variable.convertible_units) {
    for (const unitId of variable.convertible_units) {
      if (!units.find(unit => unit.id === unitId)) {
        errors.push(`Invalid convertible_unit: ${unitId}`);
      }
    }
  }
  
  // Check unit_group consistency
  if (variable.canonical_unit && variable.unit_group) {
    const canonicalUnit = units.find(unit => unit.id === variable.canonical_unit);
    if (canonicalUnit && canonicalUnit.unit_group !== variable.unit_group) {
      warnings.push(`Unit group mismatch: canonical_unit ${variable.canonical_unit} belongs to group ${canonicalUnit.unit_group}, but variable has group ${variable.unit_group}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Clear the units cache (useful for testing or when data changes)
export function clearUnitsCache(): void {
  unitsCache = null;
  unitsCacheTimestamp = 0;
} 