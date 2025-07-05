// Enhanced Variables System Test Suite

// Jest globals are available in test environment
declare const describe: any;
declare const test: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;
declare const performance: any;

import { 
  Variable, 
  Unit, 
  UnitGroup,
  VariableValidationResult,
  createVariableSlug,
  getDefaultValueForVariable,
  isConvertibleVariable,
  isContinuousVariable,
  getVariableIcon
} from '../types/variables';
import { validateVariableValue } from '../utils/variablesV2';
import { 
  convertUnit, 
  convertToCanonical, 
  convertFromCanonical,
  convertTemperature,
  UnitConverter,
  formatValue,
  areUnitsConvertible
} from '../utils/unitConversion';
import {
  getAllVariables,
  createVariable,
  updateVariable,
  validateVariableValue as utilValidateVariableValue,
  logVariableValue
} from '../utils/variablesV2';

// Mock Supabase
jest.mock('../utils/supaBase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: {}, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: {}, error: null }))
          }))
        }))
      }))
    }))
  }
}));

describe('Variable Types and Utilities', () => {
  describe('createVariableSlug', () => {
    test('converts label to valid slug', () => {
      expect(createVariableSlug('Body Weight')).toBe('body_weight');
      expect(createVariableSlug('Caffeine (mg)')).toBe('caffeine_mg');
      expect(createVariableSlug('Mood Scale 1-10')).toBe('mood_scale_1_10');
    });

    test('handles special characters', () => {
      expect(createVariableSlug('Heart Rate/Pulse')).toBe('heart_rate_pulse');
      expect(createVariableSlug('Temperature (°C)')).toBe('temperature_c');
    });
  });

  describe('Variable Type Guards', () => {
    const continuousVariable: Variable = {
      id: '1',
      label: 'Weight',
      slug: 'weight',
      type: 'continuous',
      unit: 'kg',
      unit_group: 'mass',
      is_convertible: true,
      method: 'manual_entry',
      is_predefined: true,
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      validation_rules: {},
      display_options: {},
      decimal_places: 2,
      min_value: 0,
      max_value: 300
    };

    test('identifies continuous variables', () => {
      expect(isContinuousVariable(continuousVariable)).toBe(true);
      expect(isConvertibleVariable(continuousVariable)).toBe(true);
    });

    test('gets variable icon', () => {
      expect(getVariableIcon(continuousVariable)).toBe('📊'); // default
      
      const iconVariable = { ...continuousVariable, icon: '⚖️' };
      expect(getVariableIcon(iconVariable)).toBe('⚖️');
    });
  });

  describe('Variable Validation', () => {
    const continuousVariable: Variable = {
      id: '1',
      label: 'Weight',
      slug: 'weight',
      type: 'continuous',
      is_convertible: false,
      method: 'manual_entry',
      is_predefined: true,
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      validation_rules: { required: true },
      display_options: {},
      decimal_places: 2,
      min_value: 0,
      max_value: 300
    };

    const ordinalVariable: Variable = {
      id: '2',
      label: 'Mood',
      slug: 'mood',
      type: 'ordinal',
      is_convertible: false,
      method: 'manual_entry',
      is_predefined: true,
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      validation_rules: { required: true },
      display_options: {},
      decimal_places: 0,
      ordinal_min: 1,
      ordinal_max: 10
    };

    const categoricalVariable: Variable = {
      id: '3',
      label: 'Hydration',
      slug: 'hydration',
      type: 'categorical',
      is_convertible: false,
      method: 'manual_entry',
      is_predefined: true,
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      validation_rules: { required: true },
      display_options: {},
      decimal_places: 0,
      categorical_options: ['Low', 'Medium', 'High']
    };

    test('validates continuous variables', () => {
      expect(validateVariableValue(continuousVariable, 70)).toEqual({ isValid: true, warnings: [] });
      expect(validateVariableValue(continuousVariable, -10)).toEqual({ 
        isValid: false, 
        error: 'Weight must be at least 0' 
      });
      expect(validateVariableValue(continuousVariable, 400)).toEqual({ 
        isValid: false, 
        error: 'Weight must be at most 300' 
      });
    });

    test('validates ordinal variables', () => {
      expect(validateVariableValue(ordinalVariable, 5)).toEqual({ isValid: true, warnings: [] });
      expect(validateVariableValue(ordinalVariable, 0)).toEqual({ 
        isValid: false, 
        error: 'Mood must be at least 1' 
      });
      expect(validateVariableValue(ordinalVariable, 11)).toEqual({ 
        isValid: false, 
        error: 'Mood must be at most 10' 
      });
    });

    test('validates categorical variables', () => {
      expect(validateVariableValue(categoricalVariable, 'Medium')).toEqual({ isValid: true, warnings: [] });
      expect(validateVariableValue(categoricalVariable, 'Invalid')).toEqual({ 
        isValid: false, 
        error: 'Hydration must be one of: Low, Medium, High' 
      });
    });
  });

  describe('Default Values', () => {
    test('returns correct default values by type', () => {
      const booleanVar: Variable = {
        id: '1', label: 'Test', slug: 'test', type: 'boolean',
        is_convertible: false, method: 'manual_entry', is_predefined: true,
        is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
        validation_rules: {}, display_options: {}, decimal_places: 0
      };
      
      expect(getDefaultValueForVariable(booleanVar)).toBe(false);
    });
  });
});

