require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const checkTables = async () => {
  try {
    console.log('🔍 Checking which routine tables exist...');
    
    // Check for different possible table structures
    const tables = ['routines', 'daily_routines', 'routine_variables', 'routine_times', 'routine_time_variables'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error) {
          console.log('✅ Table exists:', table);
          if (data && data.length > 0) {
            console.log('   Sample data columns:', Object.keys(data[0]));
          }
        } else {
          console.log('❌ Table missing:', table, '- Error:', error.message);
        }
      } catch (e) {
        console.log('❌ Table missing:', table);
      }
    }
    
    // Try to get a sample routine to see the structure
    console.log('\n🔍 Checking existing routines...');
    const { data: routines, error: routinesError } = await supabase.from('routines').select('*').limit(3);
    if (routines && routines.length > 0) {
      console.log('Found routines:', routines.length);
      console.log('Sample routine:', routines[0]);
    } else {
      console.log('No routines found or error:', routinesError?.message);
    }
    
    // Check routine_variables table specifically
    console.log('\n🔍 Checking routine_variables...');
    const { data: routineVars, error: routineVarsError } = await supabase.from('routine_variables').select('*').limit(3);
    if (routineVars && routineVars.length > 0) {
      console.log('Found routine_variables:', routineVars.length);
      console.log('Sample routine_variable:', routineVars[0]);
    } else {
      console.log('No routine_variables found or error:', routineVarsError?.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
};

checkTables(); 