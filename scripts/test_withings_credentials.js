require("dotenv").config();

console.log("🔧 Testing Withings API Credentials...\n");

// Check if environment variables are set
const clientId = process.env.WITHINGS_ClientID;
const clientSecret = process.env.WITHINGS_Secret;

console.log("📋 Environment Variables Check:");
console.log(`WITHINGS_ClientID: ${clientId ? "✅ Set" : "❌ Missing"}`);
console.log(`WITHINGS_Secret: ${clientSecret ? "✅ Set" : "❌ Missing"}`);

if (!clientId || !clientSecret) {
  console.log("\n❌ Missing Withings credentials!");
  console.log("\n🔧 To fix this:");
  console.log("1. Go to https://developer.withings.com/");
  console.log("2. Create a new application");
  console.log("3. Get your Client ID and Client Secret");
  console.log("4. Add them to your .env file:");
  console.log("   WITHINGS_ClientID=your_client_id_here");
  console.log("   WITHINGS_Secret=your_client_secret_here");
  console.log("\n5. Make sure your app callback URL is set to:");
  console.log("   http://localhost:3000/api/withings/callback");
  process.exit(1);
}

console.log("\n✅ Credentials are configured!");
console.log("\n📋 Next steps:");
console.log("1. Restart your development server");
console.log("2. Try connecting Withings again");
console.log("3. The authentication should now work");

// Test the credentials format
if (clientId.length < 10) {
  console.log("\n⚠️  Warning: Client ID seems too short");
}

if (clientSecret.length < 10) {
  console.log("\n⚠️  Warning: Client Secret seems too short");
}

console.log("\n🎯 Ready to test Withings integration!");
