const webpush = require("web-push");

console.log("🔑 Generating VAPID Keys for Push Notifications...\n");

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log("✅ VAPID Keys Generated Successfully!\n");

console.log("📋 Add these to your environment variables:\n");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);

console.log("\n🔧 For local development, add to .env.local:");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
console.log("VAPID_SUBJECT=mailto:your-email@example.com");

console.log(
  "\n🚀 For production, add to your hosting platform environment variables:"
);
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
console.log("VAPID_SUBJECT=mailto:your-email@example.com");

console.log("\n📝 Important Notes:");
console.log(
  "- Keep the private key secure and never expose it in client-side code"
);
console.log(
  "- The public key will be used in the frontend to subscribe to push notifications"
);
console.log("- VAPID_SUBJECT should be a valid email or URL for your app");
console.log(
  "- These keys allow your server to send push notifications to users"
);

console.log("\n🎯 Next Steps:");
console.log("1. Add the environment variables to your .env.local file");
console.log(
  "2. Run the database setup: node scripts/setup-push-subscriptions-table.js"
);
console.log("3. Update your service worker registration");
console.log("4. Test push notifications");
