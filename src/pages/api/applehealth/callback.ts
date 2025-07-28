import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for token operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user_id = req.query.user_id as string;
  const sync_type = req.query.sync_type as string || 'all';
  const start_date = req.query.start_date as string;
  const end_date = req.query.end_date as string;
  
  if (!user_id) {
    console.error("[Apple Health Callback] No user_id found in query param");
    return res.status(401).send("No user_id found in query param");
  }
  
  console.log(`[Apple Health Callback] User: ${user_id}, Sync Type: ${sync_type}, Date Range: ${start_date} to ${end_date}`);
  

  try {
    // Generate a temporary session token for Apple Health access
    const sessionToken = `ah_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get base URL for API endpoints
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL || 
                   "http://localhost:3000";
    
    // Save the session token to database
    const { error } = await supabaseAdmin.from("apple_health_tokens").upsert({
      access_token: sessionToken,
      refresh_token: sessionToken,
      user_id: user_id,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id"
    });

    if (error) {
      console.error("Failed to save Apple Health token to Supabase:", error);
      return res.status(500).json({ 
        error: "Token save failed", 
        details: error.message,
        code: error.code 
      });
    }

    console.log("✅ Apple Health Token Created:", sessionToken);
    
    // If this is a date range sync, initiate the sync process
    if (sync_type === 'range' && start_date && end_date) {
      console.log(`[Apple Health Callback] Initiating date range sync from ${start_date} to ${end_date}`);
      
      // You could trigger your iOS app to sync the date range here
      // For now, we'll just log the parameters and show them in the UI
    }
    
    // Create an integration page with iOS app instructions
    const integrationPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apple Health Integration - Modular Health</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f7;
            line-height: 1.6;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .success {
            color: #30d158;
            text-align: center;
            font-size: 18px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .step {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007aff;
        }
        .button {
            display: inline-block;
            background: #007aff;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            margin: 10px 5px;
            text-align: center;
            border: none;
            cursor: pointer;
            font-size: 16px;
        }
        .button:hover {
            background: #0056b3;
        }
        .button.secondary {
            background: #6c757d;
        }
        .button.secondary:hover {
            background: #545b62;
        }
        .health-icon {
            font-size: 48px;
            text-align: center;
            margin-bottom: 20px;
        }
        .code-block {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #333;
            overflow-x: auto;
            margin: 15px 0;
        }
        .highlight {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
        }
        .center {
            text-align: center;
        }
        .ios-app-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
        }
        .api-info {
            background: #e7f3ff;
            border-left: 4px solid #007aff;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="health-icon">🍎</div>
        <div class="success">✅ Apple Health Integration Authorized!</div>
        
        <div class="highlight">
            <strong>🎉 Success!</strong> Your Apple Health connection is now active and ready to receive data.
        </div>
        
        <div class="ios-app-section">
            <h3 style="margin-top: 0; color: white;">📱 Your iOS App is Ready!</h3>
            <p>Now you can start syncing your Apple Health data through your iOS app.</p>
            
            <div class="center" style="margin: 20px 0;">
                <button class="button" onclick="openIOSApp()" style="background: white; color: #007aff; font-weight: bold;">
                    📱 Open Your iOS App
                </button>
                <button class="button secondary" onclick="openAppStore()" style="background: rgba(255,255,255,0.2); color: white;">
                    📁 App Store (if needed)
                </button>
            </div>
        </div>

        <div class="api-info">
            <h4 style="margin-top: 0;">🔧 API Configuration for Your iOS App</h4>
            <p><strong>User ID:</strong> <code>${user_id}</code></p>
            <p><strong>API Endpoint:</strong> <code>${baseUrl}/api/applehealth/receive</code></p>
            <p><strong>Sync Type:</strong> <code>${sync_type}</code></p>
            ${sync_type === 'range' && start_date && end_date ? `
            <p><strong>📅 Date Range:</strong> <code>${start_date}</code> to <code>${end_date}</code></p>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 10px; margin: 10px 0;">
                <strong>⚡ Action Required:</strong> Please sync all Apple Health data for the selected date range in your iOS app.
            </div>
            ` : ''}
            <p><strong>Status:</strong> <span style="color: #30d158;">✅ Connected & Ready</span></p>
        </div>

        <h3>📋 Integration Details</h3>
        
        <div class="step">
            <strong>Step 1:</strong> Your iOS app should now be able to send health data to:
            <div class="code-block">${baseUrl}/api/applehealth/receive</div>
        </div>
        
        <div class="step">
            <strong>Step 2:</strong> Configure your iOS app with these settings:
            <div class="code-block">User ID: ${user_id}
Base URL: ${baseUrl}
Endpoint: /api/applehealth/receive
Method: POST
Content-Type: application/json</div>
        </div>
        
        <div class="step">
            <strong>Step 3:</strong> Test the connection by sending step data from your iOS app.
        </div>

        <h3>🧪 Test Your Connection</h3>
        <p>Use these buttons to test your Apple Health integration:</p>
        
        <div class="center">
            <button class="button" onclick="testConnection()">
                🧪 Test Backend Connection
            </button>
            <button class="button secondary" onclick="sendSampleData()">
                📊 Send Sample Data
            </button>
        </div>
        
        <div id="testResults" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; display: none;">
            <h4>Test Results:</h4>
            <div id="testOutput"></div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <a href="/analyze?applehealth=success" class="button" style="background: #30d158;">
                🎉 Continue to Analytics Dashboard
            </a>
        </div>
    </div>

    <script>
        function openIOSApp() {
            // Try to open your iOS app using custom URL scheme with date range parameters
            let appUrl = "modularhealth://sync?source=web&user_id=${user_id}&action=sync_apple_health";
            
            ${sync_type === 'range' && start_date && end_date ? `
            appUrl += "&sync_type=range&start_date=${start_date}&end_date=${end_date}";
            ` : `
            appUrl += "&sync_type=all";
            `}
            
            console.log("Opening iOS app with URL:", appUrl);
            
            // Attempt to open the app
            window.location.href = appUrl;
            
            // After a short delay, if the app didn't open, show instructions
            setTimeout(() => {
                ${sync_type === 'range' && start_date && end_date ? `
                alert("If your iOS app didn't open automatically, please open it manually and sync all Apple Health data from ${start_date} to ${end_date}.");
                ` : `
                alert("If your iOS app didn't open automatically, please open it manually and ensure it's configured to sync with Modular Health.");
                `}
            }, 2000);
        }
        
        function openAppStore() {
            // If you publish to App Store later
            alert("Your iOS app should be installed locally via Xcode for now. Once published, this will open the App Store.");
        }

        async function testConnection() {
            const testResults = document.getElementById('testResults');
            const testOutput = document.getElementById('testOutput');
            
            testResults.style.display = 'block';
            testOutput.innerHTML = '<p>🔄 Testing connection...</p>';
            
            try {
                const response = await fetch('/api/applehealth/status?user_id=${user_id}');
                const data = await response.json();
                
                if (response.ok) {
                    testOutput.innerHTML = \`
                        <p style="color: #30d158;">✅ Connection successful!</p>
                        <p><strong>Data Points:</strong> \${data.dataPoints}</p>
                        <p><strong>Connected:</strong> \${data.connected ? 'Yes' : 'No'}</p>
                        <p><strong>Has Real Data:</strong> \${data.hasRealData ? 'Yes' : 'No'}</p>
                    \`;
                } else {
                    testOutput.innerHTML = \`<p style="color: #dc3545;">❌ Connection failed: \${data.error}</p>\`;
                }
            } catch (error) {
                testOutput.innerHTML = \`<p style="color: #dc3545;">❌ Error: \${error.message}</p>\`;
            }
        }

        async function sendSampleData() {
            const testResults = document.getElementById('testResults');
            const testOutput = document.getElementById('testOutput');
            
            testResults.style.display = 'block';
            testOutput.innerHTML = '<p>🔄 Sending sample data...</p>';
            
            try {
                const response = await fetch('/api/applehealth/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        user_id: '${user_id}', 
                        test_type: 'sample' 
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    testOutput.innerHTML = \`
                        <p style="color: #30d158;">✅ Sample data sent successfully!</p>
                        <p><strong>Tests:</strong> \${data.summary.successful_tests}/\${data.summary.total_tests} passed</p>
                        <p><strong>Total Data Points:</strong> \${data.summary.current_data_points}</p>
                    \`;
                } else {
                    testOutput.innerHTML = \`<p style="color: #dc3545;">❌ Test failed: \${data.error}</p>\`;
                }
            } catch (error) {
                testOutput.innerHTML = \`<p style="color: #dc3545;">❌ Error: \${error.message}</p>\`;
            }
        }
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(integrationPage);
    
  } catch (error) {
    console.error("Apple Health callback error:", error);
    res.status(500).send("Apple Health integration failed");
  }
} 