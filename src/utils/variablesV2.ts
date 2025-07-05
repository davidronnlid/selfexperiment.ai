// Enhanced Variables System Utilities

import { supabase } from './supaBase';
import { 
  Variable, 
  Unit, 
  UnitGroup, 
  UserVariable, 
  UserUnitPreference,
  VariableFormData,
  VariableValidationResult,
  VariableFilter,
  VariableSort,
  DailyLogV2,
  LogEntryWithDetails
} from '@/types/variables';
import { UnitConverter, convertToCanonical, convertFromCanonical } from './unitConversion';

// Variables fetching and management
export async function getAllVariables(
  filter?: VariableFilter,
  sort?: VariableSort,
  page: number = 1,
  perPage: number = 100
): Promise<{
  variables: Variable[];
  total: number;
  page: number;
  per_page: number;
}> {
  let query = supabase.from('variables').select('*', { count: 'exact' });
  
  // Apply filters
  if (filter) {
    if (filter.categories && filter.categories.length > 0) {
      query = query.in('category', filter.categories);
    }
    
    if (filter.types && filter.types.length > 0) {
      query = query.in('type', filter.types);
    }
    
    if (filter.methods && filter.methods.length > 0) {
      query = query.in('method', filter.methods);
    }
    
    if (filter.is_convertible !== undefined) {
      query = query.eq('is_convertible', filter.is_convertible);
    }
    
    if (filter.is_predefined !== undefined) {
      query = query.eq('is_predefined', filter.is_predefined);
    }
    
    if (filter.is_active !== undefined) {
      query = query.eq('is_active', filter.is_active);
    }
    
    if (filter.created_by) {
      query = query.eq('created_by', filter.created_by);
    }
    
    if (filter.search_query) {
      query = query.or(`label.ilike.%${filter.search_query}%,description.ilike.%${filter.search_query}%`);
    }
  }
  
  // Apply sorting
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('label', { ascending: true });
  }
  
  // Apply pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch variables: ${error.message}`);
  }
  
  return {
    variables: data || [],
    total: count || 0,
    page,
    per_page: perPage
  };
}

export async function getVariableById(id: string): Promise<Variable | null> {
  const { data, error } = await supabase
    .from('variables')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch variable: ${error.message}`);
  }
  
  return data;
}

export async function getVariableBySlug(slug: string): Promise<Variable | null> {
  const { data, error } = await supabase
    .from('variables')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch variable: ${error.message}`);
  }
  
  return data;
}

export async function createVariable(
  variableData: VariableFormData,
  userId?: string
): Promise<Variable> {
  const { data, error } = await supabase
    .from('variables')
    .insert({
      ...variableData,
      created_by: userId || null,
      is_predefined: !userId, // System variables if no user specified
      validation_rules: variableData.categorical_options ? 
        { required: true, options: variableData.categorical_options } : 
        { required: true }
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create variable: ${error.message}`);
  }
  
  return data;
}

export async function updateVariable(
  id: string,
  updates: Partial<VariableFormData>
): Promise<Variable> {
  const { data, error } = await supabase
    .from('variables')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update variable: ${error.message}`);
  }
  
  return data;
}

export async function deleteVariable(id: string): Promise<void> {
  const { error } = await supabase
    .from('variables')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw new Error(`Failed to delete variable: ${error.message}`);
  }
}

// Units management
export async function getAllUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('name');
  
  if (error) {
    throw new Error(`Failed to fetch units: ${error.message}`);
  }
  
  return data || [];
}

export async function getAllUnitGroups(): Promise<UnitGroup[]> {
  const { data, error } = await supabase
    .from('unit_groups')
    .select('*')
    .order('name');
  
  if (error) {
    throw new Error(`Failed to fetch unit groups: ${error.message}`);
  }
  
  return data || [];
}

export async function getUnitsForGroup(groupId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('unit_group_id', groupId)
    .order('name');
  
  if (error) {
    throw new Error(`Failed to fetch units for group: ${error.message}`);
  }
  
  return data || [];
}

// User variables management
export async function getUserVariables(userId: string): Promise<UserVariable[]> {
  const { data, error } = await supabase
    .from('user_variables')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order');
  
  if (error) {
    throw new Error(`Failed to fetch user variables: ${error.message}`);
  }
  
  return data || [];
}