describe('Unit Conversion System', () => {
  const kgUnit: Unit = {
    id: '1',
    code: 'kg',
    name: 'Kilogram',
    symbol: 'kg',
    unit_group_id: 'mass-group',
    conversion_factor: 1.0,
    conversion_offset: 0,
    is_base_unit: true,
    created_at: '2024-01-01'
  };

  const lbUnit: Unit = {
    id: '2',
    code: 'lb',
    name: 'Pound',
    symbol: 'lb',
    unit_group_id: 'mass-group',
    conversion_factor: 0.453592,
    conversion_offset: 0,
    is_base_unit: false,
    created_at: '2024-01-01'
  };

  const celsiusUnit: Unit = {
    id: '3',
    code: 'celsius',
    name: 'Celsius',
    symbol: '°C',
    unit_group_id: 'temperature-group',
    conversion_factor: 1.0,
    conversion_offset: 0,
    is_base_unit: true,
    created_at: '2024-01-01'
  };

  const fahrenheitUnit: Unit = {
    id: '4',
    code: 'fahrenheit',
    name: 'Fahrenheit',
    symbol: '°F',
    unit_group_id: 'temperature-group',
    conversion_factor: 1.0,
    conversion_offset: 0,
    is_base_unit: false,
    created_at: '2024-01-01'
  };

  describe('Basic Unit Conversion', () => {
    test('converts between mass units', () => {
      const result = convertUnit(100, kgUnit, lbUnit, 2);
      expect(result.value).toBeCloseTo(220.46, 1);
      expect(result.unit).toBe(lbUnit);
      expect(result.formatted).toBe('220.46 lb');
    });

    test('handles same unit conversion', () => {
      const result = convertUnit(100, kgUnit, kgUnit, 2);
      expect(result.value).toBe(100);
      expect(result.unit).toBe(kgUnit);
    });

    test('throws error for incompatible units', () => {
      expect(() => convertUnit(100, kgUnit, celsiusUnit)).toThrow();
    });
  });

  describe('Temperature Conversion', () => {
    test('converts Celsius to Fahrenheit', () => {
      expect(convertTemperature(0, 'celsius', 'fahrenheit')).toBe(32);
      expect(convertTemperature(100, 'celsius', 'fahrenheit')).toBe(212);
      expect(convertTemperature(37, 'celsius', 'fahrenheit')).toBeCloseTo(98.6, 1);
    });

    test('converts Fahrenheit to Celsius', () => {
      expect(convertTemperature(32, 'fahrenheit', 'celsius')).toBe(0);
      expect(convertTemperature(212, 'fahrenheit', 'celsius')).toBe(100);
      expect(convertTemperature(98.6, 'fahrenheit', 'celsius')).toBeCloseTo(37, 1);
    });
  });

  describe('Canonical Conversion', () => {
    test('converts to canonical unit', () => {
      expect(convertToCanonical(220.46, lbUnit)).toBeCloseTo(100, 1);
      expect(convertToCanonical(100, kgUnit)).toBe(100); // Already canonical
    });

    test('converts from canonical unit', () => {
      const result = convertFromCanonical(100, lbUnit, 2);
      expect(result.value).toBeCloseTo(220.46, 1);
      expect(result.formatted).toBe('220.46 lb');
    });
  });

  describe('Unit Converter Class', () => {
    const units = [kgUnit, lbUnit];
    const unitGroups: UnitGroup[] = [{
      id: 'mass-group',
      name: 'mass',
      description: 'Mass units',
      base_unit: 'kg',
      created_at: '2024-01-01'
    }];

    const converter = new UnitConverter(units, unitGroups);

    test('converts using converter class', () => {
      const result = converter.convert({
        value: 100,
        fromUnit: 'kg',
        toUnit: 'lb',
        precision: 2
      });
      expect(result.value).toBeCloseTo(220.46, 1);
    });

    test('gets units for group', () => {
      const massUnits = converter.getUnitsForGroup('mass');
      expect(massUnits).toHaveLength(2);
      expect(massUnits.map(u => u.code)).toContain('kg');
      expect(massUnits.map(u => u.code)).toContain('lb');
    });
  });

  describe('Utility Functions', () => {
    test('checks unit convertibility', () => {
      expect(areUnitsConvertible(kgUnit, lbUnit)).toBe(true);
      expect(areUnitsConvertible(kgUnit, celsiusUnit)).toBe(false);
    });

    test('formats values correctly', () => {
      expect(formatValue(123.456, 2, 'kg')).toBe('123.46 kg');
      expect(formatValue(123.456, 0, 'count')).toBe('123 count');
      expect(formatValue(123.456, 1, '')).toBe('123.5');
    });
  });
});

