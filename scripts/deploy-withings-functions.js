const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 Deploying Withings Edge Functions to Supabase...");

try {
  // Deploy the withings-sync function
  console.log("📦 Deploying withings-sync function...");
  execSync("supabase functions deploy withings-sync", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });

  // Deploy the withings-reimport function
  console.log("📦 Deploying withings-reimport function...");
  execSync("supabase functions deploy withings-reimport", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });

  console.log("✅ Successfully deployed Withings Edge Functions!");
  console.log("");
  console.log("🔗 Function URLs:");
  console.log(
    `- Sync: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-sync`
  );
  console.log(
    `- Reimport: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/withings-reimport`
  );
  console.log("");
  console.log(
    "📝 Make sure to set the following environment variables in your Supabase dashboard:"
  );
  console.log("- WITHINGS_ClientID");
  console.log("- WITHINGS_Secret");
  console.log("- SUPABASE_SERVICE_ROLE_KEY");
} catch (error) {
  console.error("❌ Error deploying functions:", error.message);
  process.exit(1);
}
