import HealthKit
import Foundation
import UIKit

class HealthDataManager: ObservableObject {
    private let healthStore = HKHealthStore()
    
    @Published var authorizedDataTypes: Set<HKSampleType> = []
    @Published var deniedDataTypes: Set<HKSampleType> = []
    @Published var isLoading = false
    @Published var syncStatus = "Ready"
    @Published var lastStepsCount: Int = 0
    @Published var lastSyncDate: Date? {
        didSet {
            // Persist last sync date to UserDefaults
            if let date = lastSyncDate {
                print("💾 SAVING lastSyncDate to UserDefaults: \(date)")
                UserDefaults.standard.set(date, forKey: "lastHealthKitSyncDate")
                UserDefaults.standard.synchronize() // Force immediate save
                print("💾 UserDefaults saved and synchronized")
            } else {
                print("💾 REMOVING lastSyncDate from UserDefaults")
                UserDefaults.standard.removeObject(forKey: "lastHealthKitSyncDate")
            }
        }
    }
    
    // MARK: - Sync Progress Properties
    @Published var isSyncing = false
    @Published var syncProgress: Double = 0.0
    @Published var currentSyncDay = ""
    @Published var totalDaysToSync = 0
    @Published var processedDays = 0
    @Published var successfulDays = 0
    @Published var failedDays = 0
    @Published var currentDaySteps = 0
    @Published var totalStepsSynced = 0
    @Published var syncProgressDetails: [SyncDayResult] = []
    
    // MARK: - Sync Day Result Model
    struct SyncDayResult: Identifiable {
        let id = UUID()
        let date: String
        let steps: Int
        let success: Bool
        let message: String
    }
    
    init() {
        // Restore last sync date from UserDefaults
        print("🔄 INIT: Checking UserDefaults for saved lastSyncDate...")
        if let savedDate = UserDefaults.standard.object(forKey: "lastHealthKitSyncDate") as? Date {
            print("✅ INIT: Found saved lastSyncDate: \(savedDate)")
            lastSyncDate = savedDate
        } else {
            print("⚪ INIT: No saved lastSyncDate found in UserDefaults")
        }
        
        updateAuthorizationStatus()
    }
    
    // MARK: - Core HealthKit Types (Steps Only)
    private func getCoreHealthKitTypes() -> [HKSampleType] {
        print("🏗️ Building core HealthKit types (steps only)...")
        var types: [HKSampleType] = []
        
        if let stepCount = HKQuantityType.quantityType(forIdentifier: .stepCount) {
            types.append(stepCount)
            print("✅ Added: stepCount")
        }
        
        return types
    }
    
    // MARK: - Authorization
    func requestComprehensiveHealthKitAccess() async -> (Bool, String) {
        print("🏥 Starting HealthKit access request (FORCING PERMISSION DIALOG)...")
        
        let typesToRequest = getCoreHealthKitTypes()
        
        if typesToRequest.isEmpty {
            return (false, "No valid HealthKit types could be created")
        }
        
        print("📋 Requesting READ ACCESS for \(typesToRequest.count) data type(s)...")
        for (index, type) in typesToRequest.enumerated() {
            print("   \(index + 1). \(type.identifier)")
        }
        
        return await requestAuthorizationForcefully(for: typesToRequest)
    }
    
    private func requestAuthorizationForcefully(for types: [HKSampleType]) async -> (Bool, String) {
        print("🔥 FORCING authorization dialog to appear...")
        
        return await withCheckedContinuation { continuation in
            // Request read permissions - this SHOULD show the dialog
            healthStore.requestAuthorization(toShare: [], read: Set(types)) { success, error in
                
                if let error = error {
                    print("❌ Authorization request failed: \(error.localizedDescription)")
                    continuation.resume(returning: (false, "Authorization failed: \(error.localizedDescription)"))
                    return
                }
                
                print("✅ Authorization request completed, success: \(success)")
                
                // Test read access immediately after authorization
                Task {
                    let testResult = await self.testReadAccessAfterAuthorization()
                    print("🧪 Read access test result: \(testResult)")
                    
                    DispatchQueue.main.async {
                        self.updateAuthorizationStatus()
                        
                        if testResult.contains("✅") {
                            continuation.resume(returning: (true, "✅ Read access granted and verified!"))
                        } else if success {
                            continuation.resume(returning: (true, "⚠️ Authorization completed but read access needs manual setup in Settings > Privacy & Security > Health > Modular Health > Data Access > Steps = ON"))
                        } else {
                            continuation.resume(returning: (false, "❌ Authorization failed - please manually enable in Settings"))
                        }
                    }
                }
            }
        }
    }
    
