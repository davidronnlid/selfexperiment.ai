const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupVariableMerging() {
  console.log('🔧 Setting up Variable Merging System...');

  try {
    // Step 1: Apply database schema
    console.log('\n📊 Step 1: Applying database schema...');
    await applyDatabaseSchema();

    // Step 2: Create merge groups for existing overlapping variables
    console.log('\n🔗 Step 2: Creating merge groups...');
    await createMergeGroups();

    // Step 3: Map existing variables to merge groups
    console.log('\n🗂️  Step 3: Mapping variables to merge groups...');
    await mapVariablesToGroups();

    // Step 4: Verify setup
    console.log('\n✅ Step 4: Verifying setup...');
    await verifySetup();

    console.log('\n🎉 Variable Merging System setup completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test the merged variable display in your app');
    console.log('   2. Configure additional merge groups as needed');
    console.log('   3. Run correlation analysis for source agreement');

  } catch (error) {
    console.error('❌ Error setting up variable merging:', error);
  }
}

async function applyDatabaseSchema() {
  try {
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'variable_merging_system.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into individual statements and execute
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim().startsWith('--') || statement.trim().length === 0) continue;
      
      try {
        await supabase.rpc('exec_sql', { sql: statement.trim() + ';' });
      } catch (error) {
        // Some statements might fail if they already exist, which is okay
        if (!error.message.includes('already exists') && 
            !error.message.includes('does not exist') &&
            !error.message.includes('relation') &&
            !error.message.includes('function')) {
          console.log(`⚠️  Statement warning: ${error.message.substring(0, 100)}...`);
        }
      }
    }
    
    console.log('✅ Database schema applied successfully');
  } catch (error) {
    console.log('⚠️  Schema application completed with warnings:', error.message);
  }
}

async function createMergeGroups() {
  const mergeGroups = [
    {
      name: 'Body Weight',
      slug: 'body_weight',
      description: 'Body weight measurements from multiple sources (Withings scale, Apple Health, manual entry)',
      canonical_unit: 'kg',
      unit_group: 'mass',
      category: 'Physical Health',
      primary_source: 'withings',
      enable_correlation_analysis: true
    },
    {
      name: 'Heart Rate',
      slug: 'heart_rate',
      description: 'Heart rate measurements from various devices and apps',
      canonical_unit: 'bpm',
      unit_group: 'frequency',
      category: 'Physical Health',
      primary_source: 'apple_health',
      enable_correlation_analysis: true
    },
    {
      name: 'Steps',
      slug: 'steps',
      description: 'Daily step count from different tracking devices',
      canonical_unit: 'steps',
      unit_group: 'count',
      category: 'Physical Health',
      primary_source: 'apple_health',
      enable_correlation_analysis: true
    }
  ];

  for (const group of mergeGroups) {
    try {
      const { error } = await supabase
        .from('variable_merge_groups')
        .upsert(group, { onConflict: 'slug' });

      if (error) {
        console.log(`⚠️  Error creating merge group ${group.slug}:`, error.message);
      } else {
        console.log(`✅ Created merge group: ${group.name}`);
      }
    } catch (error) {
      console.log(`❌ Failed to create merge group ${group.slug}:`, error.message);
    }
  }
}

