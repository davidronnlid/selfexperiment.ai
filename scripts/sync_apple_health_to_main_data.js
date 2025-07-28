const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAppleHealthToMainData() {
  console.log('🔄 Syncing Apple Health data to main data_points table...');

  // First, create variables in the main variables table for Apple Health data
  const appleHealthVariables = [
    { slug: 'ah_steps', label: 'Steps (Apple Health)', category: 'Physical Health', data_type: 'numeric' },
    { slug: 'ah_heart_rate', label: 'Heart Rate (Apple Health)', category: 'Physical Health', data_type: 'numeric' },
    { slug: 'ah_weight', label: 'Weight (Apple Health)', category: 'Physical Health', data_type: 'numeric' },
    { slug: 'ah_active_calories', label: 'Active Calories (Apple Health)', category: 'Physical Health', data_type: 'numeric' },
    { slug: 'ah_distance_walking_running', label: 'Walking Distance (Apple Health)', category: 'Physical Health', data_type: 'numeric' }
  ];

  console.log('📝 Creating/updating Apple Health variables in main variables table...');
  
  const variableMap = new Map(); // Maps ah_variable_id -> UUID

  for (const variable of appleHealthVariables) {
    try {
      // Try to find existing variable by slug
      const { data: existingVar, error: findError } = await supabase
        .from('variables')
        .select('id, slug')
        .eq('slug', variable.slug)
        .single();

      if (existingVar) {
        console.log(`✅ Found existing variable: ${variable.slug} -> ${existingVar.id}`);
        variableMap.set(variable.slug, existingVar.id);
      } else {
        // Create new variable
        const { data: newVar, error: createError } = await supabase
          .from('variables')
          .insert({
            slug: variable.slug,
            label: variable.label,
            category: variable.category,
            data_type: variable.data_type,
            is_active: true,
            is_public: false,
            variable_type: 'predefined'
          })
          .select('id, slug')
          .single();

        if (createError) {
          console.log(`⚠️  Error creating variable ${variable.slug}:`, createError.message);
        } else {
          console.log(`✅ Created new variable: ${variable.slug} -> ${newVar.id}`);
          variableMap.set(variable.slug, newVar.id);
        }
      }
    } catch (err) {
      console.log(`❌ Error processing variable ${variable.slug}:`, err.message);
    }
  }

  // Now sync Apple Health data to main data_points table
  console.log('\n🔄 Syncing Apple Health data points...');

  const { data: appleHealthData, error: fetchError } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching Apple Health data:', fetchError);
    return;
  }

  if (!appleHealthData || appleHealthData.length === 0) {
    console.log('ℹ️  No Apple Health data found to sync');
    return;
  }

  console.log(`📊 Found ${appleHealthData.length} Apple Health data points to sync`);

  let syncedCount = 0;
  let skippedCount = 0;

  for (const dataPoint of appleHealthData) {
    const mainVariableId = variableMap.get(dataPoint.variable_id);
    
    if (!mainVariableId) {
      console.log(`⚠️  No mapping found for variable: ${dataPoint.variable_id}`);
      skippedCount++;
      continue;
    }

    try {
      // Check if this data point already exists in main table
      const { data: existingDataPoint } = await supabase
        .from('data_points')
        .select('id')
        .eq('user_id', dataPoint.user_id)
        .eq('variable_id', mainVariableId)
        .eq('date', dataPoint.date)
        .single();

      if (existingDataPoint) {
        // Update existing
        const { error: updateError } = await supabase
          .from('data_points')
          .update({
            value: dataPoint.value,
            source: ['Apple Health'],
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDataPoint.id);

        if (updateError) {
          console.log(`⚠️  Error updating data point:`, updateError.message);
          skippedCount++;
        } else {
          syncedCount++;
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('data_points')
          .insert({
            user_id: dataPoint.user_id,
            variable_id: mainVariableId,
            date: dataPoint.date,
            value: dataPoint.value,
            source: ['Apple Health'],
            created_at: dataPoint.created_at,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.log(`⚠️  Error inserting data point:`, insertError.message);
          skippedCount++;
        } else {
          syncedCount++;
        }
      }
    } catch (err) {
      console.log(`❌ Error processing data point:`, err.message);
      skippedCount++;
    }
  }

  console.log(`\n🎉 Sync completed!`);
  console.log(`   ✅ Synced: ${syncedCount} data points`);
  console.log(`   ⚠️  Skipped: ${skippedCount} data points`);
  
  // Check final counts
  const { data: mainDataCount } = await supabase
    .from('data_points')
    .select('id', { count: 'exact', head: true })
    .in('source', [['Apple Health'], 'Apple Health']);

  console.log(`\n📊 Total Apple Health data points in main table: ${mainDataCount || 0}`);
}

// Also create a function to set up automatic syncing
async function setupAutoSync() {
  console.log('\n🔧 Setting up automatic sync trigger...');
  
  const triggerSQL = `
    -- Create or replace function to automatically sync Apple Health data
    CREATE OR REPLACE FUNCTION sync_apple_health_to_main_data_points()
    RETURNS TRIGGER AS $$
    DECLARE
        main_variable_id UUID;
    BEGIN
        -- Map Apple Health variable IDs to main variable UUIDs
        SELECT id INTO main_variable_id 
        FROM variables 
        WHERE slug = NEW.variable_id;
        
        IF main_variable_id IS NOT NULL THEN
            -- Insert or update in main data_points table
            INSERT INTO data_points (
                user_id, 
                variable_id, 
                date, 
                value, 
                source, 
                created_at, 
                updated_at
            ) VALUES (
                NEW.user_id,
                main_variable_id,
                NEW.date,
                NEW.value,
                ARRAY['Apple Health'],
                NEW.created_at,
                NOW()
            )
            ON CONFLICT (user_id, variable_id, date) 
            DO UPDATE SET 
                value = EXCLUDED.value,
                source = EXCLUDED.source,
                updated_at = NOW();
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger
    DROP TRIGGER IF EXISTS apple_health_auto_sync ON apple_health_variable_data_points;
    CREATE TRIGGER apple_health_auto_sync
        AFTER INSERT OR UPDATE ON apple_health_variable_data_points
        FOR EACH ROW
        EXECUTE FUNCTION sync_apple_health_to_main_data_points();
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: triggerSQL });
  
  if (error) {
    console.log('⚠️  Could not set up automatic trigger (may need manual setup)');
    console.log('   You can run this sync script periodically instead');
  } else {
    console.log('✅ Automatic sync trigger set up successfully!');
    console.log('   Future Apple Health data will automatically sync to main table');
  }
}

syncAppleHealthToMainData()
  .then(() => setupAutoSync())
  .catch(console.error); 