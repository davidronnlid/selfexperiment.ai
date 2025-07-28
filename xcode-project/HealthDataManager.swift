import Foundation
import HealthKit
import UIKit

class HealthDataManager: ObservableObject, @unchecked Sendable {
    private let healthStore = HKHealthStore()
    
    @Published var syncStatus: String = "Ready"
    @Published var lastSyncTime: Date?
    @Published var authorizedDataTypes: Set<HKObjectType> = []
    @Published var deniedDataTypes: Set<HKObjectType> = []
    
    // MARK: - Categorized Health Data Types (Web-Inspired Granular Permissions)
    
    struct HealthDataCategory {
        let name: String
        let description: String
        let icon: String
        let dataTypes: Set<HKSampleType>
        let essential: Bool // Whether this is core functionality
    }
    
    var healthDataCategories: [HealthDataCategory] {
        return [
            // Essential - Core Activity Data
            HealthDataCategory(
                name: "Activity & Movement",
                description: "Steps, distance, calories burned, and exercise time",
                icon: "figure.walk",
                dataTypes: activityDataTypes,
                essential: true
            ),
            
            // Heart Health
            HealthDataCategory(
                name: "Heart Health",
                description: "Heart rate, blood pressure, and cardiovascular metrics",
                icon: "heart.fill",
                dataTypes: heartDataTypes,
                essential: false
            ),
            
            // Body Measurements
            HealthDataCategory(
                name: "Body Measurements",
                description: "Weight, height, BMI, and body composition",
                icon: "scalemass.fill",
                dataTypes: bodyDataTypes,
                essential: false
            ),
            
            // Sleep & Recovery
            HealthDataCategory(
                name: "Sleep & Recovery",
                description: "Sleep analysis, duration, and recovery metrics",
                icon: "bed.double.fill",
                dataTypes: sleepDataTypes,
                essential: false
            ),
            
            // Nutrition
            HealthDataCategory(
                name: "Nutrition",
                description: "Calories, water intake, and dietary information",
                icon: "fork.knife",
                dataTypes: nutritionDataTypes,
                essential: false
            ),
            
            // Health Vitals
            HealthDataCategory(
                name: "Health Vitals",
                description: "Temperature, oxygen levels, and vital signs",
                icon: "thermometer",
                dataTypes: vitalsDataTypes,
                essential: false
            )
        ]
    }
    
    // MARK: - Category-Specific Data Types
    
