import { VariableUnit, Unit, Variable } from "../types/variables";

// ============================================================================
// VARIABLE UNITS UTILITIES
// ============================================================================
// These utilities work with the variable_units table for managing 
// many-to-many relationships between variables and units

// Cache for variable units data
let variableUnitsCache: Map<string, VariableUnit[]> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch variable units for a specific variable
export async function fetchVariableUnits(variableId: string): Promise<VariableUnit[]> {
  const now = Date.now();
  const cacheKey = `variable_${variableId}`;
  
  // Return cached data if still valid
  if (variableUnitsCache.has(cacheKey) && (now - cacheTimestamp) < CACHE_DURATION) {
    return variableUnitsCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`/api/variable-units?variable_id=${variableId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch variable units');
    }
    
    const variableUnits = await response.json();
    
    // Update cache
    variableUnitsCache.set(cacheKey, variableUnits);
    cacheTimestamp = now;
    
    return variableUnits;
  } catch (error) {
    console.error('Error fetching variable units:', error);
    return [];
  }
}

// Add a unit to a variable
export async function addVariableUnit(
  variableId: string,
  unitId: string,
  priority: number = 1,
  note?: string
): Promise<VariableUnit | null> {
  try {
    const response = await fetch('/api/variable-units', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variable_id: variableId,
        unit_id: unitId,
        priority,
        note
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add variable unit');
    }

    const newVariableUnit = await response.json();
    
    // Clear cache for this variable
    clearVariableUnitsCache(variableId);
    
    return newVariableUnit;
  } catch (error) {
    console.error('Error adding variable unit:', error);
    return null;
  }
}

// Update a variable unit relationship
export async function updateVariableUnit(
  variableId: string,
  unitId: string,
  updates: { priority?: number; note?: string }
): Promise<VariableUnit | null> {
  try {
    const response = await fetch('/api/variable-units', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variable_id: variableId,
        unit_id: unitId,
        ...updates
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update variable unit');
    }

    const updatedVariableUnit = await response.json();
    
    // Clear cache for this variable
    clearVariableUnitsCache(variableId);
    
    return updatedVariableUnit;
  } catch (error) {
    console.error('Error updating variable unit:', error);
    return null;
  }
}

// Remove a unit from a variable
export async function removeVariableUnit(
  variableId: string,
  unitId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/variable-units', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variable_id: variableId,
        unit_id: unitId
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove variable unit');
    }

    // Clear cache for this variable
    clearVariableUnitsCache(variableId);
    
    return true;
  } catch (error) {
    console.error('Error removing variable unit:', error);
    return false;
  }
}

// Get the primary (highest priority) unit for a variable
export async function getPrimaryVariableUnit(variableId: string): Promise<VariableUnit | null> {
  const variableUnits = await fetchVariableUnits(variableId);
  
  if (variableUnits.length === 0) return null;
  
  // Sort by priority (ascending) and return the first one
  return variableUnits.sort((a, b) => a.priority - b.priority)[0];
}

// Get available units for a variable (sorted by priority)
export async function getAvailableUnitsForVariable(variableId: string): Promise<Unit[]> {
  const variableUnits = await fetchVariableUnits(variableId);
  
  // Extract and sort units by priority
  return variableUnits
    .sort((a, b) => a.priority - b.priority)
    .map(vu => (vu as any).units) // The API includes joined unit data
    .filter(unit => unit); // Filter out any null units
}

// Set multiple units for a variable (replaces existing units)
export async function setVariableUnits(
  variableId: string,
  unitConfigs: { unitId: string; priority: number; note?: string }[]
): Promise<boolean> {
  try {
    // First, get existing variable units
    const existingUnits = await fetchVariableUnits(variableId);
    
    // Remove all existing units
    for (const existingUnit of existingUnits) {
      await removeVariableUnit(variableId, existingUnit.unit_id);
    }
    
    // Add new units
    for (const config of unitConfigs) {
      await addVariableUnit(variableId, config.unitId, config.priority, config.note);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting variable units:', error);
    return false;
  }
}

// Get the default display unit for a variable
export async function getDefaultDisplayUnit(variableId: string): Promise<Unit | null> {
  const primaryUnit = await getPrimaryVariableUnit(variableId);
  if (!primaryUnit) return null;
  
  // Return the unit data from the joined result
  return (primaryUnit as any).units || null;
}

// Check if a variable has a specific unit
export async function variableHasUnit(variableId: string, unitId: string): Promise<boolean> {
  const variableUnits = await fetchVariableUnits(variableId);
  return variableUnits.some(vu => vu.unit_id === unitId);
}

// Reorder variable units (update priorities)
export async function reorderVariableUnits(
  variableId: string,
  orderedUnitIds: string[]
): Promise<boolean> {
  try {
    // Update priority for each unit based on its position in the array
    for (let i = 0; i < orderedUnitIds.length; i++) {
      await updateVariableUnit(variableId, orderedUnitIds[i], { priority: i + 1 });
    }
    
    return true;
  } catch (error) {
    console.error('Error reordering variable units:', error);
    return false;
  }
}

// Get variables that use a specific unit
export async function getVariablesUsingUnit(unitId: string): Promise<Variable[]> {
  try {
    const response = await fetch(`/api/variable-units?unit_id=${unitId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch variables using unit');
    }
    
    const variableUnits = await response.json();
    
    // Extract and return unique variables
    const variables = variableUnits
      .map((vu: any) => vu.variables)
      .filter((variable: any) => variable);
    
    // Remove duplicates
    const uniqueVariables = variables.reduce((acc: Variable[], current: Variable) => {
      if (!acc.find(v => v.id === current.id)) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    return uniqueVariables;
  } catch (error) {
    console.error('Error fetching variables using unit:', error);
    return [];
  }
}

// Clear cache for a specific variable
export function clearVariableUnitsCache(variableId?: string): void {
  if (variableId) {
    variableUnitsCache.delete(`variable_${variableId}`);
  } else {
    // Clear all cache
    variableUnitsCache.clear();
    cacheTimestamp = 0;
  }
}

// Bulk add units to a variable with automatic priority assignment
export async function bulkAddVariableUnits(
  variableId: string,
  unitIds: string[],
  startPriority: number = 1
): Promise<boolean> {
  try {
    for (let i = 0; i < unitIds.length; i++) {
      await addVariableUnit(variableId, unitIds[i], startPriority + i);
    }
    return true;
  } catch (error) {
    console.error('Error bulk adding variable units:', error);
    return false;
  }
} 