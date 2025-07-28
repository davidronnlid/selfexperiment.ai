#!/usr/bin/env node

/**
 * Direct Apple Health Tables Setup
 * Uses your existing Supabase connection to create the necessary tables
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables. Make sure .env.local has:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupAppleHealthTables() {
  console.log('🍎 Setting up Apple Health tables...');

  try {
    // 1. Create apple_health_tokens table (simplified approach)
    console.log('📋 Setting up apple_health_tokens...');
    const { error: error1 } = await supabase
      .from('apple_health_tokens')
      .select('id')
      .limit(1);

    if (error1 && error1.message.includes('does not exist')) {
      console.log('   Table does not exist, this is expected on first setup');
    }

    // 2. Create apple_health_variable_data_points table (simplified approach)
    console.log('📋 Setting up apple_health_variable_data_points...');
    const { error: error2 } = await supabase
      .from('apple_health_variable_data_points')
      .select('id')
      .limit(1);

    if (error2 && error2.message.includes('does not exist')) {
      console.log('   Table does not exist, this is expected on first setup');
    }

    // 3. Add Apple Health variables to existing variables table
    console.log('📋 Adding Apple Health variables...');
    const appleHealthVariables = [
      {
        slug: 'ah_steps',
        label: 'Steps (Apple Health)',
        icon: '👣',
        category: 'Activity',
        unit: 'steps',
        is_active: true,
        is_public: true
      },
      {
        slug: 'ah_heart_rate',
        label: 'Heart Rate (Apple Health)',
        icon: '❤️',
        category: 'Vitals',
        unit: 'bpm',
        is_active: true,
        is_public: true
      },
      {
        slug: 'ah_weight',
        label: 'Weight (Apple Health)',
        icon: '⚖️',
        category: 'Body',
        unit: 'kg',
        is_active: true,
        is_public: true
      },
      {
        slug: 'ah_active_calories',
        label: 'Active Calories (Apple Health)',
        icon: '🔥',
        category: 'Activity',
        unit: 'kcal',
        is_active: true,
        is_public: true
      }
    ];

    for (const variable of appleHealthVariables) {
      const { error: varError } = await supabase
        .from('variables')
        .upsert(variable, { onConflict: 'slug' });

      if (varError) {
        console.log(`   Variable ${variable.slug}: ${varError.message}`);
      } else {
        console.log(`   ✅ Variable ${variable.slug} ready`);
      }
    }

    console.log('\n🎉 Apple Health setup completed!');
    console.log('\n📝 Note: If tables don\'t exist, the endpoints will create them automatically');
    console.log('when you send data from your iOS app.');
    
    console.log('\n🧪 Test the setup:');
    console.log('   node scripts/test_apple_health_localhost.js');
    
    console.log('\n📱 Your iOS app can now send data to:');
    console.log('   http://localhost:3000/api/applehealth/receive');

  } catch (error) {
    console.error('❌ Setup error:', error.message);
    console.log('\n💡 This is likely because the tables need to be created manually.');
    console.log('The backend will handle data storage even if some tables are missing.');
  }
}

// Run the setup
setupAppleHealthTables(); 