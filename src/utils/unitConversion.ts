// Unit Conversion Utilities

import { Unit, UnitGroup, ConversionResult, UnitConversionRequest } from '@/types/variables';

// Temperature conversion requires special handling due to offsets
export function convertTemperature(value: number, fromUnit: string, toUnit: string): number {
  // Convert to Celsius first (base unit)
  let celsius: number;
  
  switch (fromUnit.toLowerCase()) {
    case 'celsius':
    case 'c':
      celsius = value;
      break;
    case 'fahrenheit':
    case 'f':
      celsius = (value - 32) * 5/9;
      break;
    case 'kelvin':
    case 'k':
      celsius = value - 273.15;
      break;
    default:
      throw new Error(`Unknown temperature unit: ${fromUnit}`);
  }
  
  // Convert from Celsius to target unit
  switch (toUnit.toLowerCase()) {
    case 'celsius':
    case 'c':
      return celsius;
    case 'fahrenheit':
    case 'f':
      return (celsius * 9/5) + 32;
    case 'kelvin':
    case 'k':
      return celsius + 273.15;
    default:
      throw new Error(`Unknown temperature unit: ${toUnit}`);
  }
}

// Standard unit conversion using factor-based conversion
export function convertUnit(
  value: number,
  fromUnit: Unit,
  toUnit: Unit,
  precision: number = 2
): ConversionResult {
  // If same unit, return as-is
  if (fromUnit.code === toUnit.code) {
    return {
      value: value,
      unit: toUnit,
      formatted: formatValue(value, precision, toUnit.symbol)
    };
  }
  
  // Check if units are in the same group
  if (fromUnit.unit_group_id !== toUnit.unit_group_id) {
    throw new Error(`Cannot convert between different unit groups: ${fromUnit.code} to ${toUnit.code}`);
  }
  
  // Special handling for temperature
  if (fromUnit.unit_group_id && fromUnit.unit_group_id.includes('temperature')) {
    const convertedValue = convertTemperature(value, fromUnit.code, toUnit.code);
    return {
      value: convertedValue,
      unit: toUnit,
      formatted: formatValue(convertedValue, precision, toUnit.symbol)
    };
  }
  
  // Standard factor-based conversion
  // Convert to base unit first, then to target unit
  const baseValue = value * fromUnit.conversion_factor + fromUnit.conversion_offset;
  const targetValue = (baseValue - toUnit.conversion_offset) / toUnit.conversion_factor;
  
  const roundedValue = Math.round(targetValue * Math.pow(10, precision)) / Math.pow(10, precision);
  
  return {
    value: roundedValue,
    unit: toUnit,
    formatted: formatValue(roundedValue, precision, toUnit.symbol)
  };
}

// Convert value to canonical (base) unit for storage
export function convertToCanonical(value: number, unit: Unit): number {
  if (unit.is_base_unit) {
    return value;
  }
  
  // Special handling for temperature
  if (unit.unit_group_id && unit.unit_group_id.includes('temperature')) {
    return convertTemperature(value, unit.code, 'celsius');
  }
  
  // Standard conversion to base unit
  return value * unit.conversion_factor + unit.conversion_offset;
}

// Convert canonical value to user's preferred unit
export function convertFromCanonical(
  canonicalValue: number,
  targetUnit: Unit,
  precision: number = 2
): ConversionResult {
  if (targetUnit.is_base_unit) {
    return {
      value: canonicalValue,
      unit: targetUnit,
      formatted: formatValue(canonicalValue, precision, targetUnit.symbol)
    };
  }
  
  // Special handling for temperature
  if (targetUnit.unit_group_id && targetUnit.unit_group_id.includes('temperature')) {
    const convertedValue = convertTemperature(canonicalValue, 'celsius', targetUnit.code);
    return {
      value: convertedValue,
      unit: targetUnit,
      formatted: formatValue(convertedValue, precision, targetUnit.symbol)
    };
  }
  
  // Standard conversion from base unit
  const targetValue = (canonicalValue - targetUnit.conversion_offset) / targetUnit.conversion_factor;
  const roundedValue = Math.round(targetValue * Math.pow(10, precision)) / Math.pow(10, precision);
  
  return {
    value: roundedValue,
    unit: targetUnit,
    formatted: formatValue(roundedValue, precision, targetUnit.symbol)
  };
}

// Format value with appropriate precision and unit symbol
export function formatValue(value: number, precision: number, unitSymbol: string): string {
  const formattedValue = precision === 0 ? 
    Math.round(value).toString() : 
    value.toFixed(precision);
  
  return unitSymbol ? `${formattedValue} ${unitSymbol}` : formattedValue;
}

// Get available units for a unit group
export function getUnitsForGroup(units: Unit[], unitGroupId: string): Unit[] {
  return units.filter(unit => unit.unit_group_id === unitGroupId);
}

// Find unit by code
export function findUnitByCode(units: Unit[], code: string): Unit | undefined {
  return units.find(unit => unit.code === code);
}

// Get base unit for a unit group
export function getBaseUnit(units: Unit[], unitGroupId: string): Unit | undefined {
  return units.find(unit => unit.unit_group_id === unitGroupId && unit.is_base_unit);
}

// Validate if two units are convertible
export function areUnitsConvertible(unit1: Unit, unit2: Unit): boolean {
  return unit1.unit_group_id === unit2.unit_group_id;
}