    private func testReadAccessAfterAuthorization() async -> String {
        print("🧪 Testing read access immediately after authorization...")
        
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return "❌ Could not create step type for testing"
        }
        
        // Try a very simple query to test read access
        return await withCheckedContinuation { continuation in
            let now = Date()
            let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: now) ?? now
            let predicate = HKQuery.predicateForSamples(withStart: yesterday, end: now, options: [])
            
            let query = HKSampleQuery(
                sampleType: stepType,
                predicate: predicate,
                limit: 1,
                sortDescriptors: nil
            ) { _, samples, error in
                
                if let error = error {
                    print("🧪 Read test failed: \(error.localizedDescription)")
                    continuation.resume(returning: "❌ Read access blocked: \(error.localizedDescription)")
                    return
                }
                
                // If we get here without error, read access is working
                if let samples = samples {
                    print("🧪 Read test successful: found \(samples.count) samples")
                    continuation.resume(returning: "✅ Read access is working! Found \(samples.count) samples in last 24h")
                } else {
                    print("🧪 Read test successful but no data")
                    continuation.resume(returning: "✅ Read access is working! (No data found but no permission error)")
                }
            }
            
            self.healthStore.execute(query)
        }
    }
    
    // MARK: - Authorization Status
    func updateAuthorizationStatus() {
        print("🔍 Updating authorization status...")
        
        let allTypes = getCoreHealthKitTypes()
        var authorized: Set<HKSampleType> = []
        var denied: Set<HKSampleType> = []
        
        print("📋 Checking authorization for \(allTypes.count) core types:")
        for type in allTypes {
            let status = healthStore.authorizationStatus(for: type)
            let identifier = type.identifier
            let statusString = authStatusString(status)
            
            print("- \(identifier): \(statusString)")
            
            // IMPORTANT: authorizationStatus(for:) only indicates SHARING/WRITING permission
            // For READ-ONLY apps, sharingDenied is NORMAL and doesn't block reading
            // Apple hides read permission status for privacy reasons
            if status == .sharingDenied {
                authorized.insert(type)
                print("✅ sharingDenied is NORMAL for read-only apps (can still read data)")
                print("💡 This status only affects WRITING, not READING")
            } else if status == .sharingAuthorized {
                authorized.insert(type)
                print("✅ Full read/write access authorized")
            } else if status == .notDetermined {
                authorized.insert(type)
                print("⚠️ Authorization not determined, will attempt read")
            } else {
                denied.insert(type)
                print("❌ Unknown authorization status: \(statusString)")
            }
        }
        
        DispatchQueue.main.async {
            self.authorizedDataTypes = authorized
            self.deniedDataTypes = denied
        }
        
        print("📊 Final status: \(authorized.count) authorized, \(denied.count) denied")
    }
    
    // MARK: - Steps Data Fetching
    func fetchStepCount(from startDate: Date, to endDate: Date) async -> (Int, String) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return (0, "Could not create step count type")
        }
        
        // Check authorization first
        let authStatus = healthStore.authorizationStatus(for: stepType)
        print("🔐 Steps authorization status: \(authStatusString(authStatus))")
        
        // Enhanced date logging
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEEE, d MMMM yyyy 'at' HH:mm:ss"
        let timeSpan = endDate.timeIntervalSince(startDate) / (24 * 60 * 60) // days
        
        print("🗓️ Fetching steps data:")
        print("   📅 Start Date: \(dateFormatter.string(from: startDate))")
        print("   📅 End Date: \(dateFormatter.string(from: endDate))")
        print("   ⏰ Date Range Span: \(timeSpan) days")
        
        // Date validation and adjustment
        let now = Date()
        let adjustedEndDate = min(endDate, now) // Don't query future dates
        let adjustedStartDate = min(startDate, adjustedEndDate)
        
        if endDate > now {
            print("⚠️ WARNING: End date is in the future, adjusting to current time")
            print("   📅 Adjusted End Date: \(dateFormatter.string(from: adjustedEndDate))")
        }
        
        return await withCheckedContinuation { continuation in
            // Try multiple query approaches with adjusted dates
            self.fetchStepsWithMultipleApproaches(stepType: stepType, startDate: adjustedStartDate, endDate: adjustedEndDate, continuation: continuation)
        }
    }
    
    private func fetchStepsWithMultipleApproaches(stepType: HKQuantityType, startDate: Date, endDate: Date, continuation: CheckedContinuation<(Int, String), Never>) {
        print("🔍 Approach 1: HKSampleQuery (most reliable)...")
        
        // Start with HKSampleQuery since it's more reliable than HKStatisticsQuery
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        
        let query = HKSampleQuery(
            sampleType: stepType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
        ) { _, samples, error in
            
            if let error = error {
                print("❌ Sample query error: \(error.localizedDescription)")
                // Try approach 2
                self.fetchStepsWithStatisticsQuery(stepType: stepType, startDate: startDate, endDate: endDate, continuation: continuation)
                return
            }
            
            if let samples = samples, !samples.isEmpty {
                let stepSamples = samples.compactMap { $0 as? HKQuantitySample }
                let totalSteps = stepSamples.reduce(0) { sum, sample in
                    sum + Int(sample.quantity.doubleValue(for: HKUnit.count()))
                }
                print("✅ Found \(totalSteps) steps from \(stepSamples.count) samples with HKSampleQuery")
                continuation.resume(returning: (totalSteps, "Found \(totalSteps) steps from \(stepSamples.count) samples"))
            } else {
                print("❌ No samples found, trying statistics query...")
                // Try approach 2
                self.fetchStepsWithStatisticsQuery(stepType: stepType, startDate: startDate, endDate: endDate, continuation: continuation)
            }
        }
        
        healthStore.execute(query)
    }
    
    private func fetchStepsWithStatisticsQuery(stepType: HKQuantityType, startDate: Date, endDate: Date, continuation: CheckedContinuation<(Int, String), Never>) {
        print("🔍 Approach 2: HKStatisticsQuery...")
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        
        let query = HKStatisticsQuery(
            quantityType: stepType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, result, error in
            
            if let error = error {
                print("❌ Statistics query error: \(error.localizedDescription)")
                // Try approach 3
                self.fetchStepsWithBroaderQuery(stepType: stepType, continuation: continuation)
                return
            }
            
            if let result = result, let sum = result.sumQuantity() {
                let steps = Int(sum.doubleValue(for: .count()))
                print("✅ Found \(steps) steps with statistics query")
                continuation.resume(returning: (steps, "Found \(steps) steps"))
            } else {
                print("❌ No data with statistics query, trying broader query...")
                // Try approach 3
                self.fetchStepsWithBroaderQuery(stepType: stepType, continuation: continuation)
            }
        }
        
        healthStore.execute(query)
    }
    

    
    private func fetchStepsWithBroaderQuery(stepType: HKQuantityType, continuation: CheckedContinuation<(Int, String), Never>) {
        print("🔍 Approach 3: Broader date range (last 30 days)...")
        
        let now = Date()
        let thirtyDaysAgo = Calendar.current.date(byAdding: .day, value: -30, to: now) ?? now
        let predicate = HKQuery.predicateForSamples(withStart: thirtyDaysAgo, end: now, options: [])
        
        let broadQuery = HKSampleQuery(
            sampleType: stepType,
            predicate: predicate,
            limit: 100, // Limit to recent samples
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        ) { _, samples, error in
            
            if let error = error {
                print("❌ Broad query error: \(error.localizedDescription)")
                // Try final fallback - no date restrictions at all
                self.fetchStepsWithoutDateRestrictions(stepType: stepType, continuation: continuation)
                return
            }
            
            if let samples = samples, !samples.isEmpty {
                let stepSamples = samples.compactMap { $0 as? HKQuantitySample }
                let totalSteps = stepSamples.reduce(0) { sum, sample in
                    sum + Int(sample.quantity.doubleValue(for: HKUnit.count()))
                }
                print("✅ Found \(totalSteps) steps from \(stepSamples.count) recent samples (last 30 days)")
                print("📊 Sample dates range:")
                if let first = stepSamples.first, let last = stepSamples.last {
                    let df = DateFormatter()
                    df.dateStyle = .short
                    df.timeStyle = .short
                    print("   From: \(df.string(from: last.startDate)) to \(df.string(from: first.startDate))")
                }
                continuation.resume(returning: (totalSteps, "Found \(totalSteps) steps from recent data (30 days)"))
            } else {
                print("❌ No step data found in 30 days, trying unlimited date range...")
                // Try final fallback - no date restrictions at all
                self.fetchStepsWithoutDateRestrictions(stepType: stepType, continuation: continuation)
            }
        }
        
        healthStore.execute(broadQuery)
    }
    
    private func fetchStepsWithoutDateRestrictions(stepType: HKQuantityType, continuation: CheckedContinuation<(Int, String), Never>) {
        print("🔍 Final Approach: No date restrictions (find ANY step data)...")
        
        let query = HKSampleQuery(
            sampleType: stepType,
            predicate: nil, // No date restrictions
            limit: 1000,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        ) { _, samples, error in
            
            if let error = error {
                print("❌ Final query error: \(error.localizedDescription)")
                continuation.resume(returning: (0, "All query approaches failed: \(error.localizedDescription)"))
                return
            }
            
            if let samples = samples, !samples.isEmpty {
                let stepSamples = samples.compactMap { $0 as? HKQuantitySample }
                let totalSteps = stepSamples.reduce(0) { sum, sample in
                    sum + Int(sample.quantity.doubleValue(for: HKUnit.count()))
                }
                print("✅ Found \(totalSteps) steps from \(stepSamples.count) samples (no date restrictions)")
                print("📊 Data spans from:")
                if let first = stepSamples.last, let last = stepSamples.first {
                    let df = DateFormatter()
                    df.dateStyle = .medium
                    df.timeStyle = .none
                    print("   Oldest: \(df.string(from: first.startDate))")
                    print("   Newest: \(df.string(from: last.startDate))")
                }
                continuation.resume(returning: (totalSteps, "Found \(totalSteps) steps from ALL available data"))
            } else {
                print("❌ FINAL RESULT: No step data found in HealthKit at all")
                continuation.resume(returning: (0, "No step data found in HealthKit"))
            }
        }
        
        healthStore.execute(query)
    }
    
    // Convenience method for current data
    func fetchStepCount() async -> (Int, String) {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .day, value: -1, to: endDate) ?? endDate
        return await fetchStepCount(from: startDate, to: endDate)
    }
    
    // MARK: - Web App Sync
    func syncStepsToWebApp(from startDate: Date, to endDate: Date, baseURL: String, userID: String) async -> (Bool, String) {
        print("🔄 Starting DAILY steps sync to web app...")
        
        // Break date range into individual days
        let calendar = Calendar.current
        var currentDate = calendar.startOfDay(for: startDate)
        let finalDate = calendar.startOfDay(for: endDate)
        
        // Calculate total days for progress tracking
        let totalDays = calendar.dateComponents([.day], from: currentDate, to: finalDate).day! + 1
        
        // Initialize progress tracking
        DispatchQueue.main.async {
            self.isSyncing = true
            self.syncProgress = 0.0
            self.totalDaysToSync = totalDays
            self.processedDays = 0
            self.successfulDays = 0
            self.failedDays = 0
            self.totalStepsSynced = 0
            self.syncProgressDetails = []
            self.syncStatus = "Starting daily sync..."
        }
        
        var dailyResults: [(date: Date, steps: Int)] = []
        var totalSteps = 0
        var successfulDays = 0
        var failedDays = 0
        
        print("📅 Syncing daily steps from \(currentDate) to \(finalDate)")
        
        // Process each day individually to create one database entry per day
        while currentDate <= finalDate {
            let nextDay = calendar.date(byAdding: .day, value: 1, to: currentDate) ?? currentDate
            
            let dateFormatter = DateFormatter()
            dateFormatter.dateStyle = .medium
            let dayString = dateFormatter.string(from: currentDate)
            
            // Update progress UI
            DispatchQueue.main.async {
                self.currentSyncDay = dayString
            }
            
            print("🎯 Processing day \(dayString)...")
            
            let (daySteps, message) = await fetchDailyStepCount(for: currentDate)
            print("   📊 HealthKit result: \(message)")
            
            // Update progress with current day's steps
            DispatchQueue.main.async {
                self.currentDaySteps = daySteps
                self.processedDays += 1
                self.syncProgress = Double(self.processedDays) / Double(self.totalDaysToSync)
            }
            
            if daySteps > 0 {
                dailyResults.append((date: currentDate, steps: daySteps))
                totalSteps += daySteps
                print("   ✅ Will store: \(daySteps) steps for \(dayString)")
                
                // Add to progress details
                DispatchQueue.main.async {
                    self.syncProgressDetails.append(SyncDayResult(
                        date: dayString,
                        steps: daySteps,
                        success: true,
                        message: "Ready to store"
                    ))
                }
            } else {
                print("   ⚪ Skipping: 0 steps for \(dayString)")
                
                // Add to progress details
                DispatchQueue.main.async {
                    self.syncProgressDetails.append(SyncDayResult(
                        date: dayString,
                        steps: 0,
                        success: false,
                        message: "No steps recorded"
                    ))
                }
            }
            
            currentDate = nextDay
        }
        
        // Update with totals
        DispatchQueue.main.async {
            self.lastStepsCount = totalSteps
            self.totalStepsSynced = totalSteps
        }
        
        if dailyResults.isEmpty {
            let message = "No daily steps data found to sync"
            DispatchQueue.main.async {
                self.syncStatus = message
                self.isSyncing = false
            }
            return (false, message)
        }
        
        print("📈 Ready to store \(dailyResults.count) daily data points, total: \(totalSteps) steps")
        print("💾 Creating one database row per day...")
        
        // Update status for database storage phase
        DispatchQueue.main.async {
            self.syncStatus = "Storing \(dailyResults.count) days to database..."
        }
        
        // Store each day as a separate database entry
        for (index, dailyData) in dailyResults.enumerated() {
            let df = DateFormatter()
            df.dateStyle = .medium
            let dayString = df.string(from: dailyData.date)
            
            // Update progress UI for storage
            DispatchQueue.main.async {
                self.currentSyncDay = "Storing \(dayString)"
                self.syncStatus = "Storing day \(index + 1) of \(dailyResults.count)..."
            }
            
            print("💾 [\(index + 1)/\(dailyResults.count)] Storing \(dayString): \(dailyData.steps) steps")
            
            let success = await sendDailyStepsToWebApp(
                date: dailyData.date,
                steps: dailyData.steps,
                baseURL: baseURL,
                userID: userID
            )
            
            if success {
                successfulDays += 1
                print("   ✅ Database row created successfully")
                
                // Update progress details with success
                DispatchQueue.main.async {
                    self.successfulDays += 1
                    if let index = self.syncProgressDetails.firstIndex(where: { $0.date == dayString }) {
                        self.syncProgressDetails[index] = SyncDayResult(
                            date: dayString,
                            steps: dailyData.steps,
                            success: true,
                            message: "✅ Stored successfully"
                        )
                    }
                }
            } else {
                failedDays += 1
                print("   ❌ Database storage failed")
                
                // Update progress details with failure
                DispatchQueue.main.async {
                    self.failedDays += 1
                    if let index = self.syncProgressDetails.firstIndex(where: { $0.date == dayString }) {
                        self.syncProgressDetails[index] = SyncDayResult(
                            date: dayString,
                            steps: dailyData.steps,
                            success: false,
                            message: "❌ Storage failed"
                        )
                    }
                }
            }
        }
        
        let finalMessage = "✅ Daily sync complete: \(successfulDays) days synced, \(failedDays) failed, \(totalSteps) total steps"
        
        DispatchQueue.main.async {
            self.syncStatus = finalMessage
            let now = Date()
            print("🎯 SYNC COMPLETE: Setting lastSyncDate to \(now)")
            self.lastSyncDate = now
            self.isSyncing = false
            self.syncProgress = 1.0
            self.currentSyncDay = "Sync completed"
            print("🎯 SYNC COMPLETE: All properties updated")
        }
        
        return (failedDays == 0, finalMessage)
    }
    
    // MARK: - Daily Step Fetching
    private func fetchDailyStepCount(for date: Date) async -> (Int, String) {
        // Use the ultra-restrictive approach to avoid aggregated samples
        return await fetchDailyStepCountUltraRestrictive(for: date)
    }
    
    // Method 1: Precise daily step count using HKStatisticsCollectionQuery
    private func fetchDailyStepCountUltraRestrictive(for date: Date) async -> (Int, String) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return (0, "Could not create step count type")
        }
        
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? startOfDay
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM d, yyyy"
        print("🎯 PRECISE daily query for \(dateFormatter.string(from: startOfDay))")
        
        return await withCheckedContinuation { continuation in
            // Use HKStatisticsCollectionQuery for guaranteed daily segmentation
            let anchorDate = startOfDay
            let interval = DateComponents(day: 1)
            
            let query = HKStatisticsCollectionQuery(
                quantityType: stepType,
                quantitySamplePredicate: nil,
                options: .cumulativeSum,
                anchorDate: anchorDate,
                intervalComponents: interval
            )
            
            query.initialResultsHandler = { _, results, error in
                if let error = error {
                    print("❌ Daily collection query error: \(error.localizedDescription)")
                    continuation.resume(returning: (0, "Collection query error: \(error.localizedDescription)"))
                    return
                }
                
                guard let results = results else {
                    print("❌ No collection results")
                    continuation.resume(returning: (0, "No collection results"))
                    return
                }
                
                var totalSteps = 0
                var hasData = false
                
                // Get statistics for this specific day only
                results.enumerateStatistics(from: startOfDay, to: endOfDay) { statistics, _ in
                    if let sum = statistics.sumQuantity() {
                        let dailySteps = Int(sum.doubleValue(for: .count()))
                        
                        // Log the exact time window being processed
                        let timeFormatter = DateFormatter()
                        timeFormatter.dateFormat = "MMM d, yyyy HH:mm"
                        print("📊 Processing window: \(timeFormatter.string(from: statistics.startDate)) to \(timeFormatter.string(from: statistics.endDate))")
                        
                        totalSteps += dailySteps
                        hasData = true
                    }
                }
                
                // Resume continuation only once after processing all statistics
                if hasData {
                    // Basic validation - only reject obviously invalid data
                    if totalSteps < 0 {
                        print("⚠️ WARNING: Negative step count (\(totalSteps)) - invalid data")
                        continuation.resume(returning: (0, "Invalid negative step count"))
                    } else {
                        print("✅ Daily total for \(dateFormatter.string(from: startOfDay)): \(totalSteps) steps")
                        if totalSteps > 50000 {
                            print("   📈 High step count detected - user may be very active or using fitness equipment")
                        }
                        continuation.resume(returning: (totalSteps, "Daily total: \(totalSteps) steps"))
                    }
                } else {
                    // If no statistics found for this day
                    print("⚪ No step statistics for \(dateFormatter.string(from: startOfDay))")
                    continuation.resume(returning: (0, "No steps recorded for this day"))
                }
            }
            
            self.healthStore.execute(query)
        }
    }
    
    // Method 2: Use HKStatisticsCollectionQuery (backup approach)
    private func fetchDailyStepCountWithStatistics(for date: Date) async -> (Int, String) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return (0, "Could not create step count type")
        }
        
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? startOfDay
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM d, yyyy"
        print("📊 Using HKStatisticsCollectionQuery for \(dateFormatter.string(from: startOfDay))")
        
        return await withCheckedContinuation { continuation in
            let anchorDate = startOfDay
            let interval = DateComponents(day: 1)
            
            let query = HKStatisticsCollectionQuery(
                quantityType: stepType,
                quantitySamplePredicate: nil,
                options: .cumulativeSum,
                anchorDate: anchorDate,
                intervalComponents: interval
            )
            
            query.initialResultsHandler = { _, results, error in
                if let error = error {
                    print("❌ Statistics collection query error: \(error.localizedDescription)")
                    continuation.resume(returning: (0, "Statistics query error: \(error.localizedDescription)"))
                    return
                }
                
                guard let results = results else {
                    print("❌ No statistics collection results")
                    continuation.resume(returning: (0, "No statistics results"))
                    return
                }
                
                // Get statistics for our specific day
                if let statistics = results.statistics(from: startOfDay, to: endOfDay).first,
                   let sum = statistics.sumQuantity() {
                    let steps = Int(sum.doubleValue(for: .count()))
                    print("📈 Statistics query found \(steps) steps for \(dateFormatter.string(from: startOfDay))")
                    continuation.resume(returning: (steps, "Found \(steps) steps via statistics"))
                } else {
                    print("📈 Statistics query found 0 steps for \(dateFormatter.string(from: startOfDay))")
                    continuation.resume(returning: (0, "No statistics found for this day"))
                }
            }
            
            self.healthStore.execute(query)
        }
    }
    
    // Method 2: Manual sample filtering (backup approach)
    private func fetchDailyStepCountWithSamples(for date: Date) async -> (Int, String) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return (0, "Could not create step count type")
        }
        
        // Create precise day boundaries (midnight to midnight)
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? startOfDay
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM d, yyyy HH:mm"
        print("🔍 Fetching daily steps for \(dateFormatter.string(from: startOfDay)) to \(dateFormatter.string(from: endOfDay))")
        
        return await withCheckedContinuation { continuation in
            // Use strictStartDate to only get samples that start exactly within this day
            let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)
            
            // Use HKSampleQuery to get all step samples for this day and sum them manually
            let query = HKSampleQuery(
                sampleType: stepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                
                if let error = error {
                    print("❌ Daily steps sample query error for \(startOfDay): \(error.localizedDescription)")
                    continuation.resume(returning: (0, "Query error: \(error.localizedDescription)"))
                    return
                }
                
                guard let samples = samples, !samples.isEmpty else {
                    print("⚪ No step samples found for \(startOfDay)")
                    continuation.resume(returning: (0, "No step samples found for this day"))
                    return
                }
                
                // Filter and sum only the step samples that actually belong to this day
                let stepSamples = samples.compactMap { $0 as? HKQuantitySample }
                var dailySteps = 0
                var samplesInDay = 0
                var totalSamples = stepSamples.count
                
                print("🔍 Analyzing \(totalSamples) step samples for \(dateFormatter.string(from: startOfDay))")
                
                for (index, sample) in stepSamples.enumerated() {
                    let sampleStart = sample.startDate
                    let sampleEnd = sample.endDate
                    let steps = Int(sample.quantity.doubleValue(for: .count()))
                    
                    let detailFormatter = DateFormatter()
                    detailFormatter.dateFormat = "MMM d, yyyy HH:mm:ss"
                    
                    // Only include samples that start AND end within our day
                    let startsInDay = sampleStart >= startOfDay && sampleStart < endOfDay
                    let endsInDay = sampleEnd >= startOfDay && sampleEnd <= endOfDay
                    let isInDay = startsInDay && endsInDay
                    
                    if index < 5 || isInDay { // Show first 5 samples for debugging + all valid ones
                        print("  Sample \(index + 1): \(steps) steps from \(detailFormatter.string(from: sampleStart)) to \(detailFormatter.string(from: sampleEnd)) -> \(isInDay ? "✅ INCLUDED" : "❌ EXCLUDED")")
                    }
                    
                    if isInDay {
                        dailySteps += steps
                        samplesInDay += 1
                    }
                }
                
                if totalSamples > 5 && samplesInDay < totalSamples {
                    print("  ... (showing first 5 + included samples, \(totalSamples - samplesInDay) excluded)")
                }
                
                // Sanity check for unrealistic daily totals (more than 100,000 steps = ~50 miles)
                if dailySteps > 100000 {
                    print("⚠️ WARNING: Unrealistic daily step count (\(dailySteps)) - possible aggregation issue!")
                    print("   This suggests HealthKit samples are spanning multiple days or aggregated")
                    print("   Daily totals above 100,000 steps (~50 miles) are not realistic for a single day")
                }
                
                print("✅ Daily total for \(dateFormatter.string(from: startOfDay)): \(dailySteps) steps from \(samplesInDay)/\(totalSamples) samples")
                continuation.resume(returning: (dailySteps, "Found \(dailySteps) steps from \(samplesInDay) samples"))
            }
            
            self.healthStore.execute(query)
        }
    }
    
    // MARK: - Individual Day Sync - Store One Data Point Per Day
    private func sendDailyStepsToWebApp(date: Date, steps: Int, baseURL: String, userID: String) async -> Bool {
        let calendar = Calendar.current
        let targetDate = calendar.startOfDay(for: date)
        
        // Use simple date format for daily data points (YYYY-MM-DD)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
        let dateString = dateFormatter.string(from: targetDate)
        
        // Create clean daily data point
        let requestBody: [String: Any] = [
            "user_id": userID,
            "data_type": "steps",
            "value": steps,
            "date": dateString,  // Single date field for daily data
            "unit": "count",
            "source": "apple_health",
            "is_daily_total": true
        ]
        
        // Debug logging for daily data point
        print("📤 STORING daily data point:")
        print("   📅 Date: \(dateString)")
        print("   📊 Steps: \(steps)")
        print("   🏷️ Source: apple_health")
        print("   💾 Database: One row per day")
        
        guard let url = URL(string: "\(baseURL)/api/applehealth/data") else {
            return false
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
            let (_, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse {
                return httpResponse.statusCode == 200
            }
            return false
            
        } catch {
            print("❌ Network error sending daily steps: \(error.localizedDescription)")
            return false
        }
    }
    
    // MARK: - Debug Methods
    func checkAllHealthKitSources() async -> String {
        print("🔍 Checking ALL HealthKit sources and data types...")
        
        var results: [String] = []
        results.append("🔐 Authorization Status:")
        
        // Check steps authorization
        if let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) {
            let status = healthStore.authorizationStatus(for: stepType)
            results.append("  • HKQuantityTypeIdentifierStepCount: \(authStatusString(status))")
        }
        
        results.append("\n📊 Checking for steps data...")
        
        // Try to find step samples
        let sampleResults = await checkForStepSamples()
        results.append(sampleResults)
        
        // Check device info
        results.append("\n📱 Device Info:")
        results.append("  • App Bundle: \(Bundle.main.bundleIdentifier ?? "unknown")")
        results.append("  • iOS Version: \(UIDevice.current.systemVersion)")
        
        return results.joined(separator: "\n")
    }
    
    private func checkForStepSamples() async -> String {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return "❌ Could not create step type"
        }
        
        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: stepType,
                predicate: nil,
                limit: 10,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                
                if let error = error {
                    continuation.resume(returning: "❌ Error: \(error.localizedDescription)")
                    return
                }
                
                if let samples = samples, !samples.isEmpty {
                    let stepSamples = samples.compactMap { $0 as? HKQuantitySample }
                    if let firstSample = stepSamples.first {
                        let value = firstSample.quantity.doubleValue(for: HKUnit.count())
                        let source = firstSample.sourceRevision.source.name
                        let dateFormatter = DateFormatter()
                        dateFormatter.dateStyle = .short
                        let dateStr = dateFormatter.string(from: firstSample.startDate)
                        continuation.resume(returning: "✅ Found \(Int(value)) steps from '\(source)' on \(dateStr)")
                    } else {
                        continuation.resume(returning: "✅ Found \(samples.count) samples but couldn't read step data")
                    }
                } else {
                    continuation.resume(returning: "❌ No step data found")
                }
            }
            
            self.healthStore.execute(query)
        }
    }
    
    func checkAvailableStepData() async -> String {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return "❌ Could not create step count type"
        }
        
        print("🔍 Checking what step data is available...")
        
        let status = healthStore.authorizationStatus(for: stepType)
        let authString = authStatusString(status)
        print("🔐 Authorization status: \(authString)")
        
        var results: [String] = []
        results.append("🔐 Authorization: \(authString)")
        
        // Add current date/time info for debugging
        let now = Date()
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .full
        dateFormatter.timeStyle = .full
        dateFormatter.locale = Locale(identifier: "en_US")
        let currentDateTime = dateFormatter.string(from: now)
        results.append("📅 Current Date: \(currentDateTime)")
        
        // Check multiple date ranges
        let dateRanges = [
            ("Last 1 day", 1),
            ("Last 3 days", 3),
            ("Last 7 days", 7),
            ("Last 30 days", 30),
            ("Last 365 days", 365)
        ]
        
        for (rangeName, days) in dateRanges {
            let endDate = Date()
            let startDate = Calendar.current.date(byAdding: .day, value: -days, to: endDate) ?? endDate
            let result = await checkStepDataInRange(stepType: stepType, from: startDate, to: endDate, rangeName: rangeName)
            results.append(result)
        }
        
        // ALWAYS try with no date restrictions to find ANY data
        print("🔍 Checking ALL available step data (no date limit)...")
        let result = await checkStepDataInRange(stepType: stepType, from: nil, to: nil, rangeName: "All time")
        results.append(result)
        
        // Try a very broad future range in case of date issues
        let futureEnd = Calendar.current.date(byAdding: .year, value: 2, to: now) ?? now
        let pastStart = Calendar.current.date(byAdding: .year, value: -2, to: now) ?? now
        let broadResult = await checkStepDataInRange(stepType: stepType, from: pastStart, to: futureEnd, rangeName: "2-year window")
        results.append(broadResult)
        
        return results.joined(separator: "\n")
    }
    
    private func checkStepDataInRange(stepType: HKQuantityType, from startDate: Date?, to endDate: Date?, rangeName: String) async -> String {
        return await withCheckedContinuation { continuation in
            
            print("🔍 Checking \(rangeName)...")
            
            let predicate = startDate != nil && endDate != nil ?
                HKQuery.predicateForSamples(withStart: startDate!, end: endDate!, options: []) : nil
            
            let query = HKSampleQuery(
                sampleType: stepType,
                predicate: predicate,
                limit: 100,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                
                if let error = error {
                    print("❌ Query error for \(rangeName): \(error.localizedDescription)")
                    continuation.resume(returning: "❌ \(rangeName): Error - \(error.localizedDescription)")
                    return
                }
                
                if let samples = samples, !samples.isEmpty {
                    let stepSamples = samples.compactMap { $0 as? HKQuantitySample }
                    let totalSteps = stepSamples.reduce(0) { sum, sample in
                        sum + Int(sample.quantity.doubleValue(for: HKUnit.count()))
                    }
                    
                    let sources = Set(stepSamples.map { $0.sourceRevision.source.name })
                    let sourceList = sources.joined(separator: ", ")
                    
                    print("✅ \(rangeName): Found \(stepSamples.count) samples, \(totalSteps) total steps from: \(sourceList)")
                    
                    // Log details of first few samples
                    for (index, sample) in stepSamples.prefix(10).enumerated() {
                        let steps = Int(sample.quantity.doubleValue(for: HKUnit.count()))
                        let source = sample.sourceRevision.source.name
                        let dateFormatter = DateFormatter()
                        dateFormatter.dateFormat = "MM/dd HH:mm"
                        let dateStr = dateFormatter.string(from: sample.startDate)
                        print("  \(index + 1). \(steps) steps from '\(source)' at \(dateStr)")
                    }
                    
                    continuation.resume(returning: "✅ \(rangeName): \(stepSamples.count) samples, \(totalSteps) total steps")
                    
                } else {
                    print("❌ No step samples found in \(rangeName)")
                    continuation.resume(returning: "❌ \(rangeName): No samples found")
                }
            }
            
            self.healthStore.execute(query)
        }
    }
    
    // MARK: - Helper Methods
    private func authStatusString(_ status: HKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .sharingDenied: return "sharingDenied"
        case .sharingAuthorized: return "sharingAuthorized"
        @unknown default: return "unknown"
        }
    }
    
    // MARK: - Legacy Compatibility Methods (for AppDelegate)
    func requestAuthorization() async -> Bool {
        let (success, _) = await requestComprehensiveHealthKitAccess()
        return success
    }
    
    func syncDateRange(startDate: Date, endDate: Date) async {
        print("🔄 Legacy sync method called for steps data...")
        let stepsData = await fetchStepCount()
        print("📊 Steps sync result: \(stepsData)")
    }
    
    // MARK: - Explicit Read Permission Request
    func requestExplicitReadPermission() async -> String {
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