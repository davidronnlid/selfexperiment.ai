const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateToMultiTimeRoutines() {
  console.log("🔄 Starting migration to multi-time routines...");

  try {
    // Step 1: Create new tables
    console.log("📋 Creating new tables...");

    const { error: createTablesError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Create routine_times table
        CREATE TABLE IF NOT EXISTS routine_times (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE,
          time_of_day TIME NOT NULL,
          time_name TEXT,
          is_active BOOLEAN DEFAULT true,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(routine_id, time_of_day),
          CONSTRAINT routine_times_time_of_day_check CHECK (time_of_day IS NOT NULL)
        );

        -- Create routine_time_variables table
        CREATE TABLE IF NOT EXISTS routine_time_variables (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          routine_time_id UUID REFERENCES routine_times(id) ON DELETE CASCADE,
          variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
          default_value TEXT NOT NULL,
          default_unit TEXT,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(routine_time_id, variable_id),
          CONSTRAINT routine_time_variables_default_value_check CHECK (default_value IS NOT NULL AND default_value != '')
        );

        -- Update routine_log_history table
        ALTER TABLE routine_log_history 
        ADD COLUMN IF NOT EXISTS routine_time_id UUID REFERENCES routine_times(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS routine_time_variable_id UUID REFERENCES routine_time_variables(id) ON DELETE CASCADE;
      `,
    });

    if (createTablesError) {
      throw createTablesError;
    }

    // Step 2: Create indexes
    console.log("📊 Creating indexes...");

    const { error: createIndexesError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Routine times indexes
        CREATE INDEX IF NOT EXISTS idx_routine_times_routine_id ON routine_times(routine_id);
        CREATE INDEX IF NOT EXISTS idx_routine_times_time_of_day ON routine_times(time_of_day);
        CREATE INDEX IF NOT EXISTS idx_routine_times_is_active ON routine_times(is_active);
        CREATE INDEX IF NOT EXISTS idx_routine_times_display_order ON routine_times(display_order);

        -- Routine time variables indexes
        CREATE INDEX IF NOT EXISTS idx_routine_time_variables_routine_time_id ON routine_time_variables(routine_time_id);
        CREATE INDEX IF NOT EXISTS idx_routine_time_variables_variable_id ON routine_time_variables(variable_id);
        CREATE INDEX IF NOT EXISTS idx_routine_time_variables_display_order ON routine_time_variables(display_order);

        -- Routine log history indexes
        CREATE INDEX IF NOT EXISTS idx_routine_log_history_routine_time_id ON routine_log_history(routine_time_id);
        CREATE INDEX IF NOT EXISTS idx_routine_log_history_routine_time_variable_id ON routine_log_history(routine_time_variable_id);
      `,
    });

    if (createIndexesError) {
      throw createIndexesError;
    }

    // Step 3: Set up RLS policies
    console.log("🔒 Setting up RLS policies...");

    const { error: createPoliciesError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Routine times policies
        ALTER TABLE routine_times ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view routine times for their routines" ON routine_times;
        CREATE POLICY "Users can view routine times for their routines" ON routine_times
          FOR SELECT USING (EXISTS (
            SELECT 1 FROM daily_routines dr 
            WHERE dr.id = routine_times.routine_id 
            AND dr.user_id = auth.uid()
          ));

        DROP POLICY IF EXISTS "Users can create routine times for their routines" ON routine_times;
        CREATE POLICY "Users can create routine times for their routines" ON routine_times
          FOR INSERT WITH CHECK (EXISTS (
            SELECT 1 FROM daily_routines dr 
            WHERE dr.id = routine_times.routine_id 
            AND dr.user_id = auth.uid()
          ));

        DROP POLICY IF EXISTS "Users can update routine times for their routines" ON routine_times;
        CREATE POLICY "Users can update routine times for their routines" ON routine_times
          FOR UPDATE USING (EXISTS (
            SELECT 1 FROM daily_routines dr 
            WHERE dr.id = routine_times.routine_id 
            AND dr.user_id = auth.uid()
          ));

        DROP POLICY IF EXISTS "Users can delete routine times for their routines" ON routine_times;
        CREATE POLICY "Users can delete routine times for their routines" ON routine_times
          FOR DELETE USING (EXISTS (
            SELECT 1 FROM daily_routines dr 
            WHERE dr.id = routine_times.routine_id 
            AND dr.user_id = auth.uid()
          ));

        -- Routine time variables policies
        ALTER TABLE routine_time_variables ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view routine time variables for their routines" ON routine_time_variables;
        CREATE POLICY "Users can view routine time variables for their routines" ON routine_time_variables
          FOR SELECT USING (EXISTS (
            SELECT 1 FROM routine_times rt
            JOIN daily_routines dr ON rt.routine_id = dr.id
            WHERE rt.id = routine_time_variables.routine_time_id 
            AND dr.user_id = auth.uid()
          ));

        DROP POLICY IF EXISTS "Users can create routine time variables for their routines" ON routine_time_variables;
        CREATE POLICY "Users can create routine time variables for their routines" ON routine_time_variables
          FOR INSERT WITH CHECK (EXISTS (
            SELECT 1 FROM routine_times rt
            JOIN daily_routines dr ON rt.routine_id = dr.id
            WHERE rt.id = routine_time_variables.routine_time_id 
            AND dr.user_id = auth.uid()
          ));

        DROP POLICY IF EXISTS "Users can update routine time variables for their routines" ON routine_time_variables;
        CREATE POLICY "Users can update routine time variables for their routines" ON routine_time_variables
          FOR UPDATE USING (EXISTS (
            SELECT 1 FROM routine_times rt
            JOIN daily_routines dr ON rt.routine_id = dr.id
            WHERE rt.id = routine_time_variables.routine_time_id 
            AND dr.user_id = auth.uid()
          ));

        DROP POLICY IF EXISTS "Users can delete routine time variables for their routines" ON routine_time_variables;
        CREATE POLICY "Users can delete routine time variables for their routines" ON routine_time_variables
          FOR DELETE USING (EXISTS (
            SELECT 1 FROM routine_times rt
            JOIN daily_routines dr ON rt.routine_id = dr.id
            WHERE rt.id = routine_time_variables.routine_time_id 
            AND dr.user_id = auth.uid()
          ));
      `,
    });

    if (createPoliciesError) {
      throw createPoliciesError;
    }

    // Step 4: Migrate existing routines
    console.log("🔄 Migrating existing routines...");

    // Get all existing routines
    const { data: existingRoutines, error: fetchError } = await supabase.from(
      "daily_routines"
    ).select(`
        id,
        user_id,
        routine_name,
        notes,
        default_time,
        weekdays,
        is_active,
        created_at,
        updated_at,
        last_auto_logged,
        routine_variables (
          variable_id,
          default_value,
          default_unit,
          display_order
        )
      `);

    if (fetchError) {
      throw fetchError;
    }

    console.log(
      `Found ${existingRoutines.length} existing routines to migrate`
    );

    for (const routine of existingRoutines) {
      console.log(`Migrating routine: ${routine.routine_name}`);

      // Create a routine time for the existing default_time
      const { data: timeData, error: timeError } = await supabase
        .from("routine_times")
        .insert({
          routine_id: routine.id,
          time_of_day: routine.default_time || "10:00:00",
          time_name: "Default",
          is_active: true,
          display_order: 0,
        })
        .select()
        .single();

      if (timeError) {
        console.error(
          `Error creating time for routine ${routine.id}:`,
          timeError
        );
        continue;
      }

      // Migrate variables to the new time
      if (routine.routine_variables && routine.routine_variables.length > 0) {
        for (const variable of routine.routine_variables) {
          const { error: variableError } = await supabase
            .from("routine_time_variables")
            .insert({
              routine_time_id: timeData.id,
              variable_id: variable.variable_id,
              default_value: variable.default_value,
              default_unit: variable.default_unit,
              display_order: variable.display_order,
            });

          if (variableError) {
            console.error(
              `Error migrating variable ${variable.variable_id} for routine ${routine.id}:`,
              variableError
            );
          }
        }
      }
    }

    // Step 5: Update functions
    console.log("🔧 Updating database functions...");

    const { error: updateFunctionsError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Update create_routine_auto_logs function
        CREATE OR REPLACE FUNCTION create_routine_auto_logs(target_date DATE DEFAULT CURRENT_DATE)
        RETURNS TABLE(routine_id UUID, routine_name TEXT, time_name TEXT, variable_name TEXT, auto_logged BOOLEAN, error_message TEXT) AS $$
        DECLARE
            routine_record RECORD;
            time_record RECORD;
            variable_record RECORD;
            log_exists BOOLEAN;
            manual_log_exists BOOLEAN;
            target_weekday INTEGER;
        BEGIN
            -- Get the weekday for the target date (1=Monday, 7=Sunday)
            target_weekday := EXTRACT(dow FROM target_date);
            -- Convert to 1-7 format (PostgreSQL uses 0=Sunday, so we need to adjust)
            IF target_weekday = 0 THEN
                target_weekday := 7;
            END IF;
            
            -- Loop through all active routines
            FOR routine_record IN 
                SELECT dr.id, dr.routine_name, dr.user_id, dr.weekdays
                FROM daily_routines dr
                WHERE dr.is_active = true
                AND (dr.last_auto_logged IS NULL OR dr.last_auto_logged::date < target_date)
                AND target_weekday = ANY(dr.weekdays)
            LOOP
                -- Loop through all active times for this routine
                FOR time_record IN
                    SELECT rt.id, rt.time_of_day, rt.time_name, rt.is_active
                    FROM routine_times rt
                    WHERE rt.routine_id = routine_record.id
                    AND rt.is_active = true
                    ORDER BY rt.display_order, rt.time_of_day
                LOOP
                    -- Loop through all variables for this routine time
                    FOR variable_record IN
                        SELECT rtv.*, v.label as variable_name, v.slug as variable_slug
                        FROM routine_time_variables rtv
                        JOIN variables v ON rtv.variable_id = v.id
                        WHERE rtv.routine_time_id = time_record.id
                        ORDER BY rtv.display_order
                    LOOP
                        -- Check if auto-log already exists for this date and time-variable
                        SELECT EXISTS(
                            SELECT 1 FROM routine_log_history 
                            WHERE routine_time_variable_id = variable_record.id 
                            AND log_date = target_date
                        ) INTO log_exists;
                        
                        -- Check if manual log exists for this variable/date
                        SELECT EXISTS(
                            SELECT 1 FROM variable_logs vl
                            WHERE vl.user_id = routine_record.user_id 
                            AND vl.variable_id = variable_record.variable_id
                            AND vl.logged_at::date = target_date
                            AND vl.source = 'manual'
                        ) INTO manual_log_exists;
                        
                        -- If no auto-log exists and no manual override, create auto-log
                        IF NOT log_exists AND NOT manual_log_exists THEN
                            -- Insert auto-log into variable_logs
                            INSERT INTO variable_logs (
                                user_id, 
                                variable_id, 
                                display_value, 
                                display_unit, 
                                source, 
                                logged_at,
                                notes
                            ) VALUES (
                                routine_record.user_id,
                                variable_record.variable_id,
                                variable_record.default_value,
                                variable_record.default_unit,
                                'routine',
                                target_date::timestamp + time_record.time_of_day,
                                routine_record.notes
                            );
                            
                            -- Record in routine log history
                            INSERT INTO routine_log_history (
                                routine_id,
                                routine_time_id,
                                routine_time_variable_id,
                                user_id,
                                variable_id,
                                log_date,
                                auto_logged_value,
                                auto_logged_unit,
                                final_value,
                                final_unit
                            ) VALUES (
                                routine_record.id,
                                time_record.id,
                                variable_record.id,
                                routine_record.user_id,
                                variable_record.variable_id,
                                target_date,
                                variable_record.default_value,
                                variable_record.default_unit,
                                variable_record.default_value,
                                variable_record.default_unit
                            );
                            
                            -- Return success
                            routine_id := routine_record.id;
                            routine_name := routine_record.routine_name;
                            time_name := COALESCE(time_record.time_name, time_record.time_of_day::text);
                            variable_name := variable_record.variable_name;
                            auto_logged := true;
                            error_message := NULL;
                            RETURN NEXT;
                        ELSE
                            -- Return skipped info
                            routine_id := routine_record.id;
                            routine_name := routine_record.routine_name;
                            time_name := COALESCE(time_record.time_name, time_record.time_of_day::text);
                            variable_name := variable_record.variable_name;
                            auto_logged := false;
                            error_message := CASE 
                                WHEN log_exists THEN 'Auto-log already exists'
                                WHEN manual_log_exists THEN 'Manual log exists - skipped'
                                ELSE 'Unknown reason'
                            END;
                            RETURN NEXT;
                        END IF;
                    END LOOP;
                END LOOP;
                
                -- Update last auto-logged timestamp for the routine
                UPDATE daily_routines 
                SET last_auto_logged = NOW()
                WHERE id = routine_record.id;
            END LOOP;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Update get_user_routines function
        CREATE OR REPLACE FUNCTION get_user_routines(p_user_id UUID)
        RETURNS TABLE(
            id UUID,
            routine_name TEXT,
            notes TEXT,
            is_active BOOLEAN,
            weekdays INTEGER[],
            last_auto_logged TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE,
            times JSONB
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

        -- Update create_routine function
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

        -- Update update_routine function
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

        -- Add new function to toggle routine time active status
        CREATE OR REPLACE FUNCTION toggle_routine_time_active(p_time_id UUID, p_is_active BOOLEAN)
        RETURNS VOID AS $$
        BEGIN
            UPDATE routine_times 
            SET is_active = p_is_active
            WHERE id = p_time_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    });

    if (updateFunctionsError) {
      throw updateFunctionsError;
    }

    console.log("✅ Migration completed successfully!");
    console.log("📝 Next steps:");
    console.log(
      "1. Update the frontend components to use the new multi-time structure"
    );
    console.log("2. Test the new routine creation and management features");
    console.log("3. Verify that existing routines continue to work");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateToMultiTimeRoutines();
