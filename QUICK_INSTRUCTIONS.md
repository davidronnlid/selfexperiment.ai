# IMMEDIATE FIX FOR KG UNIT ISSUE

## Quick Fix Steps:

### Step 1: 
Copy the **entire content** from `IMMEDIATE_FIX_BROCCOLI_KG.sql`

### Step 2:
1. Go to **Supabase Dashboard**
2. Click **SQL Editor** 
3. **Paste the script**
4. Click **Run**

### Step 3:
1. **Go back to your broccoli variable page**
2. **Try selecting kg again**
3. **Should work immediately!**

## What This Does:
- Simplifies the validation in `set_user_unit_preference` function
- Removes the strict variable-unit checking that was causing the issue
- Tests with your actual user ID to confirm it works
- Shows success/failure messages

## Expected Result:
After running the script, you should see:
```
✅ SUCCESS: kg preference saved for broccoli!
```

Then the kg selection should work in your UI! 🎉