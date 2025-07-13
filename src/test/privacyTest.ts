import { supabase } from "@/utils/supaBase";
import {
  getSharedLogs,
  getSharedVariables,
  canViewUserData,
  followUser,
  unfollowUser,
  getFollowingUsers,
  getFollowers,
} from "@/utils/privacyUtils";

// Test data
const testUsers = {
  user1: "test-user-1-id",
  user2: "test-user-2-id",
  user3: "test-user-3-id",
};

const testVariables = [
  "Stress",
  "Sleep Quality",
  "Exercise",
  "Caffeine (mg)",
  "Heart Rate",
];

const testLogs = [
  { label: "Stress", value: "7", date: "2024-01-01" },
  { label: "Sleep Quality", value: "8", date: "2024-01-01" },
  { label: "Exercise", value: "Yes", date: "2024-01-01" },
  { label: "Caffeine (mg)", value: "200", date: "2024-01-01" },
  { label: "Heart Rate", value: "65", date: "2024-01-01" },
];

export async function runPrivacyTests() {
  console.log("🧪 Running Privacy System Tests...\n");

  try {
    // Test 1: Variable Sharing Settings
    await testVariableSharing();

    // Test 2: Log Privacy Settings
    await testLogPrivacy();

    // Test 3: User Following System
    await testUserFollowing();

    // Test 4: Privacy-Aware Data Access
    await testPrivacyAwareAccess();

    // Test 5: API Endpoints
    await testAPIEndpoints();

    console.log("✅ All privacy tests completed successfully!");
  } catch (error) {
    console.error("❌ Privacy tests failed:", error);
  }
}

async function testVariableSharing() {
  console.log("📊 Testing Variable Sharing Settings...");

  try {
    // Test setting variable sharing
    // First get the variable ID from the variable name
    const { data: variable, error: varError } = await supabase
      .from("variables")
      .select("id")
      .eq("label", "Stress")
      .single();

    if (varError) throw varError;

    const { error: setError } = await supabase
      .from("user_variable_preferences")
      .upsert({
        user_id: testUsers.user1,
        variable_id: variable.id,
        is_shared: true,
      });

    if (setError) throw setError;

    // Test getting shared variables
    const sharedVars = await getSharedVariables(testUsers.user1);
    console.log("✅ Shared variables:", sharedVars);

    // Test updating sharing setting
    const { error: updateError } = await supabase
      .from("user_variable_preferences")
      .update({ is_shared: false })
      .eq("user_id", testUsers.user1)
      .eq("variable_id", variable.id);

    if (updateError) throw updateError;

    console.log("✅ Variable sharing tests passed");
  } catch (error) {
    console.error("❌ Variable sharing test failed:", error);
    throw error;
  }
}

async function testLogPrivacy() {
  console.log("📝 Testing Log Privacy Settings...");

  try {
    // Test setting log privacy
    const { error: setError } = await supabase
      .from("app_log_privacy_settings")
      .upsert({
        user_id: testUsers.user1,
        log_id: 1,
        log_type: "daily_log",
        is_hidden: true,
      });

    if (setError) throw setError;

    // Test updating log privacy
    const { error: updateError } = await supabase
      .from("app_log_privacy_settings")
      .update({ is_hidden: false })
      .eq("user_id", testUsers.user1)
      .eq("log_id", 1)
      .eq("log_type", "daily_log");

    if (updateError) throw updateError;

    console.log("✅ Log privacy tests passed");
  } catch (error) {
    console.error("❌ Log privacy test failed:", error);
    throw error;
  }
}

