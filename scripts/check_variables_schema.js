const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVariablesSchema() {
  console.log('🔍 Checking variables schema and existing data...');

  // Get some existing variables to understand the structure
  const { data: existingVars, error } = await supabase
    .from('variables')
    .select('*')
    .limit(10);

  if (error) {
    console.error('❌ Error fetching variables:', error);
    return;
  }

  console.log('📋 Variables table structure:');
  if (existingVars && existingVars.length > 0) {
    console.log('Columns:', Object.keys(existingVars[0]));
    console.log('\n📄 Sample variables:');
    existingVars.forEach(v => {
      console.log(`  ID: ${v.id} | Slug: ${v.slug} | Label: ${v.label} | Category: ${v.category}`);
    });
  }

  // Check if there are any Apple Health related variables
  const { data: appleHealthVars, error: ahError } = await supabase
    .from('variables')
    .select('*')
    .or('slug.like.%apple%,slug.like.%ah_%,label.ilike.%apple health%');

  if (!ahError && appleHealthVars) {
    console.log(`\n🍎 Found ${appleHealthVars.length} existing Apple Health variables:`);
    appleHealthVars.forEach(v => {
      console.log(`  ${v.slug} -> ${v.label}`);
    });
  }

  // Check data_points table structure
  const { data: dataPoints, error: dpError } = await supabase
    .from('data_points')
    .select('*')
    .limit(3);

  if (!dpError && dataPoints) {
    console.log('\n📊 Data points table structure:');
    if (dataPoints.length > 0) {
      console.log('Columns:', Object.keys(dataPoints[0]));
    }
  }

  // Check apple_health_variable_data_points if it exists
  const { data: ahDataPoints, error: ahdpError } = await supabase
    .from('apple_health_variable_data_points')
    .select('*')
    .limit(3);

  if (!ahdpError && ahDataPoints) {
    console.log('\n🍎 Apple Health data points table exists:');
    if (ahDataPoints.length > 0) {
      console.log('Columns:', Object.keys(ahDataPoints[0]));
      console.log('Sample data:');
      ahDataPoints.forEach(dp => {
        console.log(`  ${dp.variable_id}: ${dp.value} (${dp.date})`);
      });
    } else {
      console.log('Table exists but is empty');
    }
  } else {
    console.log('\n❌ Apple Health data points table not found:', ahdpError?.message);
  }
}

checkVariablesSchema().catch(console.error); 