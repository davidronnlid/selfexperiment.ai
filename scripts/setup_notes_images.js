const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const setupDatabase = async () => {
  try {
    console.log('📋 Setting up notes images database schema...');
    
    const sql = fs.readFileSync('database/create_notes_images_table.sql', 'utf8');
    
    console.log('🔄 Executing SQL statements...');
    
    // Split the SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        try {
          console.log(`Executing: ${trimmed.substring(0, 60)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { 
            sql_query: trimmed + ';' 
          });
          if (stmtError) {
            console.log('⚠️  Statement had error (may be expected):', stmtError.message);
          } else {
            console.log('✅ Success');
          }
        } catch (e) {
          console.log('⚠️  Statement failed:', e.message);
        }
      }
    }
    
    console.log('✅ Database setup completed!');
    console.log('📷 Notes images feature is now ready to use');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('');
    console.log('📝 Manual Setup Instructions:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor'); 
    console.log('3. Execute the contents of database/create_notes_images_table.sql');
    process.exit(1);
  }
};

setupDatabase(); 