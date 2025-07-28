const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment variables...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ .env.local file not found!');
  console.log('📝 Creating .env.local template...\n');
  
  const envTemplate = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# VAPID Keys for Push Notifications (Optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:your-email@domain.com

# Withings Integration (Optional)
WITHINGS_ClientID=your_withings_client_id
WITHINGS_Secret=your_withings_client_secret

# Oura Integration (Optional)
OURA_CLIENT_ID=your_oura_client_id
OURA_CLIENT_SECRET=your_oura_client_secret
personal_access_two_oura=your_oura_personal_access_token

# OpenAI API Keys (Optional)
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_FIRST_KEY=your_first_openai_api_key
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local template');
} else {
  console.log('✅ .env.local file exists');
}

// Check current environment variables
console.log('\n🔍 Checking current environment variables:');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let missingVars = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your_') || value.includes('placeholder')) {
    console.log(`❌ ${varName}: NOT SET or using placeholder`);
    missingVars.push(varName);
  } else {
    console.log(`✅ ${varName}: SET (${value.substring(0, 20)}...)`);
  }
});

if (missingVars.length > 0) {
  console.log('\n❌ Missing required environment variables!');
  console.log('\n📝 To fix this:');
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings → API');
  console.log('4. Copy the URL and keys');
  console.log('5. Update your .env.local file with the real values');
  console.log('\n📋 Required variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
} else {
  console.log('\n✅ All required environment variables are set!');
}

console.log('\n🔧 Next steps:');
console.log('1. Update .env.local with your actual Supabase credentials');
console.log('2. Restart your development server: npm run dev');
console.log('3. Test the connection by visiting your app'); 