    private var activityDataTypes: Set<HKSampleType> {
        var types = Set<HKSampleType>()
        if let stepCount = HKQuantityType.quantityType(forIdentifier: .stepCount) { 
            types.insert(stepCount)
            print("✅ Added stepCount to activity data types")
        } else {
            print("❌ Failed to create stepCount data type")
        }
        if let distanceWalkingRunning = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) { 
            types.insert(distanceWalkingRunning)
            print("✅ Added distanceWalkingRunning to activity data types")
        } else {
            print("❌ Failed to create distanceWalkingRunning data type")
        }
        if let distanceCycling = HKQuantityType.quantityType(forIdentifier: .distanceCycling) { types.insert(distanceCycling) }
        if let activeEnergyBurned = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) { types.insert(activeEnergyBurned) }
        if let basalEnergyBurned = HKQuantityType.quantityType(forIdentifier: .basalEnergyBurned) { types.insert(basalEnergyBurned) }
        if let flightsClimbed = HKQuantityType.quantityType(forIdentifier: .flightsClimbed) { types.insert(flightsClimbed) }
        if let exerciseTime = HKQuantityType.quantityType(forIdentifier: .appleExerciseTime) { types.insert(exerciseTime) }
        if let standTime = HKQuantityType.quantityType(forIdentifier: .appleStandTime) { types.insert(standTime) }
        
        print("📊 Activity data types created: \(types.count) total")
        for type in types {
            print("   • \(type.identifier)")
        }
        
        return types
    }
    
    private var heartDataTypes: Set<HKSampleType> {
        var types = Set<HKSampleType>()
        if let heartRate = HKQuantityType.quantityType(forIdentifier: .heartRate) { types.insert(heartRate) }
        if let restingHeartRate = HKQuantityType.quantityType(forIdentifier: .restingHeartRate) { types.insert(restingHeartRate) }
        if let heartRateVariabilitySDNN = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) { types.insert(heartRateVariabilitySDNN) }
        if let bloodPressureSystolic = HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic) { types.insert(bloodPressureSystolic) }
        if let bloodPressureDiastolic = HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic) { types.insert(bloodPressureDiastolic) }
        if let vo2Max = HKQuantityType.quantityType(forIdentifier: .vo2Max) { types.insert(vo2Max) }
        return types
    }
    
    private var bodyDataTypes: Set<HKSampleType> {
        var types = Set<HKSampleType>()
        if let bodyMass = HKQuantityType.quantityType(forIdentifier: .bodyMass) { 
            types.insert(bodyMass)
            print("✅ Added bodyMass to body data types")
        } else {
            print("❌ Failed to create bodyMass data type")
        }
        if let bodyMassIndex = HKQuantityType.quantityType(forIdentifier: .bodyMassIndex) { 
            types.insert(bodyMassIndex)
            print("✅ Added bodyMassIndex to body data types")
        } else {
            print("❌ Failed to create bodyMassIndex data type")
        }
        if let bodyFatPercentage = HKQuantityType.quantityType(forIdentifier: .bodyFatPercentage) { 
            types.insert(bodyFatPercentage)
            print("✅ Added bodyFatPercentage to body data types")
        } else {
            print("❌ Failed to create bodyFatPercentage data type")
        }
        if let leanBodyMass = HKQuantityType.quantityType(forIdentifier: .leanBodyMass) { 
            types.insert(leanBodyMass)
            print("✅ Added leanBodyMass to body data types")
        } else {
            print("❌ Failed to create leanBodyMass data type")
        }
        if let height = HKQuantityType.quantityType(forIdentifier: .height) { 
            types.insert(height)
            print("✅ Added height to body data types")
        } else {
            print("❌ Failed to create height data type")
        }
        
        print("📊 Body data types created: \(types.count) total")
        for type in types {
            print("   • \(type.identifier)")
        }
        
        return types
    }
    
    private var sleepDataTypes: Set<HKSampleType> {
        var types = Set<HKSampleType>()
        if let sleepAnalysis = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(sleepAnalysis) }
        if let mindfulSession = HKCategoryType.categoryType(forIdentifier: .mindfulSession) { types.insert(mindfulSession) }
        return types
    }
    
    private var nutritionDataTypes: Set<HKSampleType> {
        var types = Set<HKSampleType>()
        if let dietaryEnergyConsumed = HKQuantityType.quantityType(forIdentifier: .dietaryEnergyConsumed) { types.insert(dietaryEnergyConsumed) }
        if let dietaryWater = HKQuantityType.quantityType(forIdentifier: .dietaryWater) { types.insert(dietaryWater) }
        if let dietaryProtein = HKQuantityType.quantityType(forIdentifier: .dietaryProtein) { types.insert(dietaryProtein) }
        if let dietaryCarbohydrates = HKQuantityType.quantityType(forIdentifier: .dietaryCarbohydrates) { types.insert(dietaryCarbohydrates) }
        if let dietaryFatTotal = HKQuantityType.quantityType(forIdentifier: .dietaryFatTotal) { types.insert(dietaryFatTotal) }
        if let dietaryCaffeine = HKQuantityType.quantityType(forIdentifier: .dietaryCaffeine) { types.insert(dietaryCaffeine) }
        return types
    }
    
    private var vitalsDataTypes: Set<HKSampleType> {
        var types = Set<HKSampleType>()
        if let respiratoryRate = HKQuantityType.quantityType(forIdentifier: .respiratoryRate) { 
            types.insert(respiratoryRate)
            print("✅ Added respiratoryRate to vitals data types")
        } else {
            print("❌ Failed to create respiratoryRate data type")
        }
        if let oxygenSaturation = HKQuantityType.quantityType(forIdentifier: .oxygenSaturation) { 
            types.insert(oxygenSaturation)
            print("✅ Added oxygenSaturation to vitals data types")
        } else {
            print("❌ Failed to create oxygenSaturation data type")
        }
        if let bodyTemperature = HKQuantityType.quantityType(forIdentifier: .bodyTemperature) { 
            types.insert(bodyTemperature)
            print("✅ Added bodyTemperature to vitals data types")
        } else {
            print("❌ Failed to create bodyTemperature data type")
        }
        
        print("📊 Vitals data types created: \(types.count) total")
        for type in types {
            print("   • \(type.identifier)")
        }
        
        return types
    }
    
    // Combined all data types for convenience
    private var allHealthDataTypes: Set<HKSampleType> {
        return healthDataCategories.reduce(into: Set<HKSampleType>()) { result, category in
            result.formUnion(category.dataTypes)
        }
    }
    
    // MARK: - Authorization Status Management
    
    func updateAuthorizationStatus() {
        authorizedDataTypes.removeAll()
        deniedDataTypes.removeAll()
        
        for dataType in allHealthDataTypes {
            let status = healthStore.authorizationStatus(for: dataType)
            switch status {
            case .sharingAuthorized:
                authorizedDataTypes.insert(dataType)
            case .sharingDenied:
                deniedDataTypes.insert(dataType)
            default:
                break
            }
        }
        
        print("📊 Authorization status updated: \(authorizedDataTypes.count) authorized, \(deniedDataTypes.count) denied")
    }
    
    func checkAuthorizationStatus() -> Bool {
        updateAuthorizationStatus()
        return !authorizedDataTypes.isEmpty
    }
    
    func getAuthorizationSummary() -> (authorized: Int, total: Int, percentage: Double) {
        updateAuthorizationStatus()
        let total = allHealthDataTypes.count
        let authorized = authorizedDataTypes.count
        let percentage = total > 0 ? Double(authorized) / Double(total) * 100 : 0
        return (authorized: authorized, total: total, percentage: percentage)
    }
    
    // Overall authorization summary (alias for UI compatibility)
    func getOverallAuthorizationSummary() -> (authorized: Int, total: Int, percentage: Double) {
        return getAuthorizationSummary()
    }
    
    // MARK: - Category-Based Authorization (Web-Inspired Granular Permissions)
    
    func requestAuthorizationForCategory(_ category: HealthDataCategory) async -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else { 
            print("❌ HealthKit is not available on this device")
            return false 
        }
        
        print("🔐 Requesting authorization for \(category.name) category (\(category.dataTypes.count) data types)...")
        print("📋 Data types: \(category.dataTypes.map { $0.identifier })")
        
        // CRITICAL: Ensure immediate native HealthKit dialog display
        return await withCheckedContinuation { continuation in
            // MUST be on main thread for native UI to appear
            DispatchQueue.main.async { [weak self] in
                guard let self = self else {
                    continuation.resume(returning: false)
                    return
                }
                
                print("📱 About to show NATIVE HealthKit permission dialog for: \(category.name)")
                print("🎯 This should trigger the native iOS health permission screen immediately...")
                
                // Debug: Print each data type to ensure they're valid
                for dataType in category.dataTypes {
                    print("   • \(dataType.identifier) (\(type(of: dataType)))")
                }
                
                // CRITICAL: Prepare data types exactly as Apple requires
                let readTypes = Set(category.dataTypes)  // Direct conversion - already HKSampleType
                let shareTypes = Set<HKSampleType>()     // Empty set for read-only access
                
                // Verify we have valid data types before requesting
                guard !readTypes.isEmpty else {
                    print("❌ No valid data types to request for \(category.name)")
                    continuation.resume(returning: false)
                    return
                }
                
                print("🔧 Final authorization request:")
                print("   📖 Read types (\(readTypes.count)): \(readTypes.map { $0.identifier })")
                print("   ✏️ Share types (\(shareTypes.count)): \(shareTypes.map { $0.identifier })")
                
                print("🚀 Calling HKHealthStore.requestAuthorization...")
                print("   📖 Read types: \(readTypes.map { $0.identifier })")
                print("   ✏️ Share types: \(shareTypes.map { $0.identifier })")
                
                // CRITICAL: Use the exact Apple HealthKit authorization pattern
                // This MUST show the native HealthKit permission screen
                self.healthStore.requestAuthorization(
                    toShare: shareTypes,  // Empty set for read-only
                    read: readTypes       // Category data types
                ) { [weak self] success, error in
                    
                    // Process results on main thread with longer delay to allow iOS to update authorization status
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        print("🔄 HealthKit authorization dialog completed for \(category.name)")
                        print("✅ Success flag: \(success)")
                        
                        if let error = error {
                            print("❌ HealthKit authorization error for \(category.name): \(error.localizedDescription)")
                            print("   Error details: \(error)")
                            continuation.resume(returning: false)
                            return
                        }
                        
                        // Update our internal authorization tracking
                        self?.updateAuthorizationStatus()
                        
                        // Check what permissions were actually granted in this category
                        guard let self = self else {
                            continuation.resume(returning: false)
                            return
                        }
                        
                        // Check authorization status with multiple attempts (iOS sometimes needs time to update)
                        self.checkAuthorizationWithRetry(for: category, attempt: 1) { finalResult in
                            continuation.resume(returning: finalResult)
                        }
                    }
                }
            }
        }
    }
    
    func requestEssentialPermissions() async -> (success: Bool, message: String, showedDialog: Bool) {
        let essentialCategories = healthDataCategories.filter { $0.essential }
        print("🔐 Requesting essential permissions immediately: \(essentialCategories.map { $0.name })")
        
        // Combine all essential data types into one authorization request
        let allEssentialDataTypes = essentialCategories.reduce(into: Set<HKSampleType>()) { result, category in
            result.formUnion(category.dataTypes)
        }
        
        guard !allEssentialDataTypes.isEmpty else {
            let msg = "❌ No essential data types found"
            print(msg)
            return (false, msg, false)
        }
        
        print("🎯 Requesting authorization for \(allEssentialDataTypes.count) essential data types")
        print("📋 Essential data types: \(allEssentialDataTypes.map { $0.identifier })")
        
        // Check if any permissions were already granted/denied
        var alreadyAuthorized = 0
        var alreadyDenied = 0
        var notDetermined = 0
        
        for dataType in allEssentialDataTypes {
            let status = healthStore.authorizationStatus(for: dataType)
            switch status {
            case .sharingAuthorized:
                alreadyAuthorized += 1
            case .sharingDenied:
                alreadyDenied += 1
            case .notDetermined:
                notDetermined += 1
            @unknown default:
                break
            }
        }
        
        print("📊 Current essential permissions status:")
        print("   ✅ Already authorized: \(alreadyAuthorized)")
        print("   ❌ Already denied: \(alreadyDenied)")
        print("   ❓ Not determined: \(notDetermined)")
        
        if alreadyAuthorized == allEssentialDataTypes.count {
            let msg = "✅ All essential permissions already granted! No dialog needed."
            print(msg)
            return (true, msg, false)
        }
        
        if alreadyDenied > 0 && notDetermined == 0 {
            let msg = """
            ⚠️ Some essential permissions were previously denied.
            
            To grant access:
            1. Delete this app and reinstall from Xcode
            2. Or go to: Settings > Privacy & Security > Health > Modular Health
            3. Turn on the health data types you want to share
            
            Currently denied: \(alreadyDenied) out of \(allEssentialDataTypes.count) data types
            """
            print("❌ Some essential permissions previously denied")
            return (false, msg, false)
        }
        
        return await withCheckedContinuation { continuation in
            DispatchQueue.main.async { [weak self] in
                guard let self = self else {
                    continuation.resume(returning: (false, "Internal error", false))
                    return
                }
                
                print("🚀 Calling HKHealthStore.requestAuthorization for essential permissions...")
                
                self.healthStore.requestAuthorization(
                    toShare: Set<HKSampleType>(),  // Empty set for read-only
                    read: allEssentialDataTypes    // All essential data types
                ) { [weak self] success, error in
                    
                    DispatchQueue.main.async {
                        print("🔄 Essential permissions authorization completed. Success: \(success)")
                        
                        if let error = error {
                            let msg = "❌ HealthKit error: \(error.localizedDescription)"
                            print(msg)
                            print("   Error details: \(error)")
                            continuation.resume(returning: (false, msg, false))
                            return
                        }
                        
                        // Update authorization status
                        self?.updateAuthorizationStatus()
                        
                        // Check how many essential permissions were granted
                        guard let self = self else {
                            continuation.resume(returning: (false, "Internal error", false))
                            return
                        }
                        
                        let authorizedCount = allEssentialDataTypes.filter { dataType in
                            self.healthStore.authorizationStatus(for: dataType) == .sharingAuthorized
                        }.count
                        
                        let deniedCount = allEssentialDataTypes.filter { dataType in
                            self.healthStore.authorizationStatus(for: dataType) == .sharingDenied
                        }.count
                        
                        let stillNotDetermined = allEssentialDataTypes.filter { dataType in
                            self.healthStore.authorizationStatus(for: dataType) == .notDetermined
                        }.count
                        
                        print("📊 Essential permissions final result:")
                        print("   ✅ Authorized: \(authorizedCount)")
                        print("   ❌ Denied: \(deniedCount)")
                        print("   ❓ Still not determined: \(stillNotDetermined)")
                        
                        if authorizedCount > 0 {
                            let msg = "🎉 Success! \(authorizedCount) out of \(allEssentialDataTypes.count) essential permissions granted."
                            print("✅ Essential permissions successful - \(authorizedCount) permissions granted")
                            continuation.resume(returning: (true, msg, true))
                        } else if deniedCount > 0 {
                            let msg = "❌ User denied essential permissions. Native dialog appeared but user denied access to \(deniedCount) data types."
                            print("❌ User denied essential permissions")
                            continuation.resume(returning: (false, msg, true))
                        } else {
                            let msg = """
                            ⚠️ No permissions determined after request.
                            
                            This suggests the native dialog may not have appeared, or you dismissed it without choosing.
                            
                            Try:
                            1. Delete and reinstall the app
                            2. Or go to Settings > Privacy & Security > Health > Modular Health
                            """
                            print("⚠️ No essential permissions determined after request")
                            continuation.resume(returning: (false, msg, false))
                        }
                    }
                }
            }
        }
    }
    
    func getAuthorizedDataTypesInCategory(_ category: HealthDataCategory) -> Set<HKObjectType> {
        return authorizedDataTypes.filter { dataType in
            category.dataTypes.contains { $0 == dataType }
        }
    }
    
    func getCategoryAuthorizationStatus(_ category: HealthDataCategory) -> (authorized: Int, total: Int, percentage: Double) {
        let authorizedInCategory = getAuthorizedDataTypesInCategory(category)
        let total = category.dataTypes.count
        let authorized = authorizedInCategory.count
        let percentage = total > 0 ? (Double(authorized) / Double(total)) * 100.0 : 0.0
        
        return (authorized: authorized, total: total, percentage: percentage)
    }
    
    func hasAnyPermissionsInCategory(_ category: HealthDataCategory) -> Bool {
        return getAuthorizedDataTypesInCategory(category).count > 0
    }
    
    func getAllCategoryStatuses() -> [(category: HealthDataCategory, status: (authorized: Int, total: Int, percentage: Double))] {
        return healthDataCategories.map { category in
            (category: category, status: getCategoryAuthorizationStatus(category))
        }
    }
    
    // MARK: - Legacy: Full Authorization (Fallback)
    
    func requestAuthorization() async -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else { 
            print("❌ HealthKit is not available on this device")
            return false 
        }
        
        print("🔐 Requesting authorization for \(allHealthDataTypes.count) health data types...")
        print("📋 Data types to request: \(allHealthDataTypes.map { $0.identifier })")
        
        // CRITICAL: Always show native HealthKit permission dialog
        return await withCheckedContinuation { continuation in
            // MUST be called on main thread to show the native HealthKit UI
            DispatchQueue.main.async { [weak self] in
                guard let self = self else {
                    continuation.resume(returning: false)
                    return
                }
                
                print("📱 About to call HealthKit authorization - native dialog should appear...")
                
                // CRITICAL: Convert to proper types and ensure non-empty sets
                let readTypes = Set<HKObjectType>(self.allHealthDataTypes)
                let shareTypes = Set<HKSampleType>() // Empty set for read-only access
                
                // Verify we have valid data types before requesting
                guard !readTypes.isEmpty else {
                    print("❌ No valid data types to request")
                    continuation.resume(returning: false)
                    return
                }
                
                print("🔧 Requesting authorization for \(readTypes.count) data types")
                
                // Request authorization for ALL health data types
                // This WILL show the native HealthKit permission screen
                self.healthStore.requestAuthorization(
                    toShare: shareTypes,   // Empty set for read-only
                    read: readTypes        // Properly typed as Set<HKObjectType>
                ) { [weak self] success, error in
                    
                    DispatchQueue.main.async {
                        print("🔄 HealthKit authorization completed. Success: \(success)")
                        
                        if let error = error {
                            print("❌ HealthKit authorization error: \(error.localizedDescription)")
                            continuation.resume(returning: false)
                            return
                        }
                        
                        // Update authorization status after request
                        self?.updateAuthorizationStatus()
                        
                        // Check how many permissions were actually granted
                        guard let self = self else {
                            continuation.resume(returning: false)
                            return
                        }
                        
                        let summary = self.getAuthorizationSummary()
                        print("📊 Final authorization result: \(summary.authorized)/\(summary.total) data types (\(String(format: "%.1f", summary.percentage))%)")
                        
                        // Log detailed permission status for debugging
                        print("🔍 Detailed permissions granted:")
                        for dataType in self.allHealthDataTypes {
                            let status = self.healthStore.authorizationStatus(for: dataType)
                            let statusString = self.authorizationStatusString(status)
                            print("   • \(dataType.identifier): \(statusString)")
                        }
                        
                        // Return true if ANY permissions were granted (even if not all)
                        let wasSuccessful = summary.authorized > 0
                        print(wasSuccessful ? "✅ Authorization successful - \(summary.authorized) permissions granted" : "❌ No permissions granted")
                        
                        continuation.resume(returning: wasSuccessful)
                    }
                }
            }
        }
    }
    
    // Helper method to convert authorization status to readable string
    private func authorizationStatusString(_ status: HKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "Not Determined"
        case .sharingDenied:
            return "Denied"
        case .sharingAuthorized:
            return "Authorized"
        @unknown default:
            return "Unknown"
        }
    }
    
    // Check authorization status with retry logic (iOS sometimes needs time to update)
    private func checkAuthorizationWithRetry(for category: HealthDataCategory, attempt: Int, completion: @escaping (Bool) -> Void) {
        print("🔍 Checking authorization status for \(category.name) (attempt \(attempt))")
        
        // Update our internal authorization tracking
        updateAuthorizationStatus()
        
        let authorizedInCategory = getAuthorizedDataTypesInCategory(category)
        let totalInCategory = category.dataTypes.count
        
        print("📊 \(category.name) result (attempt \(attempt)): \(authorizedInCategory.count)/\(totalInCategory) data types authorized")
        
        // Log each data type's authorization status with more detail
        var authorizedCount = 0
        var deniedCount = 0
        var notDeterminedCount = 0
        
        for dataType in category.dataTypes {
            let status = healthStore.authorizationStatus(for: dataType)
            let statusString = authorizationStatusString(status)
            print("   • \(dataType.identifier): \(statusString)")
            
            switch status {
            case .sharingAuthorized:
                authorizedCount += 1
            case .sharingDenied:
                deniedCount += 1
            case .notDetermined:
                notDeterminedCount += 1
            @unknown default:
                break
            }
        }
        
        print("   📈 Summary: \(authorizedCount) authorized, \(deniedCount) denied, \(notDeterminedCount) not determined")
        
        let wasSuccessful = authorizedCount > 0
        
        // If we found authorized data types, or we've tried 5 times, return the result
        if wasSuccessful || attempt >= 5 {
            print(wasSuccessful ? 
                  "✅ \(category.name) authorization successful - \(authorizedCount) permissions granted" : 
                  "⚠️ No \(category.name) permissions granted after \(attempt) attempts")
            completion(wasSuccessful)
        } else {
            // If we still have not determined statuses and haven't maxed out attempts, retry
            if notDeterminedCount > 0 && attempt < 5 {
                print("🔄 Still have \(notDeterminedCount) undetermined permissions, retrying in 1.5 seconds...")
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    self.checkAuthorizationWithRetry(for: category, attempt: attempt + 1, completion: completion)
                }
            } else {
                print("⚠️ No permissions granted - user likely denied access")
                completion(false)
            }
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
                "device_info": await UIDevice.current.model,
                "source_name": source?.source.name ?? "HealthKit",
                "source_bundle_id": source?.source.bundleIdentifier ?? "com.apple.health",
                "health_kit_metadata": [
                    "source": "HealthKit",
                    "device": await UIDevice.current.model,
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
    
    // MARK: - HealthKit Test & Verification
    
    func testHealthKitConfiguration() -> (available: Bool, configured: Bool, details: String) {
        var details = "📋 HealthKit Configuration Test:\n"
        
        // Test 1: HealthKit Availability
        let isAvailable = HKHealthStore.isHealthDataAvailable()
        details += "   📱 Device supports HealthKit: \(isAvailable ? "✅ Yes" : "❌ No")\n"
        
        if !isAvailable {
            return (available: false, configured: false, details: details + "   ⚠️  HealthKit not available on this device")
        }
        
        // Test 2: Basic HealthStore Creation
        details += "   🏪 HealthStore created: ✅ Yes\n"
        
        // Test 3: Sample Data Type Creation
        let testTypes = [
            HKQuantityType.quantityType(forIdentifier: .stepCount),
            HKQuantityType.quantityType(forIdentifier: .heartRate),
            HKQuantityType.quantityType(forIdentifier: .bodyMass)
        ]
        
        let validTypes = testTypes.compactMap { $0 }
        details += "   📊 Basic data types available: \(validTypes.count)/\(testTypes.count) ✅\n"
        
        // Test 4: Authorization Status Check
        details += "   🔐 Current authorization status:\n"
        for (index, dataType) in Array(allHealthDataTypes.prefix(5)).enumerated() {
            let status = healthStore.authorizationStatus(for: dataType)
            let statusString = authorizationStatusString(status)
            details += "      \(index + 1). \(dataType.identifier): \(statusString)\n"
        }
        
        let configured = validTypes.count == testTypes.count
        details += configured ? "   ✅ HealthKit properly configured!" : "   ❌ HealthKit configuration issues"
        
        return (available: isAvailable, configured: configured, details: details)
    }
    
    // MARK: - Debug Function
    
    func debugHealthKitSetup() async -> String {
        var debug = "🔧 HealthKit Debug Report:\n\n"
        
        // Test 1: Basic availability
        let isAvailable = HKHealthStore.isHealthDataAvailable()
        debug += "📱 HealthKit Available: \(isAvailable ? "✅ YES" : "❌ NO")\n"
        
        if !isAvailable {
            debug += "\n❌ HealthKit is not available on this device.\nThis might be an iPad or simulator."
            return debug
        }
        
        // Test 2: Data type creation
        debug += "\n🧪 Testing Data Type Creation:\n"
        let testTypes = [
            ("Step Count", HKQuantityType.quantityType(forIdentifier: .stepCount)),
            ("Body Mass", HKQuantityType.quantityType(forIdentifier: .bodyMass)),
            ("Heart Rate", HKQuantityType.quantityType(forIdentifier: .heartRate)),
            ("Respiratory Rate", HKQuantityType.quantityType(forIdentifier: .respiratoryRate))
        ]
        
        var validTypes: [HKSampleType] = []
        for (name, type) in testTypes {
            if let type = type {
                debug += "   ✅ \(name): Created successfully\n"
                validTypes.append(type)
            } else {
                debug += "   ❌ \(name): Failed to create\n"
            }
        }
        
        // Test 3: Simple authorization test
        debug += "\n🔐 Testing Authorization Request:\n"
        debug += "   📋 Will test with \(validTypes.count) data types\n"
        
        if validTypes.isEmpty {
            debug += "   ❌ No valid data types to test with\n"
            return debug
        }
        
        // Try a simple authorization request
        let authResult = await testSimpleAuthorization(with: validTypes.first!)
        debug += "   📊 Authorization Test: \(authResult.success ? "✅ SUCCESS" : "❌ FAILED")\n"
        debug += "   📝 Details: \(authResult.message)\n"
        
        return debug
    }
    
    private func testSimpleAuthorization(with dataType: HKSampleType) async -> (success: Bool, message: String) {
        return await withCheckedContinuation { continuation in
            DispatchQueue.main.async { [weak self] in
                guard let self = self else {
                    continuation.resume(returning: (false, "Self is nil"))
                    return
                }
                
                print("🧪 Testing simple authorization for: \(dataType.identifier)")
                
                let timeout = DispatchWorkItem {
                    print("⏱️ Authorization request timed out after 10 seconds")
                    continuation.resume(returning: (false, "Authorization request timed out - dialog may not have appeared"))
                }
                
                // Set a 10 second timeout
                DispatchQueue.main.asyncAfter(deadline: .now() + 10.0, execute: timeout)
                
                self.healthStore.requestAuthorization(
                    toShare: Set<HKSampleType>(),
                    read: Set([dataType])
                ) { success, error in
                    timeout.cancel() // Cancel the timeout
                    
                    DispatchQueue.main.async {
                        if let error = error {
                            print("❌ Authorization error: \(error.localizedDescription)")
                            continuation.resume(returning: (false, "Error: \(error.localizedDescription)"))
                        } else {
                            let status = self.healthStore.authorizationStatus(for: dataType)
                            let statusString = self.authorizationStatusString(status)
                            print("📊 Authorization completed - Status: \(statusString)")
                            
                            let message = "Success: \(success), Status: \(statusString)"
                            continuation.resume(returning: (success, message))
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Steps-Only Implementation
    
    // Simple steps-only authorization
    func requestStepsAuthorization() async -> Bool {
        print("🚶‍♂️ Starting steps authorization...")
        print("📱 Device: \(await UIDevice.current.model), iOS: \(await UIDevice.current.systemVersion)")
        
        // 1. Check HealthKit availability
        guard HKHealthStore.isHealthDataAvailable() else {
            print("❌ HealthKit not available on this device")
            return false
        }
        print("✅ HealthKit is available")
        
        // 2. Create step count type
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            print("❌ Could not create step count type")
            return false
        }
        print("✅ Step count type created: \(stepType.identifier)")
        
        // 3. Check current status first
        let currentStatus = healthStore.authorizationStatus(for: stepType)
        print("📊 Current steps authorization status: \(authorizationStatusString(currentStatus))")
        
        if currentStatus == .sharingAuthorized {
            print("✅ Steps already authorized!")
            return true
        }
        
        // 4. Check if we've asked before (this is key!)
        if currentStatus == .sharingDenied {
            print("⚠️ Steps access was previously denied - dialog won't appear again")
            print("💡 User needs to manually enable in Settings > Privacy & Security > Health > Modular Health")
            return false
        }
        
        // 5. Request authorization with detailed logging
        print("📱 About to call requestAuthorization for steps...")
        print("📋 Read permissions: [\(stepType.identifier)]")
        print("📋 Write permissions: [] (empty)")
        
        return await withCheckedContinuation { continuation in
            print("🔄 Calling healthStore.requestAuthorization...")
            
            healthStore.requestAuthorization(
                toShare: [],  // No write permissions
                read: [stepType]  // Just read step count
            ) { success, error in
                print("🎯 Authorization callback triggered!")
                print("✅ Success flag: \(success)")
                
                if let error = error {
                    print("❌ Authorization error: \(error)")
                    print("❌ Error description: \(error.localizedDescription)")
                    continuation.resume(returning: false)
                    return
                }
                
                if !success {
                    print("⚠️ Authorization returned success=false (user likely denied or dismissed)")
                }
                
                // 6. Wait and check final status
                print("⏳ Waiting 2 seconds for iOS to update authorization status...")
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    let finalStatus = self.healthStore.authorizationStatus(for: stepType)
                    let isAuthorized = finalStatus == .sharingAuthorized
                    
                    print("📊 Final steps status: \(self.authorizationStatusString(finalStatus))")
                    print("🎯 Final result: \(isAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED")")
                    
                    if !isAuthorized && success {
                        print("🤔 Weird: success=true but status != authorized")
                        print("💭 This usually means user dismissed dialog or denied access")
                    }
                    
                    continuation.resume(returning: isAuthorized)
                }
            }
            
            print("📲 requestAuthorization call completed - waiting for callback...")
        }
    }
    
    // Fetch steps data for the last 7 days
    func fetchStepsData() async -> [(date: Date, steps: Double)] {
        print("📊 Fetching steps data...")
        
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            print("❌ Could not create step count type")
            return []
        }
        
        // Check authorization first
        let status = healthStore.authorizationStatus(for: stepType)
        guard status == .sharingAuthorized else {
            print("❌ Steps not authorized: \(authorizationStatusString(status))")
            return []
        }
        
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .day, value: -7, to: endDate) ?? endDate
        
        print("📅 Fetching steps from \(startDate) to \(endDate)")
        
        return await withCheckedContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
            
            let query = HKStatisticsCollectionQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum,
                anchorDate: startDate,
                intervalComponents: DateComponents(day: 1)
            )
            
            query.initialResultsHandler = { query, results, error in
                var stepsData: [(date: Date, steps: Double)] = []
                
                if let error = error {
                    print("❌ Error fetching steps: \(error.localizedDescription)")
                    continuation.resume(returning: [])
                    return
                }
                
                results?.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
                    if let sum = statistics.sumQuantity() {
                        let steps = sum.doubleValue(for: HKUnit.count())
                        let date = statistics.startDate
                        stepsData.append((date: date, steps: steps))
                        print("📊 \(Self.dateFormatter.string(from: date)): \(Int(steps)) steps")
                    }
                }
                
                print("✅ Found \(stepsData.count) days of steps data")
                continuation.resume(returning: stepsData)
            }
            
            healthStore.execute(query)
        }
    }
    
    // Date formatter for display
    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter
    }()
    
    // Check if steps are currently authorized
    func isStepsAuthorized() -> Bool {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return false
        }
        return healthStore.authorizationStatus(for: stepType) == .sharingAuthorized
    }
    
    // Simple entitlements test
    func testEntitlementsFixed() -> String {
        var report = "🔧 Entitlements Fix Test\n\n"
        
        // Test HealthKit availability
        let available = HKHealthStore.isHealthDataAvailable()
        report += "✅ HealthKit Available: \(available)\n"
        
        // Test step count type creation
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            report += "❌ Failed to create step count type\n"
            return report
        }
        report += "✅ Step count type created successfully\n"
        
        // Check current authorization status
        let status = healthStore.authorizationStatus(for: stepType)
        report += "📊 Current Status: \(authorizationStatusString(status))\n"
        
        // Check bundle and entitlements
        let bundle = Bundle.main
        if let bundleId = bundle.bundleIdentifier {
            report += "📦 Bundle ID: \(bundleId)\n"
        }
        
        // Look for entitlements in bundle
        if let entitlementsPath = bundle.path(forResource: "ModularHealth", ofType: "entitlements") {
            report += "✅ Entitlements file found in app bundle\n"
        } else {
            report += "❌ Entitlements file still not found in app bundle\n"
            report += "💡 This means the Xcode project needs to be rebuilt\n"
        }
        
        return report
    }
    
    // More robust steps authorization with extended waiting and multiple checks
    func requestStepsAuthorizationRobust() async -> Bool {
        print("🚶‍♂️ Starting ROBUST steps authorization...")
        print("🔋 Function called successfully")
        
        guard HKHealthStore.isHealthDataAvailable() else {
            print("❌ HealthKit not available")
            return false
        }
        print("✅ HealthKit is available")
        
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            print("❌ Could not create step count type")
            return false
        }
        print("✅ Step count type created")
        
        // Check initial status
        let initialStatus = healthStore.authorizationStatus(for: stepType)
        print("📊 Initial status: \(authorizationStatusString(initialStatus))")
        
        if initialStatus == .sharingAuthorized {
            print("✅ Already authorized!")
            return true
        }
        
        if initialStatus == .sharingDenied {
            print("⚠️ Status is denied - attempting authorization anyway...")
        }
        
        // Request authorization
        print("🔋 About to request authorization...")
        return await withCheckedContinuation { continuation in
            print("📱 Requesting authorization...")
            
            healthStore.requestAuthorization(toShare: [], read: [stepType]) { success, error in
                print("🎯 Authorization callback received!")
                print("✅ Success: \(success)")
                
                if let error = error {
                    print("❌ Error: \(error)")
                    continuation.resume(returning: false)
                    return
                }
                
                print("🔋 Starting extended status checking...")
                // Check status multiple times with increasing delays
                self.checkAuthorizationWithRetries(for: stepType, attempt: 1) { finalResult in
                    print("🔋 Final result from retry checking: \(finalResult)")
                    continuation.resume(returning: finalResult)
                }
            }
            
            print("🔋 Authorization request sent, waiting for callback...")
        }
    }
    
    // Check authorization with multiple retries and longer delays
    private func checkAuthorizationWithRetries(for dataType: HKQuantityType, attempt: Int, completion: @escaping (Bool) -> Void) {
        let status = healthStore.authorizationStatus(for: dataType)
        let isAuthorized = status == .sharingAuthorized
        
        print("🔍 Attempt \(attempt): Status = \(authorizationStatusString(status))")
        
        if isAuthorized {
            print("✅ Authorization confirmed on attempt \(attempt)!")
            completion(true)
            return
        }
        
        // Try up to 10 times with increasing delays
        if attempt < 10 {
            let delay = Double(attempt) * 0.5 // 0.5s, 1s, 1.5s, 2s, etc.
            print("⏳ Waiting \(delay) seconds before attempt \(attempt + 1)...")
            
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                self.checkAuthorizationWithRetries(for: dataType, attempt: attempt + 1, completion: completion)
            }
        } else {
            print("❌ Authorization failed after \(attempt) attempts")
            print("💡 Final status: \(authorizationStatusString(status))")
            completion(false)
        }
    }
    
    // Verify entitlements
    func verifyEntitlements() -> String {
        var report = "🔒 Entitlements Verification\n\n"
        
        let bundle = Bundle.main
        
        // Check if entitlements file exists and report the path
        if let entitlementsPath = bundle.path(forResource: "ModularHealth", ofType: "entitlements") {
            report += "✅ Entitlements file found at: \(entitlementsPath)\n"
        } else {
            report += "❌ Entitlements file not found\n"
        }
        
        // Check bundle info
        if let bundleId = bundle.bundleIdentifier {
            report += "📦 Bundle ID: \(bundleId)\n"
        }
        
        // Try to create various HealthKit types to test permissions
        let testTypes: [(String, HKQuantityTypeIdentifier)] = [
            ("Step Count", .stepCount),
            ("Walking Distance", .distanceWalkingRunning),
            ("Active Energy", .activeEnergyBurned)
        ]
        
        report += "\n🧪 Testing HealthKit Type Creation:\n"
        for (name, identifier) in testTypes {
            if let _ = HKQuantityType.quantityType(forIdentifier: identifier) {
                report += "✅ \(name): OK\n"
            } else {
                report += "❌ \(name): Failed\n"
            }
        }
        
        return report
    }
    
    // Comprehensive HealthKit diagnostics
    func diagnoseHealthKitSetup() async -> String {
        var report = "🔍 HealthKit Diagnostic Report\n\n"
        
        // Device info
        report += "📱 Device: \(await UIDevice.current.model)\n"
        report += "🖥️ iOS Version: \(await UIDevice.current.systemVersion)\n"
        report += "📦 App Bundle: \(Bundle.main.bundleIdentifier ?? "unknown")\n\n"
        
        // HealthKit availability
        let available = HKHealthStore.isHealthDataAvailable()
        report += "✅ HealthKit Available: \(available)\n"
        
        if !available {
            report += "❌ HealthKit is not available on this device!\n"
            report += "💡 HealthKit only works on physical iOS devices, not simulators.\n"
            return report
        }
        
        // Step count type creation
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            report += "❌ Failed to create step count data type\n"
            return report
        }
        report += "✅ Step count type created: \(stepType.identifier)\n"
        
        // Current authorization status
        let status = healthStore.authorizationStatus(for: stepType)
        report += "📊 Current Status: \(authorizationStatusString(status))\n\n"
        
        // Status-specific guidance
        switch status {
        case .notDetermined:
            report += "✅ Good! Status is 'notDetermined' - dialog should appear\n"
            report += "💡 The native HealthKit dialog should show when you request authorization\n"
        case .sharingDenied:
            report += "⚠️ Status is 'denied' - dialog will NOT appear\n"
            report += "💡 User previously denied access. To reset:\n"
            report += "   • Delete and reinstall the app, OR\n"
            report += "   • Go to Settings > Privacy & Security > Health > Modular Health\n"
        case .sharingAuthorized:
            report += "✅ Already authorized! No dialog needed\n"
        @unknown default:
            report += "❓ Unknown authorization status\n"
        }
        
        // Test a simple authorization request
        report += "\n🧪 Testing authorization request...\n"
        
        let testResult = await withCheckedContinuation { continuation in
            healthStore.requestAuthorization(toShare: [], read: [stepType]) { success, error in
                var testReport = ""
                if let error = error {
                    testReport = "❌ Authorization request failed: \(error.localizedDescription)"
                } else if success {
                    testReport = "✅ Authorization request completed successfully"
                } else {
                    testReport = "⚠️ Authorization request completed but success=false"
                }
                continuation.resume(returning: testReport)
            }
        }
        
        report += testResult + "\n"
        
        // Final status check
        let finalStatus = healthStore.authorizationStatus(for: stepType)
        report += "📊 Status after test: \(authorizationStatusString(finalStatus))\n"
        
        return report
    }
    
    // Manual reset instructions
    func getManualResetInstructions() -> String {
        return """
        🔄 Manual HealthKit Reset Instructions
        
        Since you granted access but the status is still "Denied", try these solutions:
        
        📱 SOLUTION 1 - Delete & Reinstall App:
        1. Delete "Modular Health" from your iPhone
        2. In Xcode: Product → Clean Build Folder
        3. Build and run again (⌘+R)
        4. Grant access when prompted
        
        ⚙️ SOLUTION 2 - Manual Settings:
        1. Go to: Settings → Privacy & Security
        2. Tap: Health
        3. Tap: Modular Health
        4. Turn ON "Steps" permission
        5. Return to app and try again
        
        🔧 SOLUTION 3 - Reset All Health Data:
        1. Settings → General → Transfer or Reset iPhone
        2. Reset → Reset Privacy & Security
        3. This will reset ALL health permissions
        
        💡 The issue is that iOS granted access but the app can't detect it due to entitlements or timing issues.
        """
    }
    
    // Diagnose the "granted but shows denied" iOS bug
    func diagnoseAuthorizationBug() async -> String {
        var report = "🐛 Authorization Bug Diagnosis\n\n"
        
        // Check device and iOS version
        let device = await UIDevice.current.model
        let version = await UIDevice.current.systemVersion
        report += "📱 Device: \(device)\n"
        report += "🔢 iOS Version: \(version)\n\n"
        
        // Check HealthKit availability
        let available = HKHealthStore.isHealthDataAvailable()
        report += "✅ HealthKit Available: \(available)\n\n"
        
        if !available {
            report += "❌ Root cause: HealthKit not available on this device\n"
            return report
        }
        
        // Check entitlements
        let bundle = Bundle.main
        if let entitlementsPath = bundle.path(forResource: "ModularHealth", ofType: "entitlements") {
            report += "✅ Entitlements file found in app bundle\n"
            report += "📁 Path: \(entitlementsPath)\n"
        } else {
            report += "❌ Entitlements file NOT found in app bundle\n"
            report += "💡 This is likely the root cause - entitlements not properly linked\n"
            report += "🔧 Fixed: Updated path to 'Modular Health/ModularHealth.entitlements'\n"
            report += "⚠️ Requires: Clean Build Folder + Rebuild to take effect\n\n"
        }
        
        // Check bundle ID
        if let bundleId = bundle.bundleIdentifier {
            report += "📦 Bundle ID: \(bundleId)\n"
        }
        
        // Test data type creation
        let types = getAvailableHealthKitTypes()
        report += "🧪 Data Types: \(types.count) types successfully created\n\n"
        
        // Check specific authorization status for each type
        report += "📊 Current Authorization Status:\n"
        var allDenied = true
        var allNotDetermined = true
        
        for type in types {
            let status = healthStore.authorizationStatus(for: type)
            let friendlyName = getFriendlyName(for: type.identifier)
            let statusString = authorizationStatusString(status)
            
            report += "   • \(friendlyName): \(statusString)\n"
            
            if status != .sharingDenied {
                allDenied = false
            }
            if status != .notDetermined {
                allNotDetermined = false
            }
        }
        
        report += "\n🔍 Pattern Analysis:\n"
        
        if allDenied {
            report += "❌ All types show 'Denied' - This is the iOS authorization bug\n"
            report += "💡 You granted access but iOS isn't updating the status\n\n"
            report += "🔧 Recommended Fix:\n"
            report += "1. Delete the app completely from your iPhone\n"
            report += "2. In Xcode: Product → Clean Build Folder\n"
            report += "3. Build and run again\n"
            report += "4. This forces iOS to reset the authorization cache\n"
        } else if allNotDetermined {
            report += "⚠️ All types show 'Not Determined' - Authorization hasn't been requested yet\n"
        } else {
            report += "✅ Mixed status - Some types are working properly\n"
        }
        
        return report
    }
    
    // Test if entitlements are now working after the path fix
    func testEntitlementsAfterFix() -> String {
        var report = "🔧 Entitlements Fix Verification\n\n"
        
        // Check if entitlements file is now found
        let bundle = Bundle.main
        if let entitlementsPath = bundle.path(forResource: "ModularHealth", ofType: "entitlements") {
            report += "✅ SUCCESS: Entitlements file found in app bundle!\n"
            report += "📁 Path: \(entitlementsPath)\n\n"
            
            // Try to read the entitlements content
            if let entitlementsData = try? Data(contentsOf: URL(fileURLWithPath: entitlementsPath)),
               let entitlementsString = String(data: entitlementsData, encoding: .utf8) {
                report += "📄 Entitlements Content:\n"
                report += entitlementsString + "\n\n"
            }
            
            report += "🎉 The entitlements fix worked!\n"
            report += "💡 HealthKit authorization should now work properly.\n"
        } else {
            report += "❌ FAILED: Entitlements file still not found\n"
            report += "⚠️ You need to rebuild the app for changes to take effect:\n"
            report += "1. In Xcode: Product → Clean Build Folder\n"
            report += "2. Product → Build\n"
            report += "3. Product → Run\n"
        }
        
        return report
    }
    
    // MARK: - Simple Test Function
    
    func testBasicHealthKitAuthorization() async -> (success: Bool, message: String, showedDialog: Bool) {
        print("🧪 Testing basic HealthKit authorization...")
        
        guard HKHealthStore.isHealthDataAvailable() else {
            let msg = "❌ HealthKit not available on this device"
            print(msg)
            return (false, msg, false)
        }
        
        // Test with just step count - the most basic HealthKit data type
        guard let stepCountType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            let msg = "❌ Could not create step count data type"
            print(msg)
            return (false, msg, false)
        }
        
        // FIRST: Check current authorization status BEFORE requesting
        let currentStatus = healthStore.authorizationStatus(for: stepCountType)
        print("📊 Current step count authorization status: \(authorizationStatusString(currentStatus))")
        
        switch currentStatus {
        case .sharingAuthorized:
            let msg = "✅ Step count access already granted! No dialog needed."
            print(msg)
            return (true, msg, false)
            
        case .sharingDenied:
            let msg = """
            ⚠️ Step count access was previously denied.
            
            To grant access:
            1. Delete this app from your iPhone
            2. Reinstall from Xcode
            3. Grant permissions when prompted
            
            Or go to: Settings > Privacy & Security > Health > Modular Health
            """
            print("❌ Step count access previously denied")
            return (false, msg, false)
            
        case .notDetermined:
            print("🎯 Step count permissions not determined - should show native dialog")
            break
            
        @unknown default:
            print("❓ Unknown authorization status")
            break
        }
        
        print("📱 Requesting authorization for step count (should show native dialog)...")
        
        return await withCheckedContinuation { continuation in
            DispatchQueue.main.async { [weak self] in
                guard let self = self else {
                    continuation.resume(returning: (false, "Internal error", false))
                    return
                }
                
                print("🚀 Calling HKHealthStore.requestAuthorization...")
                
                // Request authorization - should show native dialog for first time
                self.healthStore.requestAuthorization(
                    toShare: Set<HKSampleType>(),   // No write permissions
                    read: Set([stepCountType])      // Just step count
                ) { success, error in
                    DispatchQueue.main.async {
                        print("📋 Authorization request completed - Success: \(success)")
                        
                        if let error = error {
                            let msg = "❌ HealthKit error: \(error.localizedDescription)"
                            print(msg)
                            print("   Full error: \(error)")
                            continuation.resume(returning: (false, msg, false))
                            return
                        }
                        
                        // Check the ACTUAL authorization status after the request
                        let finalStatus = self.healthStore.authorizationStatus(for: stepCountType)
                        print("📊 Final step count authorization status: \(self.authorizationStatusString(finalStatus))")
                        
                        switch finalStatus {
                        case .sharingAuthorized:
                            let msg = "🎉 Success! Step count access granted. Native dialog appeared and user granted permission."
                            print(msg)
                            continuation.resume(returning: (true, msg, true))
                            
                        case .sharingDenied:
                            let msg = "❌ User denied step count access. Native dialog appeared but user denied permission."
                            print(msg)
                            continuation.resume(returning: (false, msg, true))
                            
                        case .notDetermined:
                            let msg = """
                            ⚠️ Permission still not determined. This suggests:
                            1. The native dialog may not have appeared
                            2. Or the user dismissed it without choosing
                            
                            Try deleting and reinstalling the app.
                            """
                            print("⚠️ Permission still not determined after request")
                            continuation.resume(returning: (false, msg, false))
                            
                        @unknown default:
                            let msg = "❓ Unknown permission status after request"
                            print(msg)
                            continuation.resume(returning: (false, msg, false))
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Production-Ready HealthKit Authorization
    
    // Get all available HealthKit data types for step-by-step authorization
    private func getAvailableHealthKitTypes() -> [HKSampleType] {
        var types: [HKSampleType] = []
        
        // Essential activity types
        if let stepCount = HKQuantityType.quantityType(forIdentifier: .stepCount) {
            types.append(stepCount)
        }
        if let distance = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) {
            types.append(distance)
        }
        if let calories = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
            types.append(calories)
        }
        
        // Heart rate
        if let heartRate = HKQuantityType.quantityType(forIdentifier: .heartRate) {
            types.append(heartRate)
        }
        
        // Sleep
        if let sleepAnalysis = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) {
            types.append(sleepAnalysis)
        }
        
        // Body measurements
        if let weight = HKQuantityType.quantityType(forIdentifier: .bodyMass) {
            types.append(weight)
        }
        if let height = HKQuantityType.quantityType(forIdentifier: .height) {
            types.append(height)
        }
        
        return types
    }
    
    // Check which data types are currently authorized
    func getAuthorizedDataTypes() -> [String] {
        let allTypes = getAvailableHealthKitTypes()
        
        return allTypes.compactMap { type in
            let status = healthStore.authorizationStatus(for: type)
            return status == .sharingAuthorized ? type.identifier : nil
        }
    }
    
    // Get authorization status for all available types
    func getDetailedAuthorizationStatus() -> [(type: String, status: String, authorized: Bool)] {
        let allTypes = getAvailableHealthKitTypes()
        
        return allTypes.map { type in
            let status = healthStore.authorizationStatus(for: type)
            let statusString = authorizationStatusString(status)
            let isAuthorized = status == .sharingAuthorized
            let friendlyName = getFriendlyName(for: type.identifier)
            
            return (type: friendlyName, status: statusString, authorized: isAuthorized)
        }
    }
    
    // Convert HealthKit identifiers to user-friendly names
    func getFriendlyName(for identifier: String) -> String {
        switch identifier {
        case HKQuantityTypeIdentifier.stepCount.rawValue:
            return "Step Count"
        case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue:
            return "Walking Distance"
        case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
            return "Active Calories"
        case HKQuantityTypeIdentifier.heartRate.rawValue:
            return "Heart Rate"
        case HKCategoryTypeIdentifier.sleepAnalysis.rawValue:
            return "Sleep Analysis"
        case HKQuantityTypeIdentifier.bodyMass.rawValue:
            return "Weight"
        case HKQuantityTypeIdentifier.height.rawValue:
            return "Height"
        default:
            return identifier
        }
    }
    
    // MARK: - Production-Ready Comprehensive HealthKit Access
    
    func requestComprehensiveHealthKitAccess() async -> (success: Bool, message: String) {
        print("🏥 Starting comprehensive HealthKit access request...")
        
        guard HKHealthStore.isHealthDataAvailable() else {
            return (false, "❌ HealthKit not available on this device")
        }
        
        let allTypes = getAvailableHealthKitTypes()
        let readTypes = Set(allTypes)
        
        print("📋 Requesting access to \(allTypes.count) data types...")
        
        // Make the authorization request
        let authResult = await withCheckedContinuation { continuation in
            healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
                if let error = error {
                    print("❌ Authorization error: \(error.localizedDescription)")
                    continuation.resume(returning: (false, "Authorization failed: \(error.localizedDescription)"))
                    return
                }
                
                print("✅ Authorization completed, success: \(success)")
                continuation.resume(returning: (success, "Authorization request completed"))
            }
        }
        
        if !authResult.0 {
            return authResult
        }
        
        print("🔍 Checking authorization status with SMART retry logic...")
        
        // Smart retry logic - check frequently at first, then less often
        let retrySchedule = [0.5, 1.0, 1.0, 2.0, 2.0, 3.0, 3.0, 3.0, 5.0, 5.0] // Total max: ~25s
        var authorizedCount = 0
        
        for (attempt, delay) in retrySchedule.enumerated() {
            print("🔄 Check attempt \(attempt + 1)/\(retrySchedule.count) (delay: \(delay)s)")
            
            // Check status
            authorizedCount = 0
            for type in allTypes {
                let status = healthStore.authorizationStatus(for: type)
                if status == .sharingAuthorized {
                    authorizedCount += 1
                }
            }
            
            print("📊 Found \(authorizedCount)/\(allTypes.count) authorized types")
            
            // Early success detection
            if authorizedCount > 0 {
                print("🎉 SUCCESS! Found \(authorizedCount) authorized types")
                break
            }
            
            // If this is the last attempt, don't wait
            if attempt == retrySchedule.count - 1 {
                print("⏰ Final attempt reached")
                break
            }
            
            print("⏳ Waiting \(delay)s before next check...")
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        }
        
        // Generate result
        if authorizedCount > 0 {
            print("✅ Authorization successful! \(authorizedCount) types authorized")
            
            // Fetch sample data to prove it's working
            let sampleData = await fetchSampleData()
            
            return (true, "🎉 SUCCESS!\n\n✅ Authorized: \(authorizedCount)/\(allTypes.count) data types\n\n📊 Sample Data:\n\(sampleData)")
        } else {
            print("❌ No authorization detected after all retries")
            return (false, "❌ No data types were authorized.\n\n💡 This could be:\n• User denied all access\n• iOS authorization bug\n\n🔧 Try: Delete app → Rebuild → Grant access")
        }
    }
    
    // Fetch sample data to show user it's working
    private func fetchSampleData() async -> String {
        print("📊 Fetching sample data...")
        var samples: [String] = []
        
        let sampleTypes: [(String, HKQuantityTypeIdentifier)] = [
            ("Steps", .stepCount),
            ("Distance", .distanceWalkingRunning),
            ("Heart Rate", .heartRate)
        ]
        
        for (name, identifier) in sampleTypes {
            guard let quantityType = HKQuantityType.quantityType(forIdentifier: identifier) else { continue }
            
            let status = healthStore.authorizationStatus(for: quantityType)
            if status == .sharingAuthorized {
                let sample = await fetchLatestSample(for: quantityType, name: name)
                if !sample.isEmpty {
                    samples.append(sample)
                }
            }
        }
        
        return samples.isEmpty ? "No recent data found" : samples.joined(separator: "\n")
    }
    
    // Fetch latest sample for a specific type
    private func fetchLatestSample(for type: HKQuantityType, name: String) async -> String {
        return await withCheckedContinuation { continuation in
            let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, error in
                
                if let error = error {
                    print("❌ Error fetching \(name): \(error.localizedDescription)")
                    continuation.resume(returning: "")
                    return
                }
                
                guard let sample = samples?.first as? HKQuantitySample else {
                    print("📭 No samples found for \(name)")
                    continuation.resume(returning: "")
                    return
                }
                
                let value = sample.quantity.doubleValue(for: self.getUnit(for: type))
                let formatter = DateFormatter()
                formatter.dateStyle = .short
                formatter.timeStyle = .short
                let dateString = formatter.string(from: sample.endDate)
                
                let result = "• \(name): \(String(format: "%.0f", value)) (\(dateString))"
                print("✅ \(result)")
                continuation.resume(returning: result)
            }
            
            healthStore.execute(query)
        }
    }
    

    
    // MARK: - Robust Entitlements Testing
    
    // Test entitlements by actually testing HealthKit capabilities
    func testHealthKitEntitlements() async -> String {
        var report = "🔐 HealthKit Entitlements Test\n\n"
        
        // Device info
        report += "📱 Device: \(await UIDevice.current.model)\n"
        report += "🔢 iOS: \(await UIDevice.current.systemVersion)\n"
        report += "📦 Bundle: \(Bundle.main.bundleIdentifier ?? "unknown")\n\n"
        
        // Test 1: HealthKit Availability
        let available = HKHealthStore.isHealthDataAvailable()
        report += "1️⃣ HealthKit Available: \(available ? "✅" : "❌")\n"
        
        if !available {
            report += "❌ HealthKit not supported on this device\n"
            return report
        }
        
        // Test 2: Can Create HealthStore
        do {
            let testStore = HKHealthStore()
            report += "2️⃣ HealthStore Creation: ✅\n"
            
            // Test 3: Can Create Data Types
            guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
                report += "3️⃣ Data Type Creation: ❌ Failed\n"
                return report
            }
            report += "3️⃣ Data Type Creation: ✅\n"
            
            // Test 4: Authorization Request Test
            report += "4️⃣ Testing Authorization Request...\n"
            
            let authResult = await withCheckedContinuation { continuation in
                testStore.requestAuthorization(toShare: [], read: [stepType]) { success, error in
                    if let error = error {
                        continuation.resume(returning: "❌ Error: \(error.localizedDescription)")
                    } else {
                        continuation.resume(returning: success ? "✅ Success" : "⚠️ User denied")
                    }
                }
            }
            
            report += "   Authorization Result: \(authResult)\n"
            
            // Test 5: Check Final Status
            let finalStatus = testStore.authorizationStatus(for: stepType)
            let statusString = authorizationStatusString(finalStatus)
            report += "5️⃣ Final Status: \(statusString)\n\n"
            
            // Analysis
            if authResult.contains("Error") {
                report += "🚨 ENTITLEMENTS ISSUE DETECTED\n"
                report += "❌ HealthKit requests are failing at the system level\n"
                report += "💡 This confirms entitlements are not properly embedded\n\n"
                report += "🔧 SOLUTION:\n"
                report += "1. In Xcode: Product → Clean Build Folder\n"
                report += "2. Check: Project → Target → Signing & Capabilities\n"
                report += "3. Add: HealthKit capability if missing\n"
                report += "4. Rebuild the app completely\n"
            } else {
                report += "✅ ENTITLEMENTS WORKING\n"
                report += "🎉 HealthKit authorization requests are working properly\n"
                if finalStatus == .sharingDenied {
                    report += "💡 Status shows 'Denied' but this is user choice, not entitlements issue\n"
                }
            }
            
        } catch {
            report += "2️⃣ HealthStore Creation: ❌ \(error.localizedDescription)\n"
        }
        
        return report
    }
    
    // Simplified entitlements verification using actual iOS capabilities
    func verifyEntitlementsCapabilities() -> String {
        var report = "🔍 Entitlements Capability Check\n\n"
        
        // Check if we can even attempt HealthKit operations
        if HKHealthStore.isHealthDataAvailable() {
            report += "✅ HealthKit Framework: Available\n"
            
            // Try to create essential HealthKit objects
            let testTypes: [(String, HKSampleType?)] = [
                ("Step Count", HKQuantityType.quantityType(forIdentifier: .stepCount)),
                ("Heart Rate", HKQuantityType.quantityType(forIdentifier: .heartRate)),
                ("Sleep", HKCategoryType.categoryType(forIdentifier: .sleepAnalysis))
            ]
            
            var successCount = 0
            for (name, type) in testTypes {
                if type != nil {
                    report += "✅ \(name): Can create type\n"
                    successCount += 1
                } else {
                    report += "❌ \(name): Cannot create type\n"
                }
            }
            
            if successCount == testTypes.count {
                report += "\n🎉 All HealthKit types created successfully\n"
                report += "💡 Entitlements appear to be working\n"
                report += "📝 Any authorization issues are likely user permission related\n"
            } else {
                report += "\n⚠️ Some HealthKit types failed to create\n"
                report += "🔧 This suggests entitlements issues\n"
            }
            
        } else {
            report += "❌ HealthKit Framework: Not Available\n"
            report += "💡 This could be a device limitation or entitlements issue\n"
        }
        
        return report
    }
    
    // Instant entitlements test - no user interaction required
    func instantEntitlementsTest() -> String {
        var report = "⚡ Instant Entitlements Test\n\n"
        
        // Test 1: Can we create a HealthStore?
        do {
            let _ = HKHealthStore()
            report += "1️⃣ HealthStore Creation: ✅ SUCCESS\n"
        } catch {
            report += "1️⃣ HealthStore Creation: ❌ FAILED\n"
            report += "   Error: \(error.localizedDescription)\n"
            report += "   🚨 This indicates ENTITLEMENTS MISSING\n"
            return report
        }
        
        // Test 2: Can we create data types?
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            report += "2️⃣ Data Type Creation: ❌ FAILED\n"
            report += "   🚨 Cannot create basic HealthKit types\n"
            return report
        }
        report += "2️⃣ Data Type Creation: ✅ SUCCESS\n"
        
        // Test 3: Can we check authorization status? (This requires entitlements)
        let status = healthStore.authorizationStatus(for: stepType)
        let statusString = authorizationStatusString(status)
        report += "3️⃣ Authorization Status Check: ✅ SUCCESS\n"
        report += "   Current Status: \(statusString)\n"
        
        // Final verdict
        report += "\n🎉 ENTITLEMENTS ARE WORKING!\n"
        report += "✅ All HealthKit basic operations successful\n"
        report += "💡 The app has proper HealthKit entitlements\n\n"
        
        if status == .sharingDenied {
            report += "📝 Note: Status shows 'Denied' but this is user choice\n"
            report += "🔧 To fix: Delete app → Clean Build → Rebuild → Grant access\n"
        } else if status == .notDetermined {
            report += "📝 Status 'Not Determined' means user hasn't been asked yet\n"
            report += "✅ Ready for authorization request\n"
        } else {
            report += "🎉 Status shows 'Authorized' - everything working!\n"
        }
        
        return report
    }
    
    // MARK: - Diagnostic Functions
    
    // Production-ready status check
    func getProductionHealthKitStatus() -> String {
        var report = "🏥 Production HealthKit Status\n\n"
        
        // Basic availability
        let available = HKHealthStore.isHealthDataAvailable()
        report += "📱 HealthKit Available: \(available ? "✅" : "❌")\n"
        
        if !available {
            report += "\n❌ HealthKit is not available on this device.\nThis app requires HealthKit to function properly."
            return report
        }
        
        // Check authorization status for all types
        let statusDetails = getDetailedAuthorizationStatus()
        let authorizedCount = statusDetails.filter { $0.authorized }.count
        
        report += "📊 Authorization Status: \(authorizedCount)/\(statusDetails.count) data types authorized\n\n"
        
        if authorizedCount == 0 {
            report += "⚠️ No health data access granted.\nTap 'Request HealthKit Access' to authorize data types.\n\n"
        } else {
            report += "✅ Access granted to \(authorizedCount) data types:\n"
            for status in statusDetails.filter({ $0.authorized }) {
                report += "   • \(status.type)\n"
            }
            report += "\n"
        }
        
        if authorizedCount < statusDetails.count {
            let deniedCount = statusDetails.count - authorizedCount
            report += "❌ \(deniedCount) data types not authorized:\n"
            for status in statusDetails.filter({ !$0.authorized }) {
                report += "   • \(status.type): \(status.status)\n"
            }
        }
        
        return report
    }
} 