export async function getUserVariableWithDetails(userId: string): Promise<{
  variable: Variable;
  userVariable?: UserVariable;
  customUnit?: Unit;
}[]> {
  // Get all enabled variables for the user
  const { data: userVariables, error: userVarError } = await supabase
    .from('user_variables')
    .select(`
      *,
      variables (*)
    `)
    .eq('user_id', userId)
    .eq('is_enabled', true);
  
  if (userVarError) {
    throw new Error(`Failed to fetch user variables: ${userVarError.message}`);
  }
  
  // Get all predefined variables that user hasn't disabled
  const { data: predefinedVars, error: predefinedError } = await supabase
    .from('variables')
    .select('*')
    .eq('is_predefined', true)
    .eq('is_active', true);
  
  if (predefinedError) {
    throw new Error(`Failed to fetch predefined variables: ${predefinedError.message}`);
  }
  
  // Combine user variables and predefined variables
  const result: {
    variable: Variable;
    userVariable?: UserVariable;
    customUnit?: Unit;
  }[] = [];
  
  // Add user's custom variables
  if (userVariables) {
    for (const userVar of userVariables) {
      result.push({
        variable: (userVar as any).variables,
        userVariable: userVar,
        customUnit: undefined // TODO: Fetch custom unit if needed
      });
    }
  }
  
  // Add predefined variables that user hasn't customized
  if (predefinedVars) {
    for (const predefinedVar of predefinedVars) {
             const existingUserVar = userVariables?.find((uv: any) => uv.variable_id === predefinedVar.id);
      if (!existingUserVar) {
        result.push({
          variable: predefinedVar,
          userVariable: undefined,
          customUnit: undefined
        });
      }
    }
  }
  
  return result;
}

export async function updateUserVariable(
  userId: string,
  variableId: string,
  updates: Partial<UserVariable>
): Promise<UserVariable> {
  const { data, error } = await supabase
    .from('user_variables')
    .upsert({
      user_id: userId,
      variable_id: variableId,
      ...updates
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update user variable: ${error.message}`);
  }
  
  return data;
}

// User unit preferences
export async function getUserUnitPreferences(userId: string): Promise<UserUnitPreference[]> {
  const { data, error } = await supabase
    .from('user_unit_preferences')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to fetch user unit preferences: ${error.message}`);
  }
  
  return data || [];
}

export async function updateUserUnitPreference(
  userId: string,
  unitGroupId: string,
  preferredUnitId: string
): Promise<UserUnitPreference> {
  const { data, error } = await supabase
    .from('user_unit_preferences')
    .upsert({
      user_id: userId,
      unit_group_id: unitGroupId,
      preferred_unit_id: preferredUnitId
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update unit preference: ${error.message}`);
  }
  
  return data;
}

// Variable validation
export function validateVariableValue(
  variable: Variable,
  value: string | number | boolean
): VariableValidationResult {
  const warnings: string[] = [];
  
  // Type-specific validation
  switch (variable.type) {
    case 'continuous':
      const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
      if (isNaN(numValue)) {
        return { isValid: false, error: `${variable.label} must be a number` };
      }
      
      if (variable.min_value !== undefined && numValue < variable.min_value) {
        return { 
          isValid: false, 
          error: `${variable.label} must be at least ${variable.min_value}` 
        };
      }
      
      if (variable.max_value !== undefined && numValue > variable.max_value) {
        return { 
          isValid: false, 
          error: `${variable.label} must be at most ${variable.max_value}` 
        };
      }
      
      break;
    
    case 'ordinal':
      const ordinalValue = typeof value === 'string' ? parseInt(value) : Number(value);
      if (isNaN(ordinalValue)) {
        return { isValid: false, error: `${variable.label} must be a number` };
      }
      
      if (variable.ordinal_min !== undefined && ordinalValue < variable.ordinal_min) {
        return { 
          isValid: false, 
          error: `${variable.label} must be at least ${variable.ordinal_min}` 
        };
      }
      
      if (variable.ordinal_max !== undefined && ordinalValue > variable.ordinal_max) {
        return { 
          isValid: false, 
          error: `${variable.label} must be at most ${variable.ordinal_max}` 
        };
      }
      
      break;
    
    case 'categorical':
      const strValue = value.toString();
      if (variable.categorical_options && !variable.categorical_options.includes(strValue)) {
        return { 
          isValid: false, 
          error: `${variable.label} must be one of: ${variable.categorical_options.join(', ')}` 
        };
      }
      break;
    
    case 'boolean':
      if (typeof value !== 'boolean' && !['true', 'false', '1', '0', 'yes', 'no'].includes(value.toString().toLowerCase())) {
        return { 
          isValid: false, 
          error: `${variable.label} must be a boolean value (true/false, yes/no, 1/0)` 
        };
      }
      break;
  }
  
  // Check validation rules
  if (variable.validation_rules.required && (!value || value === '')) {
    return { isValid: false, error: `${variable.label} is required` };
  }
  
  return { isValid: true, warnings };
}

// Data logging
export async function logVariableValue(
  userId: string,
  variableId: string,
  value: number | string | boolean,
  unitId?: string,
  date?: Date,
  method: string = 'manual_entry'
): Promise<DailyLogV2> {
  const variable = await getVariableById(variableId);
  if (!variable) {
    throw new Error('Variable not found');
  }
  
  // Validate the value
  const validation = validateVariableValue(variable, value);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  // Convert to appropriate storage format
  let numericValue: number | null = null;
  let textValue: string | null = null;
  let canonicalValue: number | null = null;
  
  if (variable.type === 'continuous' || variable.type === 'ordinal') {
    numericValue = typeof value === 'string' ? parseFloat(value) : value as number;
    
    // Convert to canonical unit if needed
    if (variable.is_convertible && unitId) {
      const units = await getAllUnits();
      const unit = units.find(u => u.id === unitId);
      if (unit) {
        canonicalValue = convertToCanonical(numericValue, unit);
      }
    } else {
      canonicalValue = numericValue;
    }
  } else {
    textValue = value.toString();
  }
  
  const { data, error } = await supabase
    .from('daily_logs_v2')
    .insert({
      user_id: userId,
      variable_id: variableId,
      value: numericValue,
      text_value: textValue,
      unit_id: unitId,
      canonical_value: canonicalValue,
      date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      method,
      confidence: method === 'manual_entry' ? 1.0 : 0.8
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to log variable value: ${error.message}`);
  }
  
  return data;
}

