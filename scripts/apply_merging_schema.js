const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMergingSchema() {
  console.log('🔧 Applying Variable Merging Schema...');

  // Create tables one by one
  const tables = [
    {
      name: 'variable_merge_groups',
      sql: `
        CREATE TABLE IF NOT EXISTS variable_merge_groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT UNIQUE NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          canonical_unit TEXT NOT NULL,
          unit_group TEXT,
          category TEXT,
          primary_source TEXT,
          display_order INTEGER DEFAULT 0,
          enable_correlation_analysis BOOLEAN DEFAULT true,
          min_data_points_for_correlation INTEGER DEFAULT 10,
          correlation_window_days INTEGER DEFAULT 30,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by UUID,
          is_active BOOLEAN DEFAULT true
        );
      `
    },
    {
      name: 'variable_merge_mappings',
      sql: `
        CREATE TABLE IF NOT EXISTS variable_merge_mappings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          merge_group_id UUID REFERENCES variable_merge_groups(id) ON DELETE CASCADE,
          variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
          data_source TEXT NOT NULL,
          source_priority INTEGER DEFAULT 1,
          source_unit TEXT,
          conversion_factor DECIMAL(10,6) DEFAULT 1.0,
          conversion_offset DECIMAL(10,6) DEFAULT 0.0,
          typical_accuracy_percentage DECIMAL(5,2),
          measurement_precision DECIMAL(10,6),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          UNIQUE(merge_group_id, variable_id),
          UNIQUE(merge_group_id, data_source)
        );
      `
    },
    {
      name: 'variable_source_correlations',
      sql: `
        CREATE TABLE IF NOT EXISTS variable_source_correlations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          merge_group_id UUID REFERENCES variable_merge_groups(id) ON DELETE CASCADE,
          source_a TEXT NOT NULL,
          source_b TEXT NOT NULL,
          pearson_correlation DECIMAL(10,6),
          spearman_correlation DECIMAL(10,6),
          intraclass_correlation DECIMAL(10,6),
          concordance_correlation DECIMAL(10,6),
          data_points_count INTEGER,
          analysis_start_date DATE,
          analysis_end_date DATE,
          analysis_window_days INTEGER,
          p_value DECIMAL(10,6),
          confidence_interval_lower DECIMAL(10,6),
          confidence_interval_upper DECIMAL(10,6),
          mean_absolute_error DECIMAL(10,6),
          root_mean_square_error DECIMAL(10,6),
          mean_bias DECIMAL(10,6),
          calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          calculation_version TEXT DEFAULT '1.0',
          UNIQUE(merge_group_id, source_a, source_b, analysis_start_date)
        );
      `
    },
    {
      name: 'user_merge_preferences',
      sql: `
        CREATE TABLE IF NOT EXISTS user_merge_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          merge_group_id UUID REFERENCES variable_merge_groups(id) ON DELETE CASCADE,
          preferred_source TEXT,
          show_all_sources BOOLEAN DEFAULT true,
          show_correlation_info BOOLEAN DEFAULT true,
          enable_data_fusion BOOLEAN DEFAULT false,
          fusion_method TEXT DEFAULT 'weighted_average',
          alert_on_source_disagreement BOOLEAN DEFAULT false,
          disagreement_threshold_percentage DECIMAL(5,2) DEFAULT 10.0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, merge_group_id)
        );
      `
    }
  ];

  // Create tables
  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      if (error) {
        console.log(`⚠️  Error creating ${table.name}:`, error.message);
      } else {
        console.log(`✅ Created table: ${table.name}`);
      }
    } catch (error) {
      console.log(`❌ Failed to create ${table.name}:`, error.message);
    }
  }

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_variable_merge_groups_slug ON variable_merge_groups(slug);',
    'CREATE INDEX IF NOT EXISTS idx_variable_merge_mappings_group ON variable_merge_mappings(merge_group_id);',
    'CREATE INDEX IF NOT EXISTS idx_variable_merge_mappings_variable ON variable_merge_mappings(variable_id);',
    'CREATE INDEX IF NOT EXISTS idx_variable_source_correlations_group ON variable_source_correlations(merge_group_id);'
  ];

  for (const indexSQL of indexes) {
    try {
      await supabase.rpc('exec_sql', { sql: indexSQL });
      console.log('✅ Created index');
    } catch (error) {
      // Indexes might already exist
    }
  }

  // Enable RLS
  const rlsCommands = [
    'ALTER TABLE variable_merge_groups ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE variable_merge_mappings ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE variable_source_correlations ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE user_merge_preferences ENABLE ROW LEVEL SECURITY;'
  ];

  for (const rlsSQL of rlsCommands) {
    try {
      await supabase.rpc('exec_sql', { sql: rlsSQL });
      console.log('✅ Enabled RLS');
    } catch (error) {
      // RLS might already be enabled
    }
  }

  // Create policies
  const policies = [
    `CREATE POLICY IF NOT EXISTS "Allow read access to merge groups" ON variable_merge_groups FOR SELECT USING (true);`,
    `CREATE POLICY IF NOT EXISTS "Allow read access to merge mappings" ON variable_merge_mappings FOR SELECT USING (true);`,
    `CREATE POLICY IF NOT EXISTS "Allow read access to correlations" ON variable_source_correlations FOR SELECT USING (true);`,
    `CREATE POLICY IF NOT EXISTS "Users can manage own merge preferences" ON user_merge_preferences FOR ALL USING (auth.uid() = user_id);`
  ];

  for (const policySQL of policies) {
    try {
      await supabase.rpc('exec_sql', { sql: policySQL });
      console.log('✅ Created policy');
    } catch (error) {
      // Policies might already exist
    }
  }

  console.log('\n🎉 Schema application completed!');
}

applyMergingSchema().catch(console.error); 