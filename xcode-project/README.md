# Modular Health iOS App

This folder contains all the Swift files for the iOS HealthKit integration app.

## Files Overview

- **AppDelegate.swift** - Handles deep links and coordinates with HealthDataManager
- **HealthDataManager.swift** - Main class for comprehensive health data syncing
- **ContentView.swift** - SwiftUI interface with sync buttons
- **Config.swift** - Configuration settings (IP address and user ID)
- **HealthKitManager.swift** - Simple HealthKit utilities
- **Info.plist** - App configuration including URL scheme
- **ModularHealthApp.swift** - Main SwiftUI app entry point

## Key Features

1. **Deep Link Support** - Opens via `modularhealth://sync` URLs from web browser
2. **Comprehensive Sync** - Syncs individual health data samples for date ranges
3. **Multiple Data Types** - Steps, heart rate, body mass
4. **Local Testing** - Configured for localhost development

## How to Use

1. Copy all `.swift` files to your Xcode project
2. Copy the Info.plist content to your existing Info.plist
3. Update the IP address in Config.swift if needed
4. Build and run on iPhone
5. Test deep link: `modularhealth://test` in Safari
6. Use "Sync Last 30 Days" button for comprehensive sync

## Expected Output

When working correctly, you should see in Xcode console:
```
🔄 HealthDataManager: Starting comprehensive sync for...
🔍 Querying individual step samples from...
📊 Found 247 individual step samples
📤 Sending step sample 1/247: 8234 steps at...
```

## Troubleshooting

- **URL scheme not working**: Make sure Info.plist has CFBundleURLTypes
- **Only getting 2 data points**: Use green "Sync Last 30 Days" button, not purple one
- **Build errors**: Check all files are imported correctly and Config.swift exists 