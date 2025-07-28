import SwiftUI
import HealthKit

struct ContentView: View {
    @StateObject private var healthManager = HealthDataManager()
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var isLoading = false
    @State private var startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
    @State private var endDate = Date()
    
    private let webAppBaseURL = "http://172.20.10.8:3000"
    private let userID = "bb0ac2ff-72c5-4776-a83a-01855bff4df0"
    
    var body: some View {
        NavigationView {
            mainContent
                .navigationTitle("HealthKit - Read Only")
                .alert("HealthKit", isPresented: $showingAlert) {
                    Button("OK") { }
                } message: {
                    Text(alertMessage)
                }
        }
    }
    
    private var mainContent: some View {
        ScrollView {
            VStack(spacing: 20) {
                headerSection
                statusSection
                
                // Show sync progress when active
                if healthManager.isSyncing {
                    syncProgressSection
                }
                
                stepsDataSection
                dateRangeSection
                actionSection
                debugSection
                Spacer()
            }
            .padding()
        }
    }
    
    private var headerSection: some View {
        VStack(spacing: 8) {
            Text("HealthKit Steps Reader")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Read steps data from Apple Health and sync to Modular Health database.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }
    
    private var statusSection: some View {
        VStack(spacing: 12) {
            authStatusRow
            syncStatusRow
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    private var authStatusRow: some View {
        HStack {
            Text("Steps Access:")
                .fontWeight(.medium)
            Spacer()
            Text(healthKitStatusText)
                .foregroundColor(healthKitStatusColor)
        }
    }
    
    private var syncStatusRow: some View {
        HStack {
            Text("Sync Status:")
                .fontWeight(.medium)
            Spacer()
            Text(healthManager.syncStatus)
                .foregroundColor(syncStatusColor)
        }
    }
    
    private var syncProgressSection: some View {
        VStack(spacing: 16) {
            Text("📲 Sync Progress")
                .font(.headline)
                .foregroundColor(.primary)
            
            // Progress bar
            VStack(spacing: 8) {
                HStack {
                    Text("Progress")
                        .fontWeight(.medium)
                    Spacer()
                    Text("\(healthManager.processedDays) / \(healthManager.totalDaysToSync) days")
                        .foregroundColor(.secondary)
                }
                
                ProgressView(value: healthManager.syncProgress)
                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                    .scaleEffect(y: 2)
            }
            
            // Current status
            VStack(spacing: 6) {
                HStack {
                    Text("Current Day:")
                        .fontWeight(.medium)
                    Spacer()
                    Text(healthManager.currentSyncDay)
                        .foregroundColor(.primary)
                }
                
                if healthManager.currentDaySteps > 0 {
                    HStack {
                        Text("Steps Found:")
                            .fontWeight(.medium)
                        Spacer()
                        Text("\(healthManager.currentDaySteps)")
                            .foregroundColor(.green)
                    }
                }
            }
            
            // Summary stats
            HStack(spacing: 20) {
                VStack {
                    Text("\(healthManager.successfulDays)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    Text("Synced")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                VStack {
                    Text("\(healthManager.failedDays)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.red)
                    Text("Failed")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                VStack {
                    Text("\(healthManager.totalStepsSynced)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                    Text("Total Steps")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Recent sync details (last 5 days)
            if !healthManager.syncProgressDetails.isEmpty {
                VStack(spacing: 4) {
                    Text("Recent Days")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    ForEach(healthManager.syncProgressDetails.suffix(5)) { detail in
                        HStack {
                            Text(detail.date)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Spacer()
                            
                            Text("\(detail.steps) steps")
                                .font(.caption)
                                .foregroundColor(detail.success ? .green : .orange)
                            
                            Text(detail.success ? "✅" : "⚪")
                                .font(.caption)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color(.tertiarySystemBackground))
                        .cornerRadius(4)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGreen).opacity(0.1))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.green, lineWidth: 1)
        )
        .cornerRadius(12)
    }
    
    private var stepsDataSection: some View {
        VStack(spacing: 12) {
            Text("Steps Data")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack {
                Text("Last Count:")
                    .fontWeight(.medium)
                Spacer()
                Text("\(healthManager.lastStepsCount)")
                    .foregroundColor(.primary)
            }
            
            HStack {
                Text("Last Sync:")
                    .fontWeight(.medium)
                Spacer()
                Text(lastSyncText)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    private var dateRangeSection: some View {
        VStack(spacing: 12) {
            Text("Select Date Range")
                .font(.headline)
                .foregroundColor(.primary)
            
            VStack(spacing: 8) {
                DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                DatePicker("End Date", selection: $endDate, displayedComponents: .date)
            }
            .padding(.horizontal, 8)
            
            // Quick Sync Buttons - Always visible when permissions granted
            if healthManager.authorizedDataTypes.count > 0 {
                VStack(spacing: 8) {
                    // Sync Selected Range Button
                    Button(action: quickSyncSelectedRange) {
                        HStack {
                            if healthManager.isSyncing {
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .tint(.white)
                                Text("Syncing...")
                            } else {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                Text("🚀 Sync Selected Range")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .padding(.horizontal, 12)
                        .background(healthManager.isSyncing ? Color.gray : Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                    .disabled(healthManager.isSyncing)
                    
                    // Sync ALL TIME Button
                    Button(action: syncAllTimeStepsData) {
                        HStack {
                            if healthManager.isSyncing {
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .tint(.white)
                                Text("Syncing...")
                            } else {
                                Image(systemName: "clock.arrow.circlepath")
                                Text("📱 Sync ALL TIME Data")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .padding(.horizontal, 12)
                        .background(healthManager.isSyncing ? Color.gray : Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                    .disabled(healthManager.isSyncing)
                }
            } else {
                // Show placeholder when no permissions
                HStack {
                    Image(systemName: "lock.fill")
                    Text("Grant permission to enable sync")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(Color.gray.opacity(0.3))
                .foregroundColor(.secondary)
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    private var actionSection: some View {
        VStack(spacing: 12) {
            requestAccessButton
            syncDataButton
        }
    }
    
    private var requestAccessButton: some View {
        Button(action: requestHealthKitAccess) {
            HStack {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                        .tint(.white)
                } else {
                    Image(systemName: "heart.fill")
                }
                Text(isLoading ? "Requesting..." : 
                     healthManager.authorizedDataTypes.count > 0 ?
                     "Check Steps Permission" : "Request Steps Access")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(requestButtonColor)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(isLoading)
    }
    
    private var syncDataButton: some View {
        Button(action: syncStepsWithWebApp) {
            HStack {
                Image(systemName: "arrow.clockwise")
                Text("Sync Steps Data")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(healthManager.authorizedDataTypes.count == 0 || isLoading)
    }
    
    private var debugSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Debug Info")
                .font(.headline)
            Text("Steps Access: \(healthManager.authorizedDataTypes.count > 0 ? "✅ Granted" : "❌ Pending")")
            Text("Sync Status: \(healthManager.syncStatus)")
            
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Button(action: checkAvailableData) {
                        HStack {
                            Image(systemName: "magnifyingglass")
                            Text("Check Step Data")
                        }
                        .font(.caption)
                        .padding(.vertical, 4)
                        .padding(.horizontal, 8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(6)
                    }
                    
                    Button(action: checkAllHealthKit) {
                        HStack {
                            Image(systemName: "heart.text.square")
                            Text("Check All HealthKit")
                        }
                        .font(.caption)
                        .padding(.vertical, 4)
                        .padding(.horizontal, 8)
                        .background(Color.purple)
                        .foregroundColor(.white)
                        .cornerRadius(6)
                    }
                }
                
                Button(action: forcePermissionRequest) {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("FORCE Permission Dialog")
                    }
                    .font(.caption)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 12)
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(6)
                }
            }
            
            Text("ℹ️ Read-only mode: Only fetching steps data from HealthKit")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .cornerRadius(8)
    }
    
    // MARK: - Computed Properties
    
    private var healthKitStatusText: String {
        return healthManager.authorizedDataTypes.count > 0 ? "✅ Granted" : "❌ Pending"
    }
    
    private var healthKitStatusColor: Color {
        return healthManager.authorizedDataTypes.count > 0 ? .green : .orange
    }
    
    private var syncStatusColor: Color {
        return healthManager.syncStatus.contains("Successfully") ? .green : .orange
    }
    
    private var requestButtonColor: Color {
        return isLoading ? .gray : .green
    }
    
    private var lastSyncText: String {
        if let lastSync = healthManager.lastSyncDate {
            let formatter = DateFormatter()
            formatter.dateStyle = .short
            formatter.timeStyle = .short
            return formatter.string(from: lastSync)
        }
        return "Never"
    }
    
    // MARK: - Actions
    
    private func requestHealthKitAccess() {
        isLoading = true
        
        Task {
            let (success, message) = await healthManager.requestComprehensiveHealthKitAccess()
            
            DispatchQueue.main.async {
                isLoading = false
                
                if success {
                    alertMessage = "✅ Steps read access granted! You can now sync your data."
                } else {
                    alertMessage = "❌ \(message)"
                }
                showingAlert = true
            }
        }
    }
    
    private func syncStepsWithWebApp() {
        isLoading = true
        
        Task {
            let (success, message) = await healthManager.syncStepsToWebApp(
                from: startDate,
                to: endDate,
                baseURL: webAppBaseURL,
                userID: userID
            )
            
            DispatchQueue.main.async {
                isLoading = false
                alertMessage = message
                showingAlert = true
            }
        }
    }
    
    private func quickSyncSelectedRange() {
        print("🚀 Quick sync for selected date range: \(startDate) to \(endDate)")
        
        Task {
            let (success, message) = await healthManager.syncStepsToWebApp(
                from: startDate,
                to: endDate,
                baseURL: webAppBaseURL,
                userID: userID
            )
            
            // Show result in alert
            DispatchQueue.main.async {
                if message.contains("All data for this period has already been synced") {
                    // Show info about already synced data
                    self.alertMessage = "ℹ️ \(message)\n\nNo new data to sync for the selected period."
                    self.showingAlert = true
                } else if !success {
                    // Show error
                    self.alertMessage = "❌ Sync failed: \(message)"
                    self.showingAlert = true
                } else if message.contains("days already synced. Will sync missing days") {
                    // Show partial sync info
                    self.alertMessage = "✅ Sync completed!\n\n\(message)"
                    self.showingAlert = true
                } else {
                    // Full sync success - no alert needed, progress UI shows it
                    print("✅ Quick sync completed successfully: \(message)")
                }
            }
        }
    }
    
    private func syncAllTimeStepsData() {
        print("🕒 Starting ALL TIME steps data sync...")
        
        // Create a very broad date range to capture all possible HealthKit data
        let calendar = Calendar.current
        let today = Date()
        
        // Start from iPhone release date (2007) to ensure we get ALL data
        let iPhoneReleaseDate = calendar.date(from: DateComponents(year: 2007, month: 1, day: 1)) ?? today
        
        // Show confirmation alert first
        let totalDays = calendar.dateComponents([.day], from: iPhoneReleaseDate, to: today).day ?? 0
        
        let alert = UIAlertController(
            title: "🕒 Sync ALL TIME Data",
            message: "This will sync ALL available step data from your Apple Health history (potentially \(totalDays) days).\n\nThis may take several minutes and will check every day since 2007.\n\nProceed?",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "🚀 Sync ALL", style: .destructive) { _ in
            Task {
                print("🌍 User confirmed: Starting comprehensive ALL TIME sync...")
                print("📅 Date range: \(iPhoneReleaseDate) to \(today)")
                
                let (success, message) = await self.healthManager.syncStepsToWebApp(
                    from: iPhoneReleaseDate,
                    to: today,
                    baseURL: self.webAppBaseURL,
                    userID: self.userID
                )
                
                DispatchQueue.main.async {
                    if message.contains("All data for this period has already been synced") {
                        self.alertMessage = "✅ \(message)\n\nYour complete step history is already synchronized!"
                        self.showingAlert = true
                    } else if !success {
                        self.alertMessage = "❌ ALL TIME sync failed: \(message)"
                        self.showingAlert = true
                    } else if message.contains("days already synced. Will sync missing days") {
                        self.alertMessage = "✅ ALL TIME sync completed!\n\n\(message)"
                        self.showingAlert = true
                    } else {
                        print("✅ ALL TIME sync completed successfully: \(message)")
                    }
                }
            }
        })
        
        // Present the alert
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.rootViewController?.present(alert, animated: true)
        }
    }
    
    private func checkAvailableData() {
        print("🔍 Checking available step data...")
        
        Task {
            let result = await healthManager.checkAvailableStepData()
            
            DispatchQueue.main.async {
                self.alertMessage = result
                self.showingAlert = true
            }
        }
    }
    
    private func checkAllHealthKit() {
        print("🔍 Checking ALL HealthKit data and sources...")
        
        Task {
            let result = await healthManager.checkAllHealthKitSources()
            
            DispatchQueue.main.async {
                self.alertMessage = result
                self.showingAlert = true
            }
        }
    }
    
    private func forcePermissionRequest() {
        print("🔥 FORCING permission dialog to appear...")
        isLoading = true
        
        Task {
            let message = await healthManager.requestExplicitReadPermission()
            
            DispatchQueue.main.async {
                isLoading = false
                alertMessage = message
                showingAlert = true
            }
        }
    }
}

#Preview {
    ContentView()
} 