require("dotenv").config();

console.log("🔍 Checking Oura Environment Variables...");
console.log("=====================================\n");

const requiredVars = [
  "NEXT_PUBLIC_OURA_CLIENT_ID",
  "OURA_CLIENT_ID",
  "OURA_CLIENT_SECRET",
];

let allSet = true;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 8)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allSet = false;
  }
});

console.log("\n" + "=".repeat(50));

if (allSet) {
  console.log("✅ All Oura environment variables are configured!");
  console.log("🎉 Oura integration should work properly.");
} else {
  console.log("❌ Some Oura environment variables are missing!");
  console.log("\n📝 To fix this, add the following to your .env file:");
  console.log("NEXT_PUBLIC_OURA_CLIENT_ID=your_oura_client_id");
  console.log("OURA_CLIENT_ID=your_oura_client_id");
  console.log("OURA_CLIENT_SECRET=your_oura_client_secret");
  console.log("\n🔗 Get these values from: https://cloud.ouraring.com/apps");
}

console.log("\n" + "=".repeat(50));
