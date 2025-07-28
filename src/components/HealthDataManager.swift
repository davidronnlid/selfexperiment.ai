import Foundation
import HealthKit
import UIKit

class HealthDataManager: ObservableObject {
    private let healthStore = HKHealthStore()
    
    @Published var syncStatus: String = "Ready"
    @Published var lastSyncTime: Date?
    @Published var authorizedDataTypes: Set<HKObjectType> = []
    @Published var deniedDataTypes: Set<HKObjectType> = []
    
    // MARK: - Comprehensive Health Data Types
    
    private var allHealthDataTypes: Set<HKSampleType> {
        var types = Set<HKSampleType>()
        
        // Activity & Fitness
        if let stepCount = HKQuantityType.quantityType(forIdentifier: .stepCount) { types.insert(stepCount) }
        if let distanceWalkingRunning = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) { types.insert(distanceWalkingRunning) }
        if let activeEnergyBurned = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) { types.insert(activeEnergyBurned) }
        if let basalEnergyBurned = HKQuantityType.quantityType(forIdentifier: .basalEnergyBurned) { types.insert(basalEnergyBurned) }
        if let flightsClimbed = HKQuantityType.quantityType(forIdentifier: .flightsClimbed) { types.insert(flightsClimbed) }
        if let exerciseTime = HKQuantityType.quantityType(forIdentifier: .appleExerciseTime) { types.insert(exerciseTime) }
        
        // Heart & Circulatory
        if let heartRate = HKQuantityType.quantityType(forIdentifier: .heartRate) { types.insert(heartRate) }
        if let restingHeartRate = HKQuantityType.quantityType(forIdentifier: .restingHeartRate) { types.insert(restingHeartRate) }
        if let heartRateVariability = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) { types.insert(heartRateVariability) }
        if let vo2Max = HKQuantityType.quantityType(forIdentifier: .vo2Max) { types.insert(vo2Max) }
        
        // Body Measurements
        if let bodyMass = HKQuantityType.quantityType(forIdentifier: .bodyMass) { types.insert(bodyMass) }
        if let bodyMassIndex = HKQuantityType.quantityType(forIdentifier: .bodyMassIndex) { types.insert(bodyMassIndex) }
        if let bodyFatPercentage = HKQuantityType.quantityType(forIdentifier: .bodyFatPercentage) { types.insert(bodyFatPercentage) }
        if let leanBodyMass = HKQuantityType.quantityType(forIdentifier: .leanBodyMass) { types.insert(leanBodyMass) }
        if let height = HKQuantityType.quantityType(forIdentifier: .height) { types.insert(height) }
        
        // Nutrition
        if let dietaryEnergyConsumed = HKQuantityType.quantityType(forIdentifier: .dietaryEnergyConsumed) { types.insert(dietaryEnergyConsumed) }
        if let dietaryWater = HKQuantityType.quantityType(forIdentifier: .dietaryWater) { types.insert(dietaryWater) }
        if let dietaryProtein = HKQuantityType.quantityType(forIdentifier: .dietaryProtein) { types.insert(dietaryProtein) }
        if let dietaryCarbohydrates = HKQuantityType.quantityType(forIdentifier: .dietaryCarbohydrates) { types.insert(dietaryCarbohydrates) }
        if let dietaryFatTotal = HKQuantityType.quantityType(forIdentifier: .dietaryFatTotal) { types.insert(dietaryFatTotal) }
        if let dietaryCaffeine = HKQuantityType.quantityType(forIdentifier: .dietaryCaffeine) { types.insert(dietaryCaffeine) }
        
        // Sleep & Mindfulness
        if let sleepAnalysis = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(sleepAnalysis) }
        if let mindfulSession = HKCategoryType.categoryType(forIdentifier: .mindfulSession) { types.insert(mindfulSession) }
        
        // Health Vitals
        if let respiratoryRate = HKQuantityType.quantityType(forIdentifier: .respiratoryRate) { types.insert(respiratoryRate) }
        if let oxygenSaturation = HKQuantityType.quantityType(forIdentifier: .oxygenSaturation) { types.insert(oxygenSaturation) }
        if let bodyTemperature = HKQuantityType.quantityType(forIdentifier: .bodyTemperature) { types.insert(bodyTemperature) }
        
        return types
    }
    
    // MARK: - Authorization Status Checking
    
    func checkAuthorizationStatus() -> Bool {
        updateAuthorizationStatus()
        return !authorizedDataTypes.isEmpty
    }
    
    func updateAuthorizationStatus() {
        var authorized = Set<HKObjectType>()
        var denied = Set<HKObjectType>()
        
        for dataType in allHealthDataTypes {
            let authStatus = healthStore.authorizationStatus(for: dataType)
            
            switch authStatus {
            case .sharingAuthorized:
                authorized.insert(dataType)
            case .sharingDenied:
                denied.insert(dataType)
            case .notDetermined:
                denied.insert(dataType)
            @unknown default:
                denied.insert(dataType)
            }
        }
        
        DispatchQueue.main.async {
            self.authorizedDataTypes = authorized
            self.deniedDataTypes = denied
        }
        
        print("📊 HealthKit Authorization Status:")
        print("   ✅ Authorized: \(authorized.count) data types")
        print("   ❌ Denied/Undetermined: \(denied.count) data types")
    }
    
    func getAuthorizationSummary() -> (authorized: Int, total: Int, percentage: Double) {
        updateAuthorizationStatus()
        let total = allHealthDataTypes.count
        let authorized = authorizedDataTypes.count
        let percentage = total > 0 ? Double(authorized) / Double(total) * 100 : 0
        return (authorized: authorized, total: total, percentage: percentage)
    }
    
    // MARK: - Authorization Request (Always Show UI)
    
    func requestAuthorization() async -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else { 
            print("❌ HealthKit is not available on this device")
            return false 
        }
        
        print("🔐 Requesting authorization for \(allHealthDataTypes.count) health data types...")
        
        do {
            try await healthStore.requestAuthorization(
                toShare: Set<HKSampleType>(),
                read: allHealthDataTypes
            )
            
            updateAuthorizationStatus()
            
            let summary = getAuthorizationSummary()
            print("✅ Authorization completed: \(summary.authorized)/\(summary.total) data types (\(String(format: "%.1f", summary.percentage))%)")
            
            return summary.authorized > 0
            
        } catch {
            print("❌ HealthKit authorization failed: \(error)")
            return false
        }
    }
    
    // MARK: - Real HealthKit Data Syncing
    
    func syncDateRange(startDate: Date, endDate: Date) async {
        print("🔄 Starting REAL comprehensive HealthKit data sync from \(startDate) to \(endDate)")
        
        DispatchQueue.main.async {
            self.syncStatus = "Syncing real HealthKit data..."
        }
        
        var totalSyncedCount = 0
        
        // Sync all authorized data types with real HealthKit data
        for dataType in authorizedDataTypes {
            if let quantityType = dataType as? HKQuantityType {
                let count = await syncRealQuantityData(quantityType: quantityType, startDate: startDate, endDate: endDate)
                totalSyncedCount += count
                print("✅ Synced \(count) real \(quantityType.identifier) samples")
            } else if let categoryType = dataType as? HKCategoryType {
                let count = await syncRealCategoryData(categoryType: categoryType, startDate: startDate, endDate: endDate)
                totalSyncedCount += count
                print("✅ Synced \(count) real \(categoryType.identifier) samples")
            }
        }
        
        DispatchQueue.main.async {
            self.syncStatus = "✅ Synced \(totalSyncedCount) real data points"
            self.lastSyncTime = Date()
        }
        
        print("🎉 Real HealthKit sync completed: \(totalSyncedCount) data points")
    }
    
    private func syncRealQuantityData(quantityType: HKQuantityType, startDate: Date, endDate: Date) async -> Int {
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate)
        
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: quantityType, 
                predicate: predicate, 
                limit: HKObjectQueryNoLimit, 
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                
                guard let samples = samples as? [HKQuantitySample], error == nil else {
                    print("❌ Error fetching real \(quantityType.identifier): \(error?.localizedDescription ?? "Unknown error")")
                    continuation.resume(returning: 0)
                    return
                }
                
                print("📊 Found \(samples.count) REAL \(quantityType.identifier) samples from HealthKit")
                
                // Send each REAL sample to backend
                Task {
                    var successCount = 0
                    for sample in samples {
                        let value = sample.quantity.doubleValue(for: self.getUnit(for: quantityType))
                        let apiType = self.getAPIType(for: quantityType)
                        
                        // Only send valid, realistic values
                        if self.isValidHealthValue(value: value, for: quantityType) {
                            await self.sendRealHealthData(type: apiType, value: value, timestamp: sample.startDate, source: sample.sourceRevision)
                            successCount += 1
                        }
                        
                        // Add small delay to avoid overwhelming the server
                        if successCount % 10 == 0 {
                            try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
                        }
                    }
                    continuation.resume(returning: successCount)
                }
            }
            
            healthStore.execute(query)
        }
    }
    
    private func syncRealCategoryData(categoryType: HKCategoryType, startDate: Date, endDate: Date) async -> Int {
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate)
        
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: categoryType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                
                guard let samples = samples as? [HKCategorySample], error == nil else {
                    print("❌ Error fetching real \(categoryType.identifier): \(error?.localizedDescription ?? "Unknown error")")
                    continuation.resume(returning: 0)
                    return
                }
                
                print("📊 Found \(samples.count) REAL \(categoryType.identifier) samples from HealthKit")
                
                Task {
                    var successCount = 0
                    for sample in samples {
                        let apiType = self.getAPIType(for: categoryType)
                        
                        if categoryType.identifier == HKCategoryTypeIdentifier.sleepAnalysis.rawValue {
                            // For sleep, calculate duration in hours
                            let duration = sample.endDate.timeIntervalSince(sample.startDate) / 3600.0 // hours
                            await self.sendRealHealthData(type: apiType, value: duration, timestamp: sample.startDate, source: sample.sourceRevision)
                        } else {
                            // For other categories, use the value
                            await self.sendRealHealthData(type: apiType, value: Double(sample.value), timestamp: sample.startDate, source: sample.sourceRevision)
                        }
                        successCount += 1
                    }
                    continuation.resume(returning: successCount)
                }
            }
            
            healthStore.execute(query)
        }
    }
    
    private func isValidHealthValue(value: Double, for quantityType: HKQuantityType) -> Bool {
        // Validate that health values are realistic to filter out test data
        switch quantityType.identifier {
        case HKQuantityTypeIdentifier.stepCount.rawValue:
            return value >= 0 && value <= 50000 && value == floor(value) // Steps should be whole numbers
        case HKQuantityTypeIdentifier.bodyMass.rawValue:
            return value >= 30 && value <= 300 // Reasonable weight range
        case HKQuantityTypeIdentifier.heartRate.rawValue, HKQuantityTypeIdentifier.restingHeartRate.rawValue:
            return value >= 30 && value <= 220 // Reasonable heart rate range
        case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
            return value >= 0 && value <= 5000 // Reasonable calorie range
        default:
            return value >= 0 // Basic positive check for other values
        }
    }
    
    private func getAPIType(for healthType: HKObjectType) -> String {
        // Map HealthKit types to API types
        if let quantityType = healthType as? HKQuantityType {
            switch quantityType.identifier {
            case HKQuantityTypeIdentifier.stepCount.rawValue:
                return "step_count"
            case HKQuantityTypeIdentifier.heartRate.rawValue:
                return "heart_rate"
            case HKQuantityTypeIdentifier.restingHeartRate.rawValue:
                return "resting_heart_rate"
            case HKQuantityTypeIdentifier.bodyMass.rawValue:
                return "body_mass"
            case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
                return "active_energy_burned"
            case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue:
                return "distance_walking_running"
            case HKQuantityTypeIdentifier.flightsClimbed.rawValue:
                return "flights_climbed"
            default:
                return quantityType.identifier
            }
        } else if let categoryType = healthType as? HKCategoryType {
            switch categoryType.identifier {
            case HKCategoryTypeIdentifier.sleepAnalysis.rawValue:
                return "sleep_analysis"
            case HKCategoryTypeIdentifier.mindfulSession.rawValue:
                return "mindful_session"
            default:
                return categoryType.identifier
            }
        }
        return "unknown"
    }
    
    private func getUnit(for quantityType: HKQuantityType) -> HKUnit {
        switch quantityType.identifier {
        case HKQuantityTypeIdentifier.stepCount.rawValue:
            return HKUnit.count()
        case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue:
            return HKUnit.meter()
        case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue, HKQuantityTypeIdentifier.basalEnergyBurned.rawValue:
            return HKUnit.kilocalorie()
        case HKQuantityTypeIdentifier.heartRate.rawValue, HKQuantityTypeIdentifier.restingHeartRate.rawValue:
            return HKUnit.count().unitDivided(by: HKUnit.minute()) // beats per minute
        case HKQuantityTypeIdentifier.bodyMass.rawValue:
            return HKUnit.gramUnit(with: .kilo)
        case HKQuantityTypeIdentifier.height.rawValue:
            return HKUnit.meter()
        case HKQuantityTypeIdentifier.respiratoryRate.rawValue:
            return HKUnit.count().unitDivided(by: HKUnit.minute()) // breaths per minute
        case HKQuantityTypeIdentifier.oxygenSaturation.rawValue:
            return HKUnit.percent()
        case HKQuantityTypeIdentifier.bodyTemperature.rawValue:
            return HKUnit.degreeCelsius()
        default:
            return HKUnit.count()
        }
    }
    
    // MARK: - Send REAL Data to Backend
    
    func sendRealHealthData(type: String, value: Double, timestamp: Date = Date(), source: HKSourceRevision? = nil) async {
        let url = URL(string: "\(ModularHealthConfig.baseURL)/api/applehealth/receive")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Create payload with REAL HealthKit metadata
        let payload: [String: Any] = [
            "user_id": ModularHealthConfig.userID,
            "type": type,
            "value": value,
            "timestamp": ISO8601DateFormatter().string(from: timestamp),
            "raw_data": [
                "from_ios_app": true,
                "real_healthkit_data": true,  // Mark as real data
                "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0",
                "device_info": UIDevice.current.model,
                "source_name": source?.source.name ?? "HealthKit",
                "source_bundle_id": source?.source.bundleIdentifier ?? "com.apple.health",
                "health_kit_metadata": [
                    "source": "HealthKit",
                    "device": UIDevice.current.model,
                    "data_timestamp": ISO8601DateFormatter().string(from: timestamp),
                    "sync_timestamp": ISO8601DateFormatter().string(from: Date()),
                    "authorization_summary": getAuthorizationSummary()
                ]
            ]
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                    print("✅ REAL \(type): \(value) synced successfully")
                    } else {
                    print("❌ REAL \(type): Server error \(httpResponse.statusCode)")
                        if let responseData = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                            print("   Error details: \(responseData)")
                    }
                }
            }
        } catch {
            print("❌ REAL \(type): Network error \(error)")
        }
    }
    
    // MARK: - Legacy Methods (Updated to use REAL data)
    
    func syncSteps() async {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount),
              authorizedDataTypes.contains(stepType) else {
            print("❌ Step count not authorized")
            return
        }
        
        print("🔄 Syncing REAL steps data from HealthKit...")
        
        // Get last 7 days of real step data
        let calendar = Calendar.current
        let endDate = Date()
        let startDate = calendar.date(byAdding: .day, value: -7, to: endDate)!
        
        let _ = await syncRealQuantityData(quantityType: stepType, startDate: startDate, endDate: endDate)
    }
    
    // Remove the fake sendHealthData method - now we only use sendRealHealthData
    
    // MARK: - Explicit Read Permission Request
    public func requestExplicitReadPermission() async -> String {
        print("🔄 Requesting EXPLICIT read permission for steps...")
        
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return "❌ Could not create step count type"
        }
        
        var results: [String] = []
        results.append("📋 Requesting explicit READ permission for steps...")
        
        return await withCheckedContinuation { continuation in
            // Request ONLY read permission (no sharing/writing)
            healthStore.requestAuthorization(toShare: [], read: [stepType]) { success, error in
                
                if let error = error {
                    let errorMsg = "❌ Permission request failed: \(error.localizedDescription)"
                    results.append(errorMsg)
                    continuation.resume(returning: results.joined(separator: "\n"))
                    return
                }
                
                results.append("✅ Permission request completed")
                
                if success {
                    results.append("🎉 Authorization dialog was shown to user")
                    results.append("💡 Now check if you can access step data")
                } else {
                    results.append("⚠️ Authorization request returned false")
                    results.append("💡 This might mean user denied read access")
                }
                
                // Add troubleshooting steps
                results.append("\n🔧 Troubleshooting Steps:")
                results.append("1. Open Health app > Browse > Activity > Steps")
                results.append("2. Verify you have step data for recent days")
                results.append("3. If no data: iPhone isn't tracking steps")
                results.append("4. Check Settings > Privacy > Health > Modular Health")
                results.append("5. Ensure 'Steps' is enabled under Data Access")
                
                continuation.resume(returning: results.joined(separator: "\n"))
            }
        }
    }
} 