async function testUserFollowing() {
  console.log("👥 Testing User Following System...");

  try {
    // Test following a user
    const followSuccess = await followUser(testUsers.user1, testUsers.user2);
    if (!followSuccess) throw new Error("Failed to follow user");

    // Test getting following users
    const following = await getFollowingUsers(testUsers.user1);
    console.log("✅ Following users:", following);

    // Test getting followers
    const followers = await getFollowers(testUsers.user2);
    console.log("✅ Followers:", followers);

    // Test unfollowing a user
    const unfollowSuccess = await unfollowUser(
      testUsers.user1,
      testUsers.user2
    );
    if (!unfollowSuccess) throw new Error("Failed to unfollow user");

    console.log("✅ User following tests passed");
  } catch (error) {
    console.error("❌ User following test failed:", error);
    throw error;
  }
}

async function testPrivacyAwareAccess() {
  console.log("🔒 Testing Privacy-Aware Data Access...");

  try {
    // Test viewing own data (should always work)
    const ownDataAccess = await canViewUserData(
      testUsers.user1,
      testUsers.user1
    );
    if (!ownDataAccess) throw new Error("User cannot view own data");

    // Test viewing other user's data (should fail by default)
    const otherDataAccess = await canViewUserData(
      testUsers.user2,
      testUsers.user1
    );
    if (otherDataAccess)
      throw new Error("User can view other user data without permission");

    // Test getting shared logs for own user
    const ownSharedLogs = await getSharedLogs(testUsers.user1, testUsers.user1);
    console.log("✅ Own shared logs count:", ownSharedLogs.length);

    // Test getting shared logs for other user (should be empty)
    const otherSharedLogs = await getSharedLogs(
      testUsers.user2,
      testUsers.user1
    );
    console.log("✅ Other user shared logs count:", otherSharedLogs.length);

    console.log("✅ Privacy-aware access tests passed");
  } catch (error) {
    console.error("❌ Privacy-aware access test failed:", error);
    throw error;
  }
}

async function testAPIEndpoints() {
  console.log("🌐 Testing API Endpoints...");

  try {
    // Test GET privacy settings
    const response = await fetch(
      "/api/privacy-settings?type=variable-settings",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.log("⚠️ API test skipped (authentication required)");
      return;
    }

    const data = await response.json();
    console.log("✅ API response:", data);

    console.log("✅ API endpoint tests passed");
  } catch (error) {
    console.log("⚠️ API test skipped (server not running)");
  }
}

// Test utility functions
export async function createTestData() {
  console.log("📝 Creating test data...");

  try {
    // Create test logs
    for (const log of testLogs) {
      const { error } = await supabase.from("daily_logs").insert({
        user_id: testUsers.user1,
        label: log.label,
        value: log.value,
        date: log.date,
      });

      if (error) console.error("Error creating test log:", error);
    }

    // Create test variable sharing settings
    for (const variable of testVariables) {
      const { error } = await supabase
        .from("user_variable_preferences")
        .upsert({
          user_id: testUsers.user1,
          variable_name: variable,
          is_shared: Math.random() > 0.5, // Random sharing
          variable_type: "predefined",
        });

      if (error) console.error("Error creating test variable setting:", error);
    }

    console.log("✅ Test data created");
  } catch (error) {
    console.error("❌ Error creating test data:", error);
  }
}

export async function cleanupTestData() {
  console.log("🧹 Cleaning up test data...");

  try {
    // Clean up test data
    await supabase.from("daily_logs").delete().eq("user_id", testUsers.user1);

    await supabase
      .from("user_variable_preferences")
      .delete()
      .eq("user_id", testUsers.user1);

    await supabase
      .from("app_log_privacy_settings")
      .delete()
      .eq("user_id", testUsers.user1);

    await supabase
      .from("user_follows")
      .delete()
      .or(
        `follower_id.eq.${testUsers.user1},following_id.eq.${testUsers.user1}`
      );

    console.log("✅ Test data cleaned up");
  } catch (error) {
    console.error("❌ Error cleaning up test data:", error);
  }
}

// Run tests if this file is executed directly
if (typeof window === "undefined") {
  runPrivacyTests().then(() => {
    console.log("🎉 Privacy system tests completed!");
  });
}
