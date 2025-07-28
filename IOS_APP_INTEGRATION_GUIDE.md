# 📱 iOS App Integration Guide - Localhost

This guide will help you integrate your existing iOS app with the Modular Health backend running on localhost.

## 🎯 **Integration Overview**

Your iOS app will:
1. **Send HealthKit data** to `http://localhost:3000/api/applehealth/receive`
2. **Display in web app** - Data appears automatically in `/analyze`
3. **Real-time sync** - Instant updates when you send data from iOS

---

## 🔧 **What I've Done (Backend Ready)**

✅ **Enhanced API endpoints** with validation and error handling  
✅ **Created localhost test scripts** for development  
✅ **Updated Apple Health callback** with iOS app integration  
✅ **Added batch processing** for efficient data sync  

---

## 📱 **What You Need to Do (iOS App Changes)**

### **Step 1: Update Your iOS App Configuration**

In your iOS app, update these settings:

```swift
// Configuration for Modular Health integration
struct ModularHealthConfig {
    static let baseURL = "http://localhost:3000"  // Your localhost server
    static let apiEndpoint = "\(baseURL)/api/applehealth/receive"
    static let userID = "bb0ac2ff-72c5-4776-a83a-01855bff4df0"  // Your test user ID
}
```

### **Step 2: Add Network Configuration**

Add this to your `Info.plist` to allow localhost connections:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>localhost</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.0</string>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <false/>
        </dict>
    </dict>
</dict>
```

### **Step 3: Update Your Data Sending Function**

Replace your existing data sending function with this enhanced version:

```swift
import Foundation
import HealthKit

class ModularHealthSync {
    private let baseURL = ModularHealthConfig.baseURL
    private let userID = ModularHealthConfig.userID
    
    func sendHealthData(type: String, value: Double, metadata: [String: Any]? = nil) async {
        let url = URL(string: "\(baseURL)/api/applehealth/receive")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "user_id": userID,
            "type": type,
            "value": value,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "raw_data": [
                "from_ios_app": true,
                "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0",
                "device_info": UIDevice.current.model,
                "health_kit_metadata": metadata ?? [:]
            ]
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 {
                    if let responseData = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        print("✅ \(type): \(value) synced successfully")
                        print("   Stored as: \(responseData["data"]?["variable_id"] ?? "unknown")")
                        
                        // Optional: Show success in UI
                        DispatchQueue.main.async {
                            self.showSuccessMessage(for: type, value: value)
                        }
                    }
                } else {
                    print("❌ \(type): Server error \(httpResponse.statusCode)")
                    if let responseData = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        print("   Error details: \(responseData["error"] ?? "Unknown error")")
                    }
                }
            }
        } catch {
            print("❌ \(type): Network error \(error)")
        }
    }
    
    // Enhanced steps sync with better metadata
    func syncSteps() async {
        let healthStore = HKHealthStore()
        let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
        
        // Get today's steps
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date())
        
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            guard let result = result, let sum = result.sumQuantity() else { return }
            
            let steps = sum.doubleValue(for: .count())
            
            Task {
                await self.sendHealthData(
                    type: "step_count", 
                    value: steps,
                    metadata: [
                        "source": "HealthKit",
                        "device": "iPhone",
                        "query_type": "cumulative_today",
                        "start_date": ISO8601DateFormatter().string(from: startOfDay),
                        "end_date": ISO8601DateFormatter().string(from: Date())
                    ]
                )
            }
        }
        
        healthStore.execute(query)
    }
    
    // Show success message in UI
    private func showSuccessMessage(for type: String, value: Double) {
        // Add your UI success indication here
        // For example, update a status label or show a temporary notification
    }
}
```

### **Step 4: Add URL Scheme Support (Optional)**

To allow the web app to open your iOS app, add this to your `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.yourcompany.modularhealth</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>modularhealth</string>
        </array>
    </dict>
</array>
```

And handle the URL in your `SceneDelegate.swift`:

```swift
func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
        let url = context.url
        if url.scheme == "modularhealth" {
            // Handle the URL - maybe trigger a sync or show a specific view
            print("App opened from web with URL: \(url)")
            // You can extract parameters from the URL if needed
        }
    }
}
```

### **Step 5: Test the Integration**

1. **Start your localhost server:**
   ```bash
   cd /Users/davidronnlid/modularhealth
   npm run dev
   ```

2. **Test the backend:**
   ```bash
   node scripts/test_apple_health_localhost.js
   ```

3. **Test your iOS app:**
   - Run your iOS app on a physical device
   - Trigger the steps sync function
   - Check the console for success messages

4. **Verify in web app:**
   - Go to `http://localhost:3001/analyze`
   - Click "Connect Apple Health" button
   - You should see the integration page with your data

---

## 🧪 **Testing Flow**

### **Complete Integration Test:**

1. **Backend Test:**
   ```bash
   # Test the backend is ready
   node scripts/test_apple_health_localhost.js
   ```

2. **Web App Test:**
   - Open `http://localhost:3001/analyze`
   - Click "Connect Apple Health"
   - You should see the new integration page

3. **iOS App Test:**
   - Run your iOS app
   - Send step data using your sync function
   - Check console for success messages

4. **Verify Data Flow:**
   - Refresh the `/analyze` page
   - Your iOS data should appear in the dashboard
   - Check the Apple Health section for real data

---

## 🔧 **Troubleshooting**

### **Common Issues:**

**❌ "Connection refused" error:**
```bash
# Make sure your server is running
npm run dev
# Check it's accessible at localhost:3001
```

**❌ "Invalid user_id" error:**
```swift
// Make sure you're using the correct user ID
static let userID = "bb0ac2ff-72c5-4776-a83a-01855bff4df0"
```

**❌ Data not appearing in web app:**
```bash
# Test the backend first
node scripts/test_apple_health_localhost.js

# Check the database tables are set up
# (The integration should create them automatically)
```

**❌ iOS app can't connect:**
- Check your `Info.plist` has the network security settings
- Verify you're testing on a physical device (not simulator)
- Check the console for detailed error messages

### **Debug Your iOS App:**

Add this debug function to check connectivity:

```swift
func testConnection() async {
    let url = URL(string: "\(baseURL)/api/applehealth/status?user_id=\(userID)")!
    
    do {
        let (data, response) = try await URLSession.shared.data(from: url)
        if let httpResponse = response as? HTTPURLResponse {
            print("Status check: \(httpResponse.statusCode)")
            if let responseData = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                print("Connection status: \(responseData)")
            }
        }
    } catch {
        print("Connection test failed: \(error)")
    }
}
```

---

## 🎉 **Success Indicators**

You'll know it's working when:

✅ **iOS app console shows:** `✅ step_count: 8543 synced successfully`  
✅ **Web app shows:** Apple Health data in the `/analyze` dashboard  
✅ **Backend test passes:** All endpoints return success  
✅ **Real-time updates:** New iOS data appears immediately in web app  

---

## 📞 **Need Help?**

If you run into issues:

1. **Run the test script:** `node scripts/test_apple_health_localhost.js`
2. **Check console logs:** Look for error messages in both iOS and web console
3. **Verify user ID:** Make sure you're using the correct test user ID
4. **Test endpoints manually:** Use the web interface test buttons

**The backend is ready - now just configure your iOS app with the settings above!** 🚀 