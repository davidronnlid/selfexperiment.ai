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

        // Request permissions first, then start comprehensive sync
        let healthManager = HealthDataManager()
        
        Task {
            let message = await healthManager.requestExplicitReadPermission()
            print("🔔 HealthKit authorization result: \(message)")
            if message.contains("✅") {
                print("✅ HealthKit permissions granted - starting comprehensive sync")
                let (success, message) = await healthManager.syncStepsToWebApp(from: startDate, to: endDate, baseURL: "http://172.20.10.8:3000", userID: "user123")
                print("🎉 Comprehensive sync completed!")
            } else {
                print("❌ HealthKit permissions denied")
            }
        }
    }
}
