#!/usr/bin/env node

/**
 * Apple Health Localhost Setup Script
 * 
 * This script ensures all necessary tables are created for Apple Health integration
 * on localhost development.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupAppleHealthTables() {
  console.log('🍎 Setting up Apple Health tables for localhost...');

  try {
    // 1. Create apple_health_tokens table
    console.log('📋 Creating apple_health_tokens table...');
    const { error: tokensError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS apple_health_tokens (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `
    });

    if (tokensError) {
      console.log('⚠️  Tokens table may already exist or there was an issue:', tokensError.message);
    } else {
      console.log('✅ apple_health_tokens table ready');
    }

    // 2. Create apple_health_variable_data_points table
    console.log('📋 Creating apple_health_variable_data_points table...');
    const { error: dataPointsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS apple_health_variable_data_points (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          variable_id TEXT NOT NULL,
          value DECIMAL(10,4) NOT NULL,
          source TEXT DEFAULT 'apple_health',
          raw JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, date, variable_id)
        );
      `
    });

    if (dataPointsError) {
      console.log('⚠️  Data points table may already exist or there was an issue:', dataPointsError.message);
    } else {
      console.log('✅ apple_health_variable_data_points table ready');
    }

    // 3. Insert Apple Health variables if they don't exist
    console.log('📋 Setting up Apple Health variables...');
    const appleHealthVariables = [
      ['ah_steps', 'Steps (Apple Health)', '👣', 'Activity', 'steps', '{"min": 0, "max": 50000}'],
      ['ah_heart_rate', 'Heart Rate (Apple Health)', '❤️', 'Vitals', 'bpm', '{"min": 30, "max": 220}'],
      ['ah_weight', 'Weight (Apple Health)', '⚖️', 'Body', 'kg', '{"min": 30, "max": 300}'],
      ['ah_sleep_duration', 'Sleep Duration (Apple Health)', '😴', 'Sleep', 'hours', '{"min": 0, "max": 24}'],
      ['ah_active_calories', 'Active Calories (Apple Health)', '🔥', 'Activity', 'kcal', '{"min": 0, "max": 5000}'],
      ['ah_resting_heart_rate', 'Resting Heart Rate (Apple Health)', '💓', 'Vitals', 'bpm', '{"min": 30, "max": 150}'],
      ['ah_blood_pressure_systolic', 'Blood Pressure Systolic (Apple Health)', '🩸', 'Vitals', 'mmHg', '{"min": 70, "max": 200}'],
      ['ah_blood_pressure_diastolic', 'Blood Pressure Diastolic (Apple Health)', '🩸', 'Vitals', 'mmHg', '{"min": 40, "max": 130}'],
      ['ah_body_fat_percentage', 'Body Fat Percentage (Apple Health)', '📊', 'Body', '%', '{"min": 5, "max": 50}'],
      ['ah_vo2_max', 'VO2 Max (Apple Health)', '🫁', 'Fitness', 'ml/kg/min', '{"min": 20, "max": 80}']
    ];

    for (const [slug, label, icon, category, unit, constraints] of appleHealthVariables) {
      const { error: variableError } = await supabase
        .from('variables')
        .upsert({
          slug,
          label,
          icon,
          category,
          unit,
          constraints: JSON.parse(constraints),
          is_active: true,
          is_public: true,
          source: 'apple_health'
        }, {
          onConflict: 'slug'
        });

      if (variableError) {
        console.log(`⚠️  Variable ${slug} may already exist:`, variableError.message);
      }
    }

    console.log('✅ Apple Health variables ready');

    // 4. Test with a sample connection
    console.log('📋 Creating test connection token...');
    const testUserId = 'bb0ac2ff-72c5-4776-a83a-01855bff4df0';
    const testToken = `ah_${Date.now()}_test`;

    const { error: tokenError } = await supabase
      .from('apple_health_tokens')
      .upsert({
        user_id: testUserId,
        access_token: testToken,
        refresh_token: testToken,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (tokenError) {
      console.log('⚠️  Test token creation failed:', tokenError.message);
    } else {
      console.log('✅ Test connection token created');
    }

    console.log('\n🎉 Apple Health setup completed successfully!');
    console.log('\n📱 Next steps:');
    console.log('1. Start your Next.js server: npm run dev');
    console.log('2. Test the integration: node scripts/test_apple_health_localhost.js');
    console.log('3. Configure your iOS app with the localhost endpoint');
    console.log(`4. Use test user ID: ${testUserId}`);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nThis might be because:');
    console.error('1. Database connection failed');
    console.error('2. Tables already exist (which is fine)');
    console.error('3. Permissions issue');
    
    console.log('\n🔧 Try manual setup:');
    console.log('1. Check your .env.local file has correct Supabase credentials');
    console.log('2. Run: npx supabase db reset (if using local Supabase)');
    console.log('3. Or apply the SQL migration files manually');
  }
}

// Run the setup
setupAppleHealthTables(); 