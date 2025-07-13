const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixRoutineFunctions() {
  console.log("🔧 Applying routine database functions...");

  console.log(
    "📋 The following SQL needs to be executed in your Supabase SQL Editor:"
  );
  console.log("👉 Go to: Supabase Dashboard → SQL Editor");
  console.log("👉 Copy and paste the SQL below");
  console.log("👉 Click 'Run' to execute");

  console.log("\n" + "=".repeat(80));
  console.log("-- ROUTINE FUNCTIONS FIX");
  console.log("-- Copy this entire block and run it in Supabase SQL Editor");
  console.log("=".repeat(80));

  const routineFunctionsSQL = `
-- Function to get user's active routines with time and variable info
CREATE OR REPLACE FUNCTION get_user_routines(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    routine_name TEXT,
    notes TEXT,
    is_active BOOLEAN,
    weekdays INTEGER[],
    last_auto_logged TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    times JSONB -- Array of times with their variables
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.routine_name,
        dr.notes,
        dr.is_active,
        dr.weekdays,
        dr.last_auto_logged,
        dr.created_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'time_id', rt.id,
                    'time_of_day', rt.time_of_day,
                    'time_name', rt.time_name,
                    'is_active', rt.is_active,
                    'display_order', rt.display_order,
                    'variables', (
                        SELECT COALESCE(
                            jsonb_agg(
                                jsonb_build_object(
                                    'variable_id', rtv.variable_id,
                                    'variable_name', v.label,
                                    'variable_slug', v.slug,
                                    'default_value', rtv.default_value,
                                    'default_unit', rtv.default_unit,
                                    'display_order', rtv.display_order
                                ) ORDER BY rtv.display_order
                            ) FILTER (WHERE rtv.id IS NOT NULL),
                            '[]'::jsonb
                        )
                        FROM routine_time_variables rtv
                        LEFT JOIN variables v ON rtv.variable_id = v.id
                        WHERE rtv.routine_time_id = rt.id
                    )
                ) ORDER BY rt.display_order, rt.time_of_day
            ) FILTER (WHERE rt.id IS NOT NULL),
            '[]'::jsonb
        ) as times
    FROM daily_routines dr
    LEFT JOIN routine_times rt ON dr.id = rt.routine_id
    WHERE dr.user_id = p_user_id
    GROUP BY dr.id, dr.routine_name, dr.notes, dr.is_active, dr.weekdays, dr.last_auto_logged, dr.created_at
    ORDER BY dr.routine_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new routine with times and variables
CREATE OR REPLACE FUNCTION create_routine(p_routine_data JSONB)
RETURNS UUID AS $$
DECLARE
    new_routine_id UUID;
    time_data JSONB;
    variable_data JSONB;
    new_time_id UUID;
BEGIN
    -- Insert the routine
    INSERT INTO daily_routines (
        user_id,
        routine_name,
        notes,
        weekdays
    ) VALUES (
        (p_routine_data->>'user_id')::UUID,
        p_routine_data->>'routine_name',
        p_routine_data->>'notes',
        (p_routine_data->>'weekdays')::INTEGER[]
    ) RETURNING id INTO new_routine_id;
    
    -- Insert times
    FOR time_data IN SELECT * FROM jsonb_array_elements(p_routine_data->'times')
    LOOP
        INSERT INTO routine_times (
            routine_id,
            time_of_day,
            time_name,
            is_active,
            display_order
        ) VALUES (
            new_routine_id,
            (time_data->>'time_of_day')::TIME,
            time_data->>'time_name',
            COALESCE((time_data->>'is_active')::BOOLEAN, true),
            (time_data->>'display_order')::INTEGER
        ) RETURNING id INTO new_time_id;
        
        -- Insert variables for this time
        FOR variable_data IN SELECT * FROM jsonb_array_elements(time_data->'variables')
        LOOP
            INSERT INTO routine_time_variables (
                routine_time_id,
                variable_id,
                default_value,
                default_unit,
                display_order
            ) VALUES (
                new_time_id,
                (variable_data->>'variable_id')::UUID,
                variable_data->>'default_value',
                variable_data->>'default_unit',
                (variable_data->>'display_order')::INTEGER
            );
        END LOOP;
    END LOOP;
    
    RETURN new_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update an existing routine with times and variables
CREATE OR REPLACE FUNCTION update_routine(p_routine_id UUID, p_routine_data JSONB)
RETURNS VOID AS $$
DECLARE
    time_data JSONB;
    variable_data JSONB;
    new_time_id UUID;
BEGIN
    -- Update the routine
    UPDATE daily_routines SET
        routine_name = p_routine_data->>'routine_name',
        notes = p_routine_data->>'notes',
        weekdays = (p_routine_data->>'weekdays')::INTEGER[],
        updated_at = NOW()
    WHERE id = p_routine_id;
    
    -- Delete existing times (cascades to variables)
    DELETE FROM routine_times WHERE routine_id = p_routine_id;
    
    -- Insert new times
    FOR time_data IN SELECT * FROM jsonb_array_elements(p_routine_data->'times')
    LOOP
        INSERT INTO routine_times (
            routine_id,
            time_of_day,
            time_name,
            is_active,
            display_order
        ) VALUES (
            p_routine_id,
            (time_data->>'time_of_day')::TIME,
            time_data->>'time_name',
            COALESCE((time_data->>'is_active')::BOOLEAN, true),
            (time_data->>'display_order')::INTEGER
        ) RETURNING id INTO new_time_id;
        
        -- Insert variables for this time
        FOR variable_data IN SELECT * FROM jsonb_array_elements(time_data->'variables')
        LOOP
            INSERT INTO routine_time_variables (
                routine_time_id,
                variable_id,
                default_value,
                default_unit,
                display_order
            ) VALUES (
                new_time_id,
                (variable_data->>'variable_id')::UUID,
                variable_data->>'default_value',
                variable_data->>'default_unit',
                (variable_data->>'display_order')::INTEGER
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a routine
CREATE OR REPLACE FUNCTION delete_routine(p_routine_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM daily_routines WHERE id = p_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle routine active status
CREATE OR REPLACE FUNCTION toggle_routine_active(p_routine_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE daily_routines 
    SET is_active = p_is_active, updated_at = NOW()
    WHERE id = p_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle routine time active status
CREATE OR REPLACE FUNCTION toggle_routine_time_active(p_time_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE routine_times 
    SET is_active = p_is_active
    WHERE id = p_time_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

  console.log(routineFunctionsSQL);
  console.log("=".repeat(80));

  console.log(
    "\n🔍 After running the SQL above, the routine creation should work!"
  );
  console.log(
    "💡 If you get any errors about missing tables, you may also need to run:"
  );
  console.log("   database/daily_routines_multi_time_schema.sql");
  console.log("   (which contains the table definitions)");
}

fixRoutineFunctions();
