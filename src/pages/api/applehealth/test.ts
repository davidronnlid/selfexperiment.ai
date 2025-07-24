import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id" });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL || 
                   "http://localhost:3001";

    // Test data to simulate iOS app sending health data
    const testData = [
      {
        user_id,
        type: "step_count",
        value: 8543,
        timestamp: new Date().toISOString(),
        raw_data: {
          test: true,
          source: "test_endpoint",
          from_ios_app: true,
          note: "Test data from /api/applehealth/test"
        }
      },
      {
        user_id,
        type: "heart_rate",
        value: 72,
        timestamp: new Date().toISOString(),
        raw_data: {
          test: true,
          source: "test_endpoint", 
          from_ios_app: true,
          note: "Test data from /api/applehealth/test"
        }
      },
      {
        user_id,
        type: "active_energy_burned",
        value: 387,
        timestamp: new Date().toISOString(),
        raw_data: {
          test: true,
          source: "test_endpoint",
          from_ios_app: true,
          note: "Test data from /api/applehealth/test"
        }
      }
    ];

    console.log("[Apple Health Test] Sending test data for user:", user_id);

    const results = [];
    
    // Send each test data point to the receive endpoint
    for (const data of testData) {
      try {
        const response = await fetch(`${baseUrl}/api/applehealth/receive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        results.push({
          type: data.type,
          success: response.ok,
          status: response.status,
          result
        });

        console.log(`[Apple Health Test] ${data.type}:`, response.ok ? "✅" : "❌", result);
      } catch (error) {
        console.error(`[Apple Health Test] Error sending ${data.type}:`, error);
        results.push({
          type: data.type,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return res.status(200).json({
      success: successCount === totalCount,
      message: `Test completed: ${successCount}/${totalCount} data points sent successfully`,
      results,
      nextSteps: successCount > 0 ? [
        "✅ Your Apple Health integration is working!",
        "🔄 Try syncing in the /analyze page to see the data",
        "📱 Use the same endpoint structure in your iOS app",
        `📡 Endpoint: ${baseUrl}/api/applehealth/receive`
      ] : [
        "❌ Some test data failed to send",
        "🔧 Check the database setup",
        "🔍 Look at the error details above",
        "💡 Make sure you ran the Apple Health SQL schema"
      ]
    });

  } catch (error) {
    console.error("[Apple Health Test] Error:", error);
    return res.status(500).json({ 
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 