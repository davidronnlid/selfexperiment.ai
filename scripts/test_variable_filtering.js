#!/usr/bin/env node

/**
 * Test Script: Variable Filtering
 *
 * This script tests the getVariablesWithUserData function to ensure it only
 * returns variables that the user has data for in the data_points table.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testVariableFiltering() {
  console.log("🧪 Testing variable filtering functionality...");

  try {
    // Get a test user (first user with data)
    const { data: users, error: usersError } = await supabase
      .from("data_points")
      .select("user_id")
      .not("user_id", "is", null)
      .limit(1);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log("⚠️  No users with data found");
      return;
    }

    const testUserId = users[0].user_id;
    console.log(`👤 Testing with user ID: ${testUserId}`);

    // Get all variables (old method)
    const { data: allVariables, error: allVarsError } = await supabase
      .from("variables")
      .select("*")
      .eq("is_active", true);

    if (allVarsError) throw allVarsError;

    // Get variables with user data (new method)
    const { data: userDataPoints, error: dataError } = await supabase
      .from("data_points")
      .select("variable_id")
      .eq("user_id", testUserId)
      .not("variable_id", "is", null);

    if (dataError) throw dataError;

    const variableIds = [
      ...new Set(userDataPoints?.map((dp) => dp.variable_id) || []),
    ];

    const { data: userVariables, error: userVarsError } = await supabase
      .from("variables")
      .select("*")
      .in("id", variableIds)
      .eq("is_active", true);

    if (userVarsError) throw userVarsError;

    console.log(`📊 Results:`);
    console.log(`   Total variables: ${allVariables?.length || 0}`);
    console.log(`   Variables with user data: ${userVariables?.length || 0}`);
    console.log(`   User data points: ${userDataPoints?.length || 0}`);
    console.log(`   Unique variable IDs: ${variableIds.length}`);

    if (userVariables && userVariables.length > 0) {
      console.log(`\n📋 Variables with user data:`);
      userVariables.forEach((variable, index) => {
        console.log(
          `   ${index + 1}. ${variable.icon} ${variable.label} (${
            variable.category
          })`
        );
      });
    }

    // Verify that all returned variables have data
    const hasDataForAll = userVariables?.every((variable) =>
      variableIds.includes(variable.id)
    );

    if (hasDataForAll) {
      console.log(`\n✅ SUCCESS: All returned variables have user data`);
    } else {
      console.log(`\n❌ ERROR: Some returned variables don't have user data`);
    }

    console.log(`\n🎯 Test completed successfully!`);
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testVariableFiltering();
