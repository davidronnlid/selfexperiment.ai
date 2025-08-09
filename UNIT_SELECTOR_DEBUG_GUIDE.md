# Unit Selector Debug Guide

## Issue Fixed ✅
The problem was that the `VariableUnitSelector` component wasn't properly syncing its internal state with the parent's `currentUnit` prop when user preferences were updated.

## Changes Made

### 1. VariableUnitSelector Component (`src/components/VariableUnitSelector.tsx`)

**Fixed Issues:**
- ✅ **State Synchronization**: Added `useEffect` to sync `selectedUnit` when `currentUnit` prop changes
- ✅ **Duplicate RPC Calls**: Removed duplicate `set_user_unit_preference` calls (parent handles saving)
- ✅ **Priority Logic**: Improved unit loading to prioritize `currentUnit` prop over internal fetching
- ✅ **Debug Logging**: Added console logs to trace the selection flow

**Key Changes:**
```tsx
// New: Sync selectedUnit when currentUnit prop changes
useEffect(() => {
  if (currentUnit && currentUnit !== selectedUnit) {
    setSelectedUnit(currentUnit);
  }
}, [currentUnit, selectedUnit]);

// Updated: Remove duplicate RPC call, let parent handle saving
const handleUnitChange = async (event: SelectChangeEvent) => {
  // ... existing logic ...
  // Removed: supabase.rpc("set_user_unit_preference", ...)
  onUnitChange(newUnitId, selectedUnitData.unit_group); // Parent handles saving
};
```

## How to Test

### 1. Check Browser Console
1. Navigate to a variable page (e.g., `/variable/broccoli`)
2. Open browser Developer Tools (F12) → Console
3. Select a different unit in the dropdown
4. Look for these debug messages:
   ```
   🔄 VariableUnitSelector: Unit change detected { newUnitId: "cups", ... }
   🔄 VariableUnitSelector: currentUnit prop changed { currentUnit: "cups", ... }
   ✅ VariableUnitSelector: Syncing selectedUnit to currentUnit { from: "g", to: "cups" }
   ```

### 2. Verify Unit Selection Persistence
1. Select a new unit (e.g., change from "Grams" to "Cups")
2. The dropdown should immediately show the new selection
3. Refresh the page
4. The dropdown should still show your selected unit

### 3. Test Multiple Variables
1. Test with different variables that have multiple units
2. Each variable should remember its own unit preference
3. Changes should be immediate and persistent

## Database Functions Status

✅ **Migration Applied**: `supabase/migrations/20250128000003_fix_user_unit_preferences_unified.sql`
- ✅ Fixed `set_user_unit_preference` function with JSONB storage
- ✅ Fixed `get_user_preferred_unit` function with proper priority (-1 for user preferences)
- ✅ Fixed `get_variable_units` function with correct ordering

## Flow Diagram

```
User Selects Unit → VariableUnitSelector.handleUnitChange() 
                 → onUnitChange(unitId, unitGroup)
                 → VariableePage.updateDisplayUnit()
                 → supabase.rpc('set_user_unit_preference')
                 → useUserDisplayUnit.refetch()
                 → VariableUnitSelector receives new currentUnit prop
                 → useEffect syncs selectedUnit
                 → UI updates to show selection ✅
```

## Troubleshooting

### If Unit Selection Still Not Working:

1. **Check Console for Errors**:
   - Look for RPC function errors
   - Database connection issues
   - Missing migration errors

2. **Verify Database Functions**:
   ```sql
   SELECT * FROM get_variable_units('your-variable-id');
   SELECT * FROM get_user_preferred_unit('your-user-id', 'your-variable-id');
   ```

3. **Check Network Tab**:
   - Verify RPC calls are being made
   - Check for 200 responses
   - Look for error responses

4. **Clear Browser Cache**:
   - Sometimes cached JavaScript can cause issues
   - Hard refresh (Ctrl+Shift+R)

## Expected Behavior

✅ **Before Fix**: Unit selection worked but UI didn't reflect the saved preference  
✅ **After Fix**: Unit selection works AND UI immediately shows the selected unit as preferred

The unit preference system now properly follows this priority:
1. **User Preference** (Priority -1, highest) ← Your saved choices
2. **Variable Units** (Priority 1, 2, 3...) ← Default fallbacks

Try selecting a different unit now - it should work correctly! 🎉