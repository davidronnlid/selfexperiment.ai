import UIKit
import HealthKit

class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        if url.scheme == "modularhealth" {
            handleModularHealthURL(url)
            return true
        }
        return false
    }

    func handleModularHealthURL(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return }

        let queryItems = components.queryItems
        let userId = queryItems?.first(where: { $0.name == "user_id" })?.value
        let action = queryItems?.first(where: { $0.name == "action" })?.value
        let syncType = queryItems?.first(where: { $0.name == "sync_type" })?.value ?? "all"
        let startDate = queryItems?.first(where: { $0.name == "start_date" })?.value
        let endDate = queryItems?.first(where: { $0.name == "end_date" })?.value
        let source = queryItems?.first(where: { $0.name == "source" })?.value

        print("📱 Deep link received:")
        print("  User ID: \(userId ?? "none")")
        print("  Action: \(action ?? "none")")
        print("  Sync Type: \(syncType)")
        print("  Start Date: \(startDate ?? "none")")
        print("  End Date: \(endDate ?? "none")")
        print("  Source: \(source ?? "none")")

        if action == "sync_apple_health" {
            startAppleHealthSync(userId: userId, syncType: syncType, startDate: startDate, endDate: endDate)
        }
    }

    func startAppleHealthSync(userId: String?, syncType: String, startDate: String?, endDate: String?) {
        guard let userId = userId else {
            print("❌ No user ID provided")
            return
        }

        print("🍎 Starting Apple Health sync for user: \(userId)")
        print("📅 Sync type: \(syncType)")

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        var startDateObj: Date?
        var endDateObj: Date?

        if syncType == "range", let startDateStr = startDate, let endDateStr = endDate {
            startDateObj = dateFormatter.date(from: startDateStr)
            endDateObj = dateFormatter.date(from: endDateStr)
            print("📅 Date range: \(startDateStr) to \(endDateStr)")
        } else {
            endDateObj = Date()
            startDateObj = Calendar.current.date(byAdding: .day, value: -365, to: endDateObj!)
            print("📅 Using default range: last 365 days")
        }

        guard let startDate = startDateObj, let endDate = endDateObj else {
            print("❌ Invalid date range")
            return
        }

        requestHealthKitPermissions { success in
            if success {
                self.syncHealthDataForDateRange(userId: userId, startDate: startDate, endDate: endDate)
            } else {
                print("❌ HealthKit permissions denied")
            }
        }
    }

    func requestHealthKitPermissions(completion: @escaping (Bool) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            print("❌ HealthKit not available on this device")
            completion(false)
            return
        }

        let healthStore = HKHealthStore()
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .bodyMass)!,
            HKObjectType.quantityType(forIdentifier: .height)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        ]

        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ HealthKit authorization error: \(error.localizedDescription)")
                    completion(false)
                } else {
                    print("✅ HealthKit permissions granted")
                    completion(success)
                }
            }
        }
    }

    func syncHealthDataForDateRange(userId: String, startDate: Date, endDate: Date) {
        let healthStore = HKHealthStore()

        print("🔄 Starting comprehensive sync for date range: \(startDate) to \(endDate)")
        print("⏱️ This may take a moment to fetch all your health data...")

        // Start with step count immediately
        syncStepCount(healthStore: healthStore, userId: userId, startDate: startDate, endDate: endDate)
        
        // Add small delays between queries to prevent conflicts
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.syncHeartRate(healthStore: healthStore, userId: userId, startDate: startDate, endDate: endDate)
        }
        
        // Add more data types with staggered timing
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) {
            self.syncBodyMass(healthStore: healthStore, userId: userId, startDate: startDate, endDate: endDate)
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 6.0) {
            self.syncDistanceWalkingRunning(healthStore: healthStore, userId: userId, startDate: startDate, endDate: endDate)
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 8.0) {
            print("🎉 Sync process initiated for all health data types!")
            print("📊 Check your terminal for API calls - you should see hundreds of data points!")
        }
    }

    func syncStepCount(healthStore: HKHealthStore, userId: String, startDate: Date, endDate: Date) {
        guard let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)

        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                print("❌ Error fetching step count: \(error.localizedDescription)")
                return
            }

            guard let stepSamples = samples as? [HKQuantitySample] else { return }
            print("📊 Found \(stepSamples.count) step count samples")

            for sample in stepSamples {
                let value = sample.quantity.doubleValue(for: HKUnit.count())
                let timestamp = sample.startDate
                self.sendHealthDataToAPI(userId: userId, type: "step_count", value: value, timestamp: timestamp)
            }
        }

        healthStore.execute(query)
    }

    func syncHeartRate(healthStore: HKHealthStore, userId: String, startDate: Date, endDate: Date) {
        guard let type = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)

        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                print("❌ Error fetching heart rate: \(error.localizedDescription)")
                return
            }

            guard let hrSamples = samples as? [HKQuantitySample] else { return }
            print("💓 Found \(hrSamples.count) heart rate samples")

            for sample in hrSamples {
                let value = sample.quantity.doubleValue(for: HKUnit(from: "count/min"))
                let timestamp = sample.startDate
                self.sendHealthDataToAPI(userId: userId, type: "heart_rate", value: value, timestamp: timestamp)
            }
        }

        healthStore.execute(query)
    }

    // Add these new sync functions
    func syncBodyMass(healthStore: HKHealthStore, userId: String, startDate: Date, endDate: Date) {
        guard let type = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)

        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                print("❌ Error fetching body mass: \(error.localizedDescription)")
                return
            }

            guard let massSamples = samples as? [HKQuantitySample] else { return }
            print("⚖️ Found \(massSamples.count) body mass samples")

            for sample in massSamples {
                let value = sample.quantity.doubleValue(for: HKUnit.gramUnit(with: .kilo))
                let timestamp = sample.startDate
                self.sendHealthDataToAPI(userId: userId, type: "body_mass", value: value, timestamp: timestamp)
            }
        }

        healthStore.execute(query)
    }

    func syncDistanceWalkingRunning(healthStore: HKHealthStore, userId: String, startDate: Date, endDate: Date) {
        guard let type = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) else { return }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)

        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                print("❌ Error fetching distance: \(error.localizedDescription)")
                return
            }

            guard let distanceSamples = samples as? [HKQuantitySample] else { return }
            print("🏃 Found \(distanceSamples.count) distance samples")

            for sample in distanceSamples {
                let value = sample.quantity.doubleValue(for: HKUnit.meter())
                let timestamp = sample.startDate
                self.sendHealthDataToAPI(userId: userId, type: "distance_walking_running", value: value, timestamp: timestamp)
            }
        }

        healthStore.execute(query)
    }

    func sendHealthDataToAPI(userId: String, type: String, value: Double, timestamp: Date) {
        let urlString = "http://192.168.0.108:3000/api/applehealth/receive"
        guard let url = URL(string: urlString) else {
            print("❌ Invalid URL")
            return
        }

        let formatter = ISO8601DateFormatter()
        let body: [String: Any] = [
            "user_id": userId,
            "type": type,
            "value": value,
            "timestamp": formatter.string(from: timestamp),
            "from_ios": true
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            print("❌ JSON error: \(error.localizedDescription)")
            return
        }

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                print("❌ Network error: \(error.localizedDescription)")
            } else if let http = response as? HTTPURLResponse {
                if http.statusCode == 200 {
                    print("✅ Sent \(type): \(value)")
                } else {
                    print("❌ API error: \(http.statusCode)")
                }
            }
        }.resume()
    }
} 