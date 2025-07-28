const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAppleHealthRelationships() {
  console.log('🔧 Fixing Apple Health foreign key relationships...');
  
  try {
    // Step 1: Get all Apple Health variables for mapping
    console.log('1. Getting Apple Health variables for mapping...');
    const { data: variables, error: varsError } = await supabase
      .from('variables')
      .select('id, slug, label')
      .or('slug.like.ah_%,slug.like.apple_health_%,label.ilike.%apple health%');
    
    if (varsError) {
      console.error('❌ Error fetching variables:', varsError.message);
      return;
    }
    
    console.log(`Found ${variables.length} Apple Health variables:`);
    variables.forEach(v => console.log(`  ${v.slug}: ${v.id}`));
    
    // Create mapping from old string values to UUIDs
    const variableMapping = {
      'steps': variables.find(v => v.slug === 'apple_health_steps' || v.slug === 'ah_steps')?.id,
      'heart_rate': variables.find(v => v.slug === 'apple_health_heart_rate' || v.slug === 'ah_heart_rate')?.id,
      'weight': variables.find(v => v.slug === 'apple_health_weight' || v.slug === 'ah_weight')?.id,
      'sleep_duration': variables.find(v => v.slug === 'ah_sleep_duration')?.id,
      'active_calories': variables.find(v => v.slug === 'ah_active_calories')?.id
    };
    
    console.log('\n2. Variable mapping:');
    Object.entries(variableMapping).forEach(([key, value]) => {
      console.log(`  ${key} -> ${value || 'NOT FOUND'}`);
    });
    
    // Step 2: Check current apple_health_variable_data_points data
    console.log('\n3. Checking current data...');
    const { data: currentData, error: dataError } = await supabase
      .from('apple_health_variable_data_points')
      .select('*')
      .limit(10);
    
    if (dataError) {
      console.error('❌ Error fetching current data:', dataError.message);
      return;
    }
    
    console.log(`Found ${currentData.length} records. Sample:`);
    currentData.slice(0, 3).forEach(record => {
      const mappedId = variableMapping[record.variable_id];
      console.log(`  ${record.date}: ${record.variable_id} = ${record.value} (maps to: ${mappedId || 'unknown'})`);
    });
    
    // Step 3: Check if variable_id_uuid column exists
    console.log('\n4. Checking for variable_id_uuid column...');
    const sampleRecord = currentData[0];
    const hasUuidColumn = sampleRecord && 'variable_id_uuid' in sampleRecord;
    
    if (hasUuidColumn) {
      console.log('✅ variable_id_uuid column already exists');
    } else {
      console.log('❌ variable_id_uuid column does not exist - would need database migration');
    }
    
    // Step 4: Create a workaround by updating the Apple Health page to handle the mapping
    console.log('\n5. Creating data mapping for frontend...');
    
    // Get all unique variable_id values
    const uniqueVariableIds = [...new Set(currentData.map(r => r.variable_id))];
    console.log('Unique variable_id values:', uniqueVariableIds);
    
    // Create the mapping object for frontend use
    const frontendMapping = {};
    uniqueVariableIds.forEach(varId => {
      const mappedVariable = variables.find(v => 
        v.slug === 'apple_health_' + varId || 
        v.slug === 'ah_' + varId ||
        (v.slug === 'apple_health_steps' && varId === 'steps') ||
        (v.slug === 'apple_health_heart_rate' && varId === 'heart_rate') ||
        (v.slug === 'apple_health_weight' && varId === 'weight')
      );
      
      if (mappedVariable) {
        frontendMapping[varId] = {
          variable_id: mappedVariable.id,
          slug: mappedVariable.slug,
          label: mappedVariable.label
        };
      }
    });
    
    console.log('\n6. Frontend mapping object:');
    console.log(JSON.stringify(frontendMapping, null, 2));
    
    // Step 5: Test a join query simulation
    console.log('\n7. Testing join query simulation...');
    
    // Get apple health data
    const { data: appleHealthData, error: ahError } = await supabase
      .from('apple_health_variable_data_points')
      .select('*')
      .limit(5);
    
    if (ahError) {
      console.error('❌ Error fetching apple health data:', ahError.message);
      return;
    }
    
    // Manually join with variables
    const joinedData = appleHealthData.map(record => {
      const mapping = frontendMapping[record.variable_id];
      return {
        ...record,
        variable: mapping ? {
          id: mapping.variable_id,
          slug: mapping.slug,
          label: mapping.label
        } : null
      };
    });
    
    console.log('✅ Simulated join results:');
    joinedData.forEach(record => {
      console.log(`  ${record.date}: ${record.variable?.label || 'unmapped'} = ${record.value}`);
    });
    
    // Step 6: Create utility functions
    console.log('\n8. Apple Health data access patterns:');
    console.log('✅ Direct query (works):');
    console.log('   supabase.from("apple_health_variable_data_points").select("*")');
    
    console.log('❌ Join query (fails):');
    console.log('   supabase.from("apple_health_variable_data_points").select("*, variables(*)")');
    
    console.log('✅ Manual join (workaround):');
    console.log('   1. Get apple_health_variable_data_points data');
    console.log('   2. Map variable_id strings to variable UUIDs using frontendMapping');
    console.log('   3. Fetch variables separately if needed');
    
    console.log('\n🎉 Apple Health relationship analysis complete!');
    
    return {
      variableMapping: frontendMapping,
      totalRecords: currentData.length,
      uniqueVariableIds: uniqueVariableIds,
      availableVariables: variables
    };
    
  } catch (error) {
    console.error('❌ Error in fixAppleHealthRelationships:', error);
    throw error;
  }
}

// Export for use in other scripts or run directly
if (require.main === module) {
  fixAppleHealthRelationships()
    .then(result => {
      console.log('\n📊 Summary:', result);
    })
    .catch(console.error);
}

module.exports = { fixAppleHealthRelationships }; 