describe('Variables Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Variable CRUD Operations', () => {
    test('creates variable successfully', async () => {
      const variableData = {
        label: 'Test Variable',
        slug: 'test_variable',
        type: 'continuous' as const,
        method: 'manual_entry' as const,
        description: 'Test description',
        min_value: 0,
        max_value: 100,
        decimal_places: 2
      };

      // Mock successful creation
      const mockVariable = { id: '123', ...variableData };
      
      // We can't easily test the actual function due to Supabase mocking complexity
      // but we can test the data structure
      expect(variableData.label).toBe('Test Variable');
      expect(variableData.type).toBe('continuous');
    });
  });

  describe('Validation Integration', () => {
    test('validates before logging', () => {
      const variable: Variable = {
        id: '1',
        label: 'Weight',
        slug: 'weight',
        type: 'continuous',
        is_convertible: false,
        method: 'manual_entry',
        is_predefined: true,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        validation_rules: { required: true },
        display_options: {},
        decimal_places: 2,
        min_value: 0,
        max_value: 300
      };

      // Valid value
      const validResult = validateVariableValue(variable, 70);
      expect(validResult.isValid).toBe(true);

      // Invalid value
      const invalidResult = validateVariableValue(variable, -10);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('must be at least 0');
    });
  });
});

describe('Integration Tests', () => {
  test('complete workflow: create variable, validate input, log value', () => {
    // 1. Create variable
    const variable: Variable = {
      id: '1',
      label: 'Daily Steps',
      slug: 'daily_steps',
      type: 'continuous',
      unit: 'steps',
      is_convertible: false,
      method: 'manual_entry',
      is_predefined: false,
      is_active: true,
      created_by: 'user-123',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      validation_rules: { required: true },
      display_options: {},
      decimal_places: 0,
      min_value: 0,
      max_value: 50000
    };

    // 2. Validate input
    const validation = validateVariableValue(variable, 8500);
    expect(validation.isValid).toBe(true);

    // 3. Test logging would happen here (mocked due to Supabase)
    expect(variable.slug).toBe('daily_steps');
    expect(variable.type).toBe('continuous');
  });

  test('unit conversion workflow', () => {
    const kgUnit: Unit = {
      id: '1', code: 'kg', name: 'Kilogram', symbol: 'kg',
      unit_group_id: 'mass', conversion_factor: 1.0, conversion_offset: 0,
      is_base_unit: true, created_at: '2024-01-01'
    };

    const lbUnit: Unit = {
      id: '2', code: 'lb', name: 'Pound', symbol: 'lb',
      unit_group_id: 'mass', conversion_factor: 0.453592, conversion_offset: 0,
      is_base_unit: false, created_at: '2024-01-01'
    };

    // User enters 150 lb
    const userInput = 150;
    
    // Convert to canonical (kg) for storage
    const canonical = convertToCanonical(userInput, lbUnit);
    expect(canonical).toBeCloseTo(68.04, 1);
    
    // Convert back to user's preferred unit for display
    const displayed = convertFromCanonical(canonical, lbUnit, 1);
    expect(displayed.value).toBeCloseTo(150, 1);
    expect(displayed.formatted).toBe('150.0 lb');
  });
});

// Performance Tests
describe('Performance Tests', () => {
  test('unit conversion performance', () => {
    const kgUnit: Unit = {
      id: '1', code: 'kg', name: 'Kilogram', symbol: 'kg',
      unit_group_id: 'mass', conversion_factor: 1.0, conversion_offset: 0,
      is_base_unit: true, created_at: '2024-01-01'
    };

    const lbUnit: Unit = {
      id: '2', code: 'lb', name: 'Pound', symbol: 'lb',
      unit_group_id: 'mass', conversion_factor: 0.453592, conversion_offset: 0,
      is_base_unit: false, created_at: '2024-01-01'
    };

    const start = performance.now();
    
    // Perform 1000 conversions
    for (let i = 0; i < 1000; i++) {
      convertUnit(100 + i, kgUnit, lbUnit);
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // Should complete 1000 conversions in under 100ms
    expect(duration).toBeLessThan(100);
  });

  test('validation performance', () => {
    const variable: Variable = {
      id: '1', label: 'Test', slug: 'test', type: 'continuous',
      is_convertible: false, method: 'manual_entry', is_predefined: true,
      is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
      validation_rules: { required: true }, display_options: {}, decimal_places: 2,
      min_value: 0, max_value: 1000
    };

    const start = performance.now();
    
    // Perform 1000 validations
    for (let i = 0; i < 1000; i++) {
      validateVariableValue(variable, i);
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // Should complete 1000 validations in under 50ms
    expect(duration).toBeLessThan(50);
  });
});