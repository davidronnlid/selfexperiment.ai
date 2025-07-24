# 🍎 Apple Health iOS Integration Guide

This guide shows you how to connect your iOS app to your Modular Health Supabase backend to send real HealthKit data.

## 📋 Prerequisites

- ✅ Apple Health integration set up in your Supabase database
- ✅ Development server running at `http://localhost:3001`
- ✅ Apple Developer Account ($99/year for real device testing)
- ✅ Xcode installed on your Mac

---

## 🚀 **Part 1: iOS App Setup**

### 1. Create New iOS Project
- Open Xcode → Create new project
- Choose **iOS → App**
- Product Name: `ModularHealthSync`
- Interface: **SwiftUI**
- Language: **Swift**

### 2. Add HealthKit Capability
- Select your project in Xcode
- Go to **Signing & Capabilities**
- Click **+ Capability** → Search for **HealthKit**
- Enable HealthKit

### 3. Update Info.plist
Add these permission descriptions:

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app reads your health data to sync with Modular Health analytics.</string>
<key>NSHealthUpdateUsageDescription</key>  
<string>This app may write health data for testing purposes.</string>
```

---

## 📱 **Part 2: Swift Code Implementation**

### ContentView.swift

```swift
import SwiftUI
import HealthKit

struct ContentView: View {
    @StateObject private var healthManager = HealthManager()
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Modular Health Sync")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Status: \(healthManager.authorizationStatus)")
                .foregroundColor(healthManager.isAuthorized ? .green : .red)
            
            if !healthManager.isAuthorized {
                Button("Request HealthKit Access") {
                    healthManager.requestAuthorization()
                }
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            
            if healthManager.isAuthorized {
                VStack(spacing: 15) {
                    Button("Sync Steps") {
                        healthManager.syncSteps()
                    }
                    
                    Button("Sync Heart Rate") {
                        healthManager.syncHeartRate()
                    }
                    
                    Button("Sync Weight") {
                        healthManager.syncWeight()
                    }
                    
                    Button("Sync All Data") {
                        healthManager.syncAllData()
                    }
                }
                .padding()
            }
            
            if !healthManager.logs.isEmpty {
                ScrollView {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Sync Log:")
                            .font(.headline)
                        
                        ForEach(healthManager.logs, id: \.self) { log in
                            Text(log)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                }
            }
        }
        .padding()
    }
}
```

### HealthManager.swift

Create a new Swift file `HealthManager.swift`:

```swift
import HealthKit
import Foundation

class HealthManager: ObservableObject {
    private let healthStore = HKHealthStore()
    
    @Published var isAuthorized = false
    @Published var authorizationStatus = "Not Requested"
    @Published var logs: [String] = []
    
    // Your user ID - replace with your actual user ID from Supabase
    private let userId = "bb0ac2ff-72c5-4776-a83a-01855bff4df0"
    
    // API endpoint - change localhost to your actual server URL when deployed
    private let apiEndpoint = "http://localhost:3001/api/applehealth/receive"
    