// Get conversion factor between two units (for display purposes)
export function getConversionFactor(fromUnit: Unit, toUnit: Unit): number {
  if (!areUnitsConvertible(fromUnit, toUnit)) {
    throw new Error(`Units ${fromUnit.code} and ${toUnit.code} are not convertible`);
  }
  
  // For temperature, we need to handle this differently
  if (fromUnit.unit_group_id && fromUnit.unit_group_id.includes('temperature')) {
    // Return 1 as temperature conversion is not linear
    return 1;
  }
  
  return fromUnit.conversion_factor / toUnit.conversion_factor;
}

// Bulk conversion utility
export function convertValues(
  values: number[],
  fromUnit: Unit,
  toUnit: Unit,
  precision: number = 2
): ConversionResult[] {
  return values.map(value => convertUnit(value, fromUnit, toUnit, precision));
}

// Auto-detect best unit for display (e.g., show km instead of m for large distances)
export function suggestDisplayUnit(
  value: number,
  currentUnit: Unit,
  availableUnits: Unit[]
): Unit {
  // If no alternatives, return current unit
  const alternatives = availableUnits.filter(unit => 
    unit.unit_group_id === currentUnit.unit_group_id
  );
  
  if (alternatives.length <= 1) {
    return currentUnit;
  }
  
  // Convert to base unit for comparison
  const baseValue = convertToCanonical(value, currentUnit);
  
  // Find the unit that gives the most readable value (between 0.1 and 1000)
  let bestUnit = currentUnit;
  let bestScore = Math.abs(Math.log10(Math.abs(value) + 0.001));
  
  for (const unit of alternatives) {
    const convertedResult = convertFromCanonical(baseValue, unit);
    const score = Math.abs(Math.log10(Math.abs(convertedResult.value) + 0.001));
    
    // Prefer values between 0.1 and 1000
    if (convertedResult.value >= 0.1 && convertedResult.value <= 1000 && score < bestScore) {
      bestUnit = unit;
      bestScore = score;
    }
  }
  
  return bestUnit;
}

// Unit conversion API wrapper
export class UnitConverter {
  private units: Unit[];
  private unitGroups: UnitGroup[];
  
  constructor(units: Unit[], unitGroups: UnitGroup[]) {
    this.units = units;
    this.unitGroups = unitGroups;
  }
  
  convert(request: UnitConversionRequest): ConversionResult {
    const fromUnit = this.findUnit(request.fromUnit);
    const toUnit = this.findUnit(request.toUnit);
    
    if (!fromUnit) {
      throw new Error(`Unknown unit: ${request.fromUnit}`);
    }
    
    if (!toUnit) {
      throw new Error(`Unknown unit: ${request.toUnit}`);
    }
    
    return convertUnit(request.value, fromUnit, toUnit, request.precision);
  }
  
  convertToCanonical(value: number, unitCode: string): number {
    const unit = this.findUnit(unitCode);
    if (!unit) {
      throw new Error(`Unknown unit: ${unitCode}`);
    }
    
    return convertToCanonical(value, unit);
  }
  
  convertFromCanonical(canonicalValue: number, unitCode: string, precision: number = 2): ConversionResult {
    const unit = this.findUnit(unitCode);
    if (!unit) {
      throw new Error(`Unknown unit: ${unitCode}`);
    }
    
    return convertFromCanonical(canonicalValue, unit, precision);
  }
  
  getUnitsForGroup(groupName: string): Unit[] {
    const group = this.unitGroups.find(g => g.name === groupName);
    if (!group) {
      return [];
    }
    
    return this.units.filter(unit => unit.unit_group_id === group.id);
  }
  
  getBaseUnit(groupName: string): Unit | undefined {
    const group = this.unitGroups.find(g => g.name === groupName);
    if (!group) {
      return undefined;
    }
    
    return this.units.find(unit => unit.unit_group_id === group.id && unit.is_base_unit);
  }
  
  suggestDisplayUnit(value: number, currentUnitCode: string): Unit {
    const currentUnit = this.findUnit(currentUnitCode);
    if (!currentUnit) {
      throw new Error(`Unknown unit: ${currentUnitCode}`);
    }
    
    const availableUnits = this.units.filter(unit => 
      unit.unit_group_id === currentUnit.unit_group_id
    );
    
    return suggestDisplayUnit(value, currentUnit, availableUnits);
  }
  
  private findUnit(code: string): Unit | undefined {
    return this.units.find(unit => unit.code === code);
  }
}

// Predefined conversion shortcuts for common conversions
export const COMMON_CONVERSIONS = {
  // Weight
  kgToLb: (kg: number) => kg * 2.20462,
  lbToKg: (lb: number) => lb * 0.453592,
  
  // Distance
  kmToMi: (km: number) => km * 0.621371,
  miToKm: (mi: number) => mi * 1.60934,
  
  // Temperature
  celsiusToFahrenheit: (c: number) => (c * 9/5) + 32,
  fahrenheitToCelsius: (f: number) => (f - 32) * 5/9,
  
  // Time
  hoursToMinutes: (hours: number) => hours * 60,
  minutesToHours: (minutes: number) => minutes / 60,
  
  // Volume
  litersToOz: (liters: number) => liters * 33.814,
  ozToLiters: (oz: number) => oz / 33.814,
};

// Validation helpers
export function validateUnitConversion(fromUnit: Unit, toUnit: Unit): string | null {
  if (!areUnitsConvertible(fromUnit, toUnit)) {
    return `Cannot convert from ${fromUnit.name} to ${toUnit.name} - different unit types`;
  }
  
  return null;
}

export function validateConversionValue(value: number): string | null {
  if (isNaN(value) || !isFinite(value)) {
    return 'Invalid numeric value';
  }
  
  return null;
}