#!/usr/bin/env node

/**
 * Deploy Routine Notifications Scheduler Edge Function
 *
 * This script deploys the Edge Function and sets up the required environment variables
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Deploying Routine Notifications Scheduler Edge Function...\n");

// Check if supabase CLI is installed
try {
  execSync("supabase --version", { stdio: "pipe" });
  console.log("✅ Supabase CLI is installed");
} catch (error) {
  console.error("❌ Supabase CLI is not installed or not in PATH");
  console.error("   Please install it: npm install -g supabase");
  process.exit(1);
}

// Check if Edge Function file exists
const functionPath = path.join(
  __dirname,
  "../supabase/functions/routine-notifications-scheduler/index.ts"
);
if (!fs.existsSync(functionPath)) {
  console.error("❌ Edge Function file not found:", functionPath);
  process.exit(1);
}

console.log("✅ Edge Function file exists");

// Step 1: Deploy the Edge Function
console.log("\n📦 Deploying Edge Function...");
try {
  execSync("supabase functions deploy routine-notifications-scheduler", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  console.log("✅ Edge Function deployed successfully");
} catch (error) {
  console.error("❌ Failed to deploy Edge Function");
  console.error("   Make sure you are logged in: supabase login");
  console.error(
    "   And linked to your project: supabase link --project-ref YOUR_PROJECT_REF"
  );
  process.exit(1);
}

// Step 2: Check environment variables
console.log("\n🔧 Checking environment variables...");

const requiredEnvVars = [
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
];

// Check .env.local for VAPID keys
const envLocalPath = path.join(__dirname, "../.env.local");
let envVars = {};

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf8");
  const lines = envContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"));

  for (const line of lines) {
    const [key, value] = line.split("=");
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, "");
    }
  }
}

const missingVars = requiredEnvVars.filter((varName) => !envVars[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables in .env.local:");
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error("\n   Please run: node scripts/generate-vapid-keys.js");
  process.exit(1);
}

console.log("✅ All required environment variables found in .env.local");

// Step 3: Set environment variables in Supabase
console.log("\n🔧 Setting environment variables in Supabase...");

for (const varName of requiredEnvVars) {
  try {
    console.log(`   Setting ${varName}...`);
    execSync(`supabase secrets set ${varName}="${envVars[varName]}"`, {
      stdio: "pipe",
      cwd: path.join(__dirname, ".."),
    });
    console.log(`   ✅ ${varName} set successfully`);
  } catch (error) {
    console.error(`   ❌ Failed to set ${varName}`);
    console.error("      Make sure you have the right permissions");
  }
}

// Step 4: Display next steps
console.log("\n🎉 Deployment completed!");
console.log("\n📋 Next Steps:");
console.log("1. Update the cron SQL with your project reference:");
console.log("   - Edit: database/setup_routine_notifications_cron_fixed.sql");
console.log(
  "   - Replace: YOUR_PROJECT_REF with your actual project reference"
);
console.log("   - Find it in your Supabase dashboard URL");
console.log("");
console.log("2. Run the cron setup SQL in your Supabase dashboard:");
console.log("   - Go to SQL Editor in your Supabase dashboard");
console.log(
  "   - Copy and run the SQL from setup_routine_notifications_cron_fixed.sql"
);
console.log("");
console.log("3. Test the function:");
console.log("   - Manual test: SELECT trigger_routine_notifications();");
console.log(
  "   - Check logs in Functions → routine-notifications-scheduler → Logs"
);
console.log("");
console.log("4. Verify the cron job:");
console.log("   - Run: SELECT * FROM get_cron_job_status();");
console.log(
  "   - Check: SELECT * FROM cron.job WHERE jobname LIKE '%routine%';"
);

console.log("\n🔗 Useful URLs:");
console.log(
  `   - Functions: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions`
);
console.log(
  `   - SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql`
);
console.log(
  `   - Logs: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/logs`
);

console.log("\n✨ Your routine notifications system is ready!");
