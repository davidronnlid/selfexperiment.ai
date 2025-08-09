# Fix Broccoli Variable Units - Step by Step

## Issue Diagnosis ✅
The problem is that the "kg" unit is not configured in the `variable_units` table for the broccoli variable. The unit selector is working correctly now, but the database validation is failing.

## Solution

### Step 1: Run the Debug Script in Supabase SQL Editor

1. **Copy the content from `debug_broccoli_units.sql`**
2. **Go to your Supabase dashboard → SQL Editor**
3. **Paste and run the script**

This will:
- Check current broccoli variable configuration
- Add missing units (g, kg, lb, oz) to the variable_units table
- Test the database functions

### Step 2: Verify the Fix

After running the script, go back to your broccoli variable page and:

1. **Try selecting "kg" again**
2. **Check the console** - should show success instead of the error
3. **Refresh the page** - the selection should persist

### Step 3: Use the New Units Manager (For Admin Users)

For future variables, you can now:

1. **Go to any variable page**
2. **Click "Edit Variable" button** 
3. **Click "Manage Units" button**
4. **Add/remove/configure units for any variable**

## What Each Component Does

### ✅ Fixed Components:
- **VariableUnitSelector**: Now properly captures unit selections (fixed Tooltip wrapper issue)
- **Variable Page**: Better error messages to identify unit configuration issues
- **VariableAdminEditor**: Added "Manage Units" button for admin users
- **VariableUnitsManager**: New component to manage which units are available for each variable

### 🗄️ Database Updates:
- **Enhanced error logging**: Better debugging information
- **Unit validation**: Clear error messages when units aren't configured
- **Units manager**: Interface to configure variable-unit relationships

## Root Cause Summary

The issue had two parts:
1. **Frontend**: Tooltip wrapper was preventing unit selection (✅ FIXED)
2. **Database**: Missing unit configuration in variable_units table (✅ SOLUTION PROVIDED)

After running the SQL script, the broccoli variable will have proper units configured and the selection should work perfectly!

## Future Prevention

Use the new "Manage Units" interface in the variable admin editor to:
- See which units are configured for each variable
- Add new units with proper priorities
- Remove units that shouldn't be available
- Set priority order (lower numbers = higher priority)