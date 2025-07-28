import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, test_type = "sample" } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    console.log("[Apple Health Test] Testing for user:", user_id, "type:", test_type);

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        error: "User not found",
        user_id 
      });
    }

    let testData: any[] = [];

    if (test_type === "sample") {
      // Generate sample data for testing
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      testData = [
        {
          user_id,
          type: "step_count",
          value: Math.floor(Math.random() * 15000) + 5000, // 5000-20000 steps
          timestamp: yesterday.toISOString(),
          raw_data: {
            from_ios_app: false,
            app_version: "test-1.0",
            device_info: "test-device",
            health_kit_metadata: { test: true }
          }
        },
        {
          user_id,
          type: "heart_rate",
          value: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
          timestamp: yesterday.toISOString(),
          raw_data: {
            from_ios_app: false,
            app_version: "test-1.0",
            device_info: "test-device",
            health_kit_metadata: { test: true }
          }
        },
        {
          user_id,
          type: "body_mass",
          value: Math.floor(Math.random() * 30) + 60, // 60-90 kg
          timestamp: yesterday.toISOString(),
          raw_data: {
            from_ios_app: false,
            app_version: "test-1.0",
            device_info: "test-device",
            health_kit_metadata: { test: true }
          }
        },
        {
          user_id,
          type: "active_energy_burned",
          value: Math.floor(Math.random() * 800) + 200, // 200-1000 kcal
          timestamp: yesterday.toISOString(),
          raw_data: {
            from_ios_app: false,
            app_version: "test-1.0",
            device_info: "test-device",
            health_kit_metadata: { test: true }
          }
        }
      ];
    } else if (test_type === "validation") {
      // Test validation scenarios
      testData = [
        {
          user_id,
          type: "invalid_type",
          value: 100,
          timestamp: new Date().toISOString(),
          raw_data: { from_ios_app: false }
        },
        {
          user_id: "invalid-uuid",
          type: "step_count",
          value: 1000,
          timestamp: new Date().toISOString(),
          raw_data: { from_ios_app: false }
        },
        {
          user_id,
          type: "heart_rate",
          value: 300, // Invalid: too high
          timestamp: new Date().toISOString(),
          raw_data: { from_ios_app: false }
        },
        {
          user_id,
          type: "step_count",
          value: "not_a_number",
          timestamp: new Date().toISOString(),
          raw_data: { from_ios_app: false }
        }
      ];
    }

    // Send test data to the receive endpoint
    const results = [];
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL || 
                   "http://localhost:3001";

    for (const testItem of testData) {
      try {
        const response = await fetch(`${baseUrl}/api/applehealth/receive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testItem)
        });

        const result = await response.json();
        
        results.push({
          test_item: testItem,
          status: response.status,
          response: result,
          success: response.status === 200
        });
      } catch (error) {
        results.push({
          test_item: testItem,
          status: 'error',
          response: { error: error instanceof Error ? error.message : 'Unknown error' },
          success: false
        });
      }
    }

    // Get current data count
    const { count: currentCount } = await supabase
      .from("apple_health_variable_data_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    // Get recent data
    const { data: recentData } = await supabase
      .from("apple_health_variable_data_points")
      .select("variable_id, value, date, raw")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const testResult = {
      user_id,
      test_type,
      results,
      summary: {
        total_tests: testData.length,
        successful_tests: results.filter(r => r.success).length,
        failed_tests: results.filter(r => !r.success).length,
        current_data_points: currentCount || 0,
        recent_data: recentData || []
      },
      api_info: {
        endpoint: `${baseUrl}/api/applehealth/receive`,
        method: "POST",
        content_type: "application/json"
      }
    };

    console.log("[Apple Health Test] Test completed:", testResult);

    return res.status(200).json(testResult);

  } catch (error) {
    console.error("[Apple Health Test] Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 