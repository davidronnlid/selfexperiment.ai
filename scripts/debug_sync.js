const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSync() {
  console.log('🔍 Debugging Apple Health sync...');

  // Get one Apple Health data point
  const { data: oneDataPoint } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .eq('variable_id', 'ah_steps')
    .limit(1)
    .single();

  if (!oneDataPoint) {
    console.log('❌ No ah_steps data found');
    return;
  }

  console.log('📊 Sample Apple Health data:', oneDataPoint);

  // Get the variable mapping
  const { data: variable } = await supabase
    .from('variables')
    .select('id, slug')
    .eq('slug', 'apple_health_steps')
    .single();

  if (!variable) {
    console.log('❌ No variable mapping found');
    return;
  }

  console.log('🔗 Variable mapping:', variable);

  // Try to insert manually with detailed error logging
  const testDataPoint = {
    user_id: oneDataPoint.user_id,
    variable_id: variable.id,
    date: oneDataPoint.date,
    value: oneDataPoint.value,
    source: 'Apple Health',
    created_at: oneDataPoint.created_at || new Date().toISOString()
  };

  console.log('📝 Attempting to insert:', testDataPoint);

  const { data: insertResult, error: insertError } = await supabase
    .from('data_points')
    .insert(testDataPoint)
    .select();

  if (insertError) {
    console.log('❌ Insert error:', insertError);
    
    // Try with minimal data
    console.log('\n🔧 Trying with minimal data...');
    const minimalData = {
      user_id: oneDataPoint.user_id,
      variable_id: variable.id,
      date: oneDataPoint.date,
      value: parseFloat(oneDataPoint.value)
    };

    const { data: minResult, error: minError } = await supabase
      .from('data_points')
      .insert(minimalData)
      .select();

    if (minError) {
      console.log('❌ Minimal insert error:', minError);
    } else {
      console.log('✅ Minimal insert success!', minResult);
    }
  } else {
    console.log('✅ Insert successful!', insertResult);
  }

  // Check data_points table structure
  const { data: existingDataPoint } = await supabase
    .from('data_points')
    .select('*')
    .limit(1)
    .single();

  console.log('\n📋 Sample existing data_points structure:', 
    existingDataPoint ? Object.keys(existingDataPoint) : 'No data'
  );

  // Check constraints
  const { data: constraints } = await supabase
    .rpc('exec_sql', { 
      sql: `
        SELECT column_name, is_nullable, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'data_points' 
        ORDER BY ordinal_position;
      ` 
    });

  if (constraints) {
    console.log('\n📊 data_points table schema:');
    console.table(constraints);
  }
}

debugSync().catch(console.error); 