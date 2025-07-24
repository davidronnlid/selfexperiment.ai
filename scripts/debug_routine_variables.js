require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const debugVariables = async () => {
  try {
    console.log('🔍 Debugging specific variable IDs from routines...\n');
    
    // Get the specific variable IDs that are showing as unknown
    const unknownVariableIds = [
      '09cff85a-f62c-476d-859a-d06326bac0f4',
      'a0a87e89-1441-4a8e-a386-4298216dd893'
    ];
    
    console.log('🎯 Looking up these specific variable IDs:', unknownVariableIds);
    
    // Check if these variables exist in the variables table
    const { data: specificVariables, error: specificError } = await supabase
      .from('variables')
      .select('*')
      .in('id', unknownVariableIds);
      
    if (specificError) {
      console.error('❌ Error looking up specific variables:', specificError);
    } else {
      console.log('📋 Found specific variables:', specificVariables?.length || 0);
      if (specificVariables && specificVariables.length > 0) {
        specificVariables.forEach(v => {
          console.log(`  ✅ ${v.id}: ${v.label} (${v.slug})`);
        });
      } else {
        console.log('  ❌ No variables found with these IDs');
      }
    }
    
    console.log('\n🔍 Let\'s also check what variables DO exist...');
    
    // Get all variables to see what's available
    const { data: allVariables, error: allError } = await supabase
      .from('variables')
      .select('id, label, slug')
      .limit(10);
      
    if (allError) {
      console.error('❌ Error loading all variables:', allError);
    } else {
      console.log('📋 Available variables (first 10):');
      allVariables?.forEach(v => {
        console.log(`  📝 ${v.id}: ${v.label} (${v.slug})`);
      });
    }
    
    console.log('\n🔍 Now let\'s check the routine_variables table...');
    
    // Check what's in routine_variables
    const { data: routineVars, error: routineVarsError } = await supabase
      .from('routine_variables')
      .select('*')
      .limit(5);
      
    if (routineVarsError) {
      console.error('❌ Error loading routine_variables:', routineVarsError);
    } else {
      console.log('📋 Routine variables:');
      routineVars?.forEach(rv => {
        console.log(`  🔗 Routine: ${rv.routine_id}, Variable: ${rv.variable_id}, Value: ${rv.default_value}`);
      });
    }
    
    console.log('\n🔍 Checking if there\'s a mismatch...');
    
    // Check if the variable IDs in routine_variables exist in variables table
    if (routineVars && routineVars.length > 0) {
      const variableIds = routineVars.map(rv => rv.variable_id);
      const { data: matchingVars, error: matchError } = await supabase
        .from('variables')
        .select('id, label')
        .in('id', variableIds);
        
      if (matchError) {
        console.error('❌ Error checking variable matches:', matchError);
      } else {
        console.log('🔍 Variable ID matching results:');
        variableIds.forEach(id => {
          const found = matchingVars?.find(v => v.id === id);
          if (found) {
            console.log(`  ✅ ${id}: ${found.label}`);
          } else {
            console.log(`  ❌ ${id}: NOT FOUND in variables table`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error in debug script:', error);
  }
};

debugVariables(); 