// Data fetching with unit conversion
export async function getUserLogEntries(
  userId: string,
  variableId?: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number
): Promise<LogEntryWithDetails[]> {
  let query = supabase
    .from('daily_logs_v2')
    .select(`
      *,
      variables (*),
      units (*)
    `)
    .eq('user_id', userId);
  
  if (variableId) {
    query = query.eq('variable_id', variableId);
  }
  
  if (startDate) {
    query = query.gte('date', startDate.toISOString().split('T')[0]);
  }
  
  if (endDate) {
    query = query.lte('date', endDate.toISOString().split('T')[0]);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  query = query.order('date', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch log entries: ${error.message}`);
  }
  
  // Convert to user's preferred units
  const userPreferences = await getUserUnitPreferences(userId);
  const units = await getAllUnits();
  const unitGroups = await getAllUnitGroups();
  const converter = new UnitConverter(units, unitGroups);
  
  const result: LogEntryWithDetails[] = [];
  
  for (const entry of data || []) {
    const logEntry: LogEntryWithDetails = {
      ...entry,
      variable: (entry as any).variables,
      unit: (entry as any).units,
      display_value: entry.text_value || entry.value?.toString() || '',
      display_unit: (entry as any).units?.symbol || ''
    };
    
    // Convert to user's preferred unit if applicable
    if (entry.canonical_value && entry.variables.is_convertible) {
      const variable = entry.variables;
      const unitGroup = unitGroups.find(ug => ug.name === variable.unit_group);
      
      if (unitGroup) {
        const userPreference = userPreferences.find(up => up.unit_group_id === unitGroup.id);
        if (userPreference) {
          const preferredUnit = units.find(u => u.id === userPreference.preferred_unit_id);
          if (preferredUnit) {
            const converted = convertFromCanonical(entry.canonical_value, preferredUnit);
            logEntry.display_value = converted.formatted.split(' ')[0];
            logEntry.display_unit = preferredUnit.symbol;
          }
        }
      }
    }
    
    result.push(logEntry);
  }
  
  return result;
}

// Helper functions
export function getVariablesByCategory(variables: Variable[]): Record<string, Variable[]> {
  const grouped: Record<string, Variable[]> = {};
  
  for (const variable of variables) {
    const category = variable.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(variable);
  }
  
  return grouped;
}

export function getVariablesByType(variables: Variable[]): Record<string, Variable[]> {
  const grouped: Record<string, Variable[]> = {};
  
  for (const variable of variables) {
    if (!grouped[variable.type]) {
      grouped[variable.type] = [];
    }
    grouped[variable.type].push(variable);
  }
  
  return grouped;
}

export function searchVariables(variables: Variable[], query: string): Variable[] {
  const lowercaseQuery = query.toLowerCase();
  
  return variables.filter(variable =>
    variable.label.toLowerCase().includes(lowercaseQuery) ||
    variable.description?.toLowerCase().includes(lowercaseQuery) ||
    variable.category?.toLowerCase().includes(lowercaseQuery)
  );
}

// Migration helper to convert old LOG_LABELS to new variables
export function convertLogLabelToVariable(logLabel: any): VariableFormData {
  const typeMapping: Record<string, Variable['type']> = {
    'number': 'continuous',
    'scale': 'ordinal',
    'text': 'categorical',
    'time': 'categorical',
    'yesno': 'boolean',
    'dropdown': 'categorical'
  };
  
  const methodMapping: Record<string, Variable['method']> = {
    'manual': 'manual_entry',
    'oura': 'oura',
    'withings': 'withings'
  };
  
  return {
    label: logLabel.label,
    slug: logLabel.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    type: typeMapping[logLabel.type] || 'categorical',
    method: methodMapping[logLabel.source] || 'manual_entry',
    description: logLabel.description,
    icon: logLabel.icon,
    category: logLabel.category,
    categorical_options: logLabel.options,
    min_value: logLabel.constraints?.min,
    max_value: logLabel.constraints?.max,
    ordinal_min: logLabel.constraints?.scaleMin,
    ordinal_max: logLabel.constraints?.scaleMax,
    decimal_places: 2
  };
}