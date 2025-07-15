const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWithingsIntegration() {
  console.log("🧪 Testing Withings Integration...");

  try {
    // Test 1: Check if tables exist and are accessible
    console.log("\n📋 Test 1: Checking table accessibility...");

    const { data: tokensData, error: tokensError } = await supabase
      .from("withings_tokens")
      .select("*")
      .limit(1);

    if (tokensError) {
      console.log("❌ withings_tokens table error:", tokensError.message);
    } else {
      console.log("✅ withings_tokens table is accessible");
      console.log("📊 Found", tokensData?.length || 0, "token records");
    }

    const { data: weightsData, error: weightsError } = await supabase
      .from("withings_weights")
      .select("*")
      .limit(1);

    if (weightsError) {
      console.log("❌ withings_weights table error:", weightsError.message);
    } else {
      console.log("✅ withings_weights table is accessible");
      console.log("📊 Found", weightsData?.length || 0, "weight records");
    }

    // Test 2: Check environment variables
    console.log("\n🔧 Test 2: Checking environment variables...");

    const requiredEnvVars = [
      "WITHINGS_ClientID",
      "WITHINGS_Secret",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      console.log("❌ Missing environment variables:", missingVars);
    } else {
      console.log("✅ All required environment variables are set");
    }

    // Test 3: Check API endpoints
    console.log("\n🌐 Test 3: Checking API endpoints...");

    const endpoints = [
      "/api/withings/auth",
      "/api/withings/callback",
      "/api/withings/fetch",
      "/api/withings/reimport",
    ];

    console.log("📋 Available Withings API endpoints:");
    endpoints.forEach((endpoint) => {
      console.log(`  - ${endpoint}`);
    });

    // Test 4: Check component files
    console.log("\n📁 Test 4: Checking component files...");

    const fs = require("fs");
    const path = require("path");

    const componentFiles = [
      "src/components/WithingsIntegration.tsx",
      "src/components/WithingsDataTable.tsx",
    ];

    componentFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
      } else {
        console.log(`❌ ${file} missing`);
      }
    });

    // Test 5: Check analytics page
    console.log("\n📄 Test 5: Checking analytics page...");

    const analyticsFile = "src/pages/analytics.tsx";
    if (fs.existsSync(analyticsFile)) {
      const analyticsContent = fs.readFileSync(analyticsFile, "utf8");
      if (analyticsContent.includes("WithingsIntegration")) {
        console.log("✅ Analytics page includes WithingsIntegration component");
      } else {
        console.log("❌ Analytics page does not include WithingsIntegration");
      }
    } else {
      console.log("❌ Analytics page not found");
    }

    console.log("\n🎯 Integration Status Summary:");
    console.log("================================");

    const status = {
      tables: !tokensError && !weightsError,
      envVars: missingVars.length === 0,
      components: componentFiles.every((f) => fs.existsSync(f)),
      analytics:
        fs.existsSync(analyticsFile) &&
        fs.readFileSync(analyticsFile, "utf8").includes("WithingsIntegration"),
    };

    console.log(`📊 Database Tables: ${status.tables ? "✅" : "❌"}`);
    console.log(`🔧 Environment Variables: ${status.envVars ? "✅" : "❌"}`);
    console.log(`📁 Components: ${status.components ? "✅" : "❌"}`);
    console.log(`📄 Analytics Page: ${status.analytics ? "✅" : "❌"}`);

    const overallStatus = Object.values(status).every(Boolean);
    console.log(
      `\n🎉 Overall Status: ${overallStatus ? "✅ READY" : "❌ NEEDS FIXES"}`
    );

    if (!overallStatus) {
      console.log("\n🔧 To fix issues:");
      if (!status.tables) {
        console.log("- Create Withings tables in Supabase dashboard");
      }
      if (!status.envVars) {
        console.log("- Add missing environment variables to .env file");
      }
      if (!status.components) {
        console.log("- Check component files exist");
      }
      if (!status.analytics) {
        console.log("- Ensure analytics page includes WithingsIntegration");
      }
    } else {
      console.log("\n🚀 Withings integration is ready!");
      console.log("📱 Visit /analytics to test the integration");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testWithingsIntegration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