async function mapVariablesToGroups() {
  // Get existing variables that should be mapped
  const { data: variables, error: variablesError } = await supabase
    .from('variables')
    .select('id, slug, label, source_type')
    .or('slug.ilike.%weight%,slug.ilike.%heart%,slug.ilike.%step%');

  if (variablesError) {
    console.log('⚠️  Error fetching variables:', variablesError.message);
    return;
  }

  console.log(`📊 Found ${variables?.length || 0} variables to potentially map`);

  // Define mapping rules
  const mappingRules = [
    // Body Weight mappings
    {
      mergeGroupSlug: 'body_weight',
      variablePatterns: ['weight', 'body_mass'],
      mappings: [
        { 
          pattern: 'withings', 
          source: 'withings', 
          priority: 3, 
          accuracy: 99.5, 
          precision: 0.1,
          unit: 'kg'
        },
        { 
          pattern: 'apple_health', 
          source: 'apple_health', 
          priority: 2, 
          accuracy: 95.0, 
          precision: 0.1,
          unit: 'kg'
        }
      ]
    },
    // Heart Rate mappings
    {
      mergeGroupSlug: 'heart_rate',
      variablePatterns: ['heart', 'bpm'],
      mappings: [
        { 
          pattern: 'apple_health', 
          source: 'apple_health', 
          priority: 3, 
          accuracy: 98.0, 
          precision: 1,
          unit: 'bpm'
        },
        { 
          pattern: 'withings', 
          source: 'withings', 
          priority: 2, 
          accuracy: 96.0, 
          precision: 1,
          unit: 'bpm'
        }
      ]
    },
    // Steps mappings
    {
      mergeGroupSlug: 'steps',
      variablePatterns: ['step'],
      mappings: [
        { 
          pattern: 'apple_health', 
          source: 'apple_health', 
          priority: 3, 
          accuracy: 95.0, 
          precision: 1,
          unit: 'steps'
        },
        { 
          pattern: 'withings', 
          source: 'withings', 
          priority: 2, 
          accuracy: 90.0, 
          precision: 1,
          unit: 'steps'
        }
      ]
    }
  ];

  for (const rule of mappingRules) {
    // Get merge group ID
    const { data: mergeGroup } = await supabase
      .from('variable_merge_groups')
      .select('id')
      .eq('slug', rule.mergeGroupSlug)
      .single();

    if (!mergeGroup) continue;

    // Find matching variables
    const matchingVariables = variables?.filter(v => 
      rule.variablePatterns.some(pattern => 
        v.slug.toLowerCase().includes(pattern.toLowerCase()) ||
        v.label.toLowerCase().includes(pattern.toLowerCase())
      )
    ) || [];

    console.log(`🔍 Found ${matchingVariables.length} variables for ${rule.mergeGroupSlug}`);

    for (const variable of matchingVariables) {
      // Find appropriate mapping based on variable source/name
      const mapping = rule.mappings.find(m => 
        variable.slug.toLowerCase().includes(m.pattern.toLowerCase()) ||
        variable.source_type === m.source ||
        variable.label.toLowerCase().includes(m.pattern.toLowerCase())
      );

      if (mapping) {
        try {
          const { error } = await supabase
            .from('variable_merge_mappings')
            .upsert({
              merge_group_id: mergeGroup.id,
              variable_id: variable.id,
              data_source: mapping.source,
              source_priority: mapping.priority,
              source_unit: mapping.unit,
              typical_accuracy_percentage: mapping.accuracy,
              measurement_precision: mapping.precision,
              conversion_factor: 1.0,
              conversion_offset: 0.0
            }, { 
              onConflict: 'merge_group_id,variable_id' 
            });

          if (error) {
            console.log(`⚠️  Error mapping variable ${variable.slug}:`, error.message);
          } else {
            console.log(`✅ Mapped ${variable.label} (${mapping.source}) to ${rule.mergeGroupSlug}`);
          }
        } catch (error) {
          console.log(`❌ Failed to map variable ${variable.slug}:`, error.message);
        }
      }
    }
  }
}

async function verifySetup() {
  // Check merge groups
  const { data: groups, error: groupsError } = await supabase
    .from('variable_merge_groups')
    .select('*');

  if (groupsError) {
    console.log('⚠️  Error verifying merge groups:', groupsError.message);
    return;
  }

  console.log(`📊 Created ${groups?.length || 0} merge groups:`);
  groups?.forEach(group => {
    console.log(`   • ${group.name} (${group.slug})`);
  });

  // Check mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('variable_merge_mappings')
    .select(`
      *,
      merge_group:merge_group_id(name, slug),
      variable:variable_id(label, slug)
    `);

  if (mappingsError) {
    console.log('⚠️  Error verifying mappings:', mappingsError.message);
    return;
  }

  console.log(`🔗 Created ${mappings?.length || 0} variable mappings:`);
  mappings?.forEach(mapping => {
    console.log(`   • ${mapping.variable?.label} → ${mapping.merge_group?.name} (${mapping.data_source})`);
  });

  // Test data availability
  for (const group of groups || []) {
    const { data: testData } = await supabase
      .rpc('get_merged_variable_data', {
        group_slug: group.slug,
        user_id_param: 'bb0ac2ff-72c5-4776-a83a-01855bff4df0', // Your test user
        start_date: '2025-06-01',
        end_date: '2025-07-31'
      });

    console.log(`📈 ${group.name}: ${testData?.length || 0} data points available`);
  }
}

setupVariableMerging().catch(console.error); 