    init() {
        checkAuthorizationStatus()
    }
    
    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            authorizationStatus = "HealthKit not available"
            return
        }
        
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .bodyMass)!,
            HKObjectType.quantityType(forIdentifier: .bodyFatPercentage)!,
            HKObjectType.quantityType(forIdentifier: .restingHeartRate)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        ]
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { [weak self] success, error in
            DispatchQueue.main.async {
                if success {
                    self?.isAuthorized = true
                    self?.authorizationStatus = "Authorized"
                    self?.addLog("✅ HealthKit authorization granted")
                } else {
                    self?.authorizationStatus = "Authorization failed: \(error?.localizedDescription ?? "Unknown error")"
                    self?.addLog("❌ Authorization failed")
                }
            }
        }
    }
    
    private func checkAuthorizationStatus() {
        guard HKHealthStore.isHealthDataAvailable() else {
            authorizationStatus = "HealthKit not available"
            return
        }
        
        let stepType = HKObjectType.quantityType(forIdentifier: .stepCount)!
        let status = healthStore.authorizationStatus(for: stepType)
        
        switch status {
        case .sharingAuthorized:
            isAuthorized = true
            authorizationStatus = "Authorized"
        case .sharingDenied:
            authorizationStatus = "Access Denied"
        case .notDetermined:
            authorizationStatus = "Not Requested"
        @unknown default:
            authorizationStatus = "Unknown"
        }
    }
    
    func syncSteps() {
        let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
        fetchLatestSample(for: stepType, unit: .count()) { [weak self] value in
            if let steps = value {
                self?.sendHealthData(type: "step_count", value: steps)
            }
        }
    }
    
    func syncHeartRate() {
        let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
        fetchLatestSample(for: heartRateType, unit: HKUnit.count().unitDivided(by: .minute())) { [weak self] value in
            if let heartRate = value {
                self?.sendHealthData(type: "heart_rate", value: heartRate)
            }
        }
    }
    
    func syncWeight() {
        let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass)!
        fetchLatestSample(for: weightType, unit: .gramUnit(with: .kilo)) { [weak self] value in
            if let weight = value {
                self?.sendHealthData(type: "body_mass", value: weight)
            }
        }
    }
    
    func syncAllData() {
        addLog("🔄 Starting full sync...")
        syncSteps()
        syncHeartRate()
        syncWeight()
        // Add more sync calls as needed
    }
    
    private func fetchLatestSample(for quantityType: HKQuantityType, unit: HKUnit, completion: @escaping (Double?) -> Void) {
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: quantityType, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, error in
            
            guard let sample = samples?.first as? HKQuantitySample else {
                DispatchQueue.main.async {
                    self.addLog("❌ No data found for \(quantityType.identifier)")
                }
                completion(nil)
                return
            }
            
            let value = sample.quantity.doubleValue(for: unit)
            completion(value)
        }
        
        healthStore.execute(query)
    }
    
    private func sendHealthData(type: String, value: Double) {
        guard let url = URL(string: apiEndpoint) else {
            addLog("❌ Invalid API endpoint")
            return
        }
        
        let payload: [String: Any] = [
            "user_id": userId,
            "type": type,
            "value": value,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "raw_data": [
                "from_ios_app": true,
                "app_version": "1.0",
                "sync_date": ISO8601DateFormatter().string(from: Date())
            ]
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            addLog("❌ Failed to encode data for \(type)")
            return
        }
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.addLog("❌ \(type): \(error.localizedDescription)")
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        self?.addLog("✅ \(type): \(value) sent successfully")
                    } else {
                        self?.addLog("❌ \(type): Server error \(httpResponse.statusCode)")
                    }
                }
            }
        }.resume()
    }
    
    private func addLog(_ message: String) {
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        logs.append("[\(timestamp)] \(message)")
        
        // Keep only last 20 log entries
        if logs.count > 20 {
            logs.removeFirst()
        }
    }
}
```

---

## 🧪 **Part 3: Testing**

### 1. Test Backend First
Before building the iOS app, test that your backend is working:

1. Go to `http://localhost:3001/analyze`
2. Click **Connect Apple Health** 
3. Complete the integration flow
4. Open the browser console and run:

```javascript
fetch('/api/applehealth/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: 'bb0ac2ff-72c5-4776-a83a-01855bff4df0' })
})
.then(r => r.json())
.then(console.log)
```

### 2. Test iOS App
1. **Build and run** on a real iPhone (not simulator)
2. **Grant HealthKit permissions** when prompted
3. **Tap sync buttons** to send data
4. **Check your `/analyze` page** to see the data appear

### 3. Verify Data
- Go to `/analyze` and click the Apple Health sync button
- You should see real data instead of sample data
- Check the data point counts update

---

## 🔧 **Troubleshooting**

### Common Issues

**1. "HealthKit not available"**
- Must run on real iPhone (not simulator)
- Check iOS version compatibility

**2. "Authorization failed"** 
- Check Info.plist permissions
- User may have denied access in Settings → Privacy & Security → Health

**3. "Network error"**
- Update `apiEndpoint` if using different server URL
- Check firewall/network settings
- For production, use HTTPS URL

**4. "No data found"**
- Add some health data in the Health app first
- Try walking around to generate step data
- Manually add weight data in Health app

### Debug Tips

- Check Xcode console for detailed error messages
- Monitor your server logs in terminal
- Use the `/api/applehealth/status` endpoint to check integration status
- Test individual sync functions before syncing all data

---

## 🚀 **Next Steps**

1. **Add more health metrics** - extend the code for sleep, blood pressure, etc.
2. **Implement background sync** - use HealthKit observers for automatic syncing
3. **Add error handling** - retry failed requests, handle network issues
4. **Deploy to TestFlight** - for easier testing on multiple devices
5. **Add data validation** - ensure data quality before sending

---

## 📡 **API Reference**

Your Supabase backend now has these endpoints:

- `POST /api/applehealth/receive` - Receive health data from iOS
- `GET /api/applehealth/status?user_id=X` - Check integration status  
- `POST /api/applehealth/test` - Test the integration
- `POST /api/applehealth/fetch` - Sync data (falls back to samples if no real data)

**Enjoy your real-time Apple Health integration!** 🎉 