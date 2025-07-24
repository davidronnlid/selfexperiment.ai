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
  
  if (!user_id) {
    console.error("[Apple Health Callback] No user_id found in query param");
    return res.status(401).send("No user_id found in query param");
  }

  try {
    // For Apple Health, we'll create a custom integration page that shows:
    // 1. Instructions for iOS users to enable HealthKit
    // 2. A way to generate an access token for the web interface
    // 3. Manual data upload capabilities
    
    // Generate a temporary session token for Apple Health access
    const sessionToken = `ah_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get base URL for API endpoints
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL || 
                   "http://localhost:3001";
    
    // Save the session token to database
    const { error } = await supabaseAdmin.from("apple_health_tokens").upsert({
      access_token: sessionToken,
      refresh_token: sessionToken, // For Apple Health, we'll use the same token
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
    
    // Create an integration page with instructions
    const integrationPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apple Health Integration</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f7;
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
        }
        .instructions {
            line-height: 1.6;
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
            margin: 10px 0;
        }
        .health-icon {
            font-size: 48px;
            text-align: center;
            margin-bottom: 20px;
        }
        .file-upload {
            border: 2px dashed #007aff;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        input[type="file"] {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="health-icon">🏥</div>
        <div class="success">✅ Apple Health Integration Authorized!</div>
        
        <div class="instructions">
            <h3>📱 iOS Setup Instructions</h3>
            
            <div class="step">
                <strong>Step 1:</strong> Open the Health app on your iPhone
            </div>
            
            <div class="step">
                <strong>Step 2:</strong> Tap your profile picture in the top right
            </div>
            
            <div class="step">
                <strong>Step 3:</strong> Scroll down to "Apps" section
            </div>
            
            <div class="step">
                <strong>Step 4:</strong> Look for "Modular Health" (coming soon) or export your data manually
            </div>

            <h3>📱 iOS App Integration</h3>
            <p>Create a simple iOS app to send your HealthKit data directly to this system:</p>
            
            <div class="step">
                <strong>Endpoint URL:</strong><br>
                <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; color: #333;">
                    ${baseUrl}/api/applehealth/receive
                </code>
            </div>
            
            <div class="step">
                <strong>Method:</strong> POST<br>
                <strong>Content-Type:</strong> application/json<br>
                <strong>Body:</strong> 
                <pre style="background: #f8f9fa; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; color: #333;">{
  "user_id": "${user_id}",
  "type": "step_count",
  "value": 8543,
  "timestamp": "2025-07-22T10:30:00Z"
}</pre>
            </div>

            <h3>💾 Alternative: Manual Data Export</h3>
            <p>If you prefer not to build an iOS app:</p>
            
            <div class="step">
                <strong>Option 1:</strong> Export from Health app → Profile → Export All Health Data → Share the ZIP file
            </div>
            
            <div class="step">
                <strong>Option 2:</strong> Use third-party apps that can sync with our API
            </div>

            <div class="file-upload" id="uploadArea">
                <p>📤 Upload Health Export (Coming Soon)</p>
                <input type="file" id="healthFile" accept=".zip,.xml" style="display:none;" />
                <button class="button" onclick="document.getElementById('healthFile').click();">
                    Choose Health Export File
                </button>
                <p><small>Support for .zip exports from iOS Health app</small></p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="/analyze?applehealth=success" class="button">
                    🎉 Continue to Analytics
                </a>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('healthFile').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                alert('Health data upload functionality coming soon! For now, your Apple Health connection is active and ready for future updates.');
            }
        });
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