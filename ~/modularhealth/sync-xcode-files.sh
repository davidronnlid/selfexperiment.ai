#!/bin/bash

# Xcode Files Sync Script
# Keeps Swift files synchronized between project structure and actual Xcode project

PROJECT_DIR="$HOME/modularhealth/xcode-project"
XCODE_DIR="$HOME/Documents/Modular Health/Modular Health"

echo "🔄 Syncing Xcode files..."

# Array of Swift files to sync
FILES=(
    "ContentView.swift"
    "HealthDataManager.swift"
    "AppDelegate.swift"
    "ModularHealthApp.swift"
    "Config.swift"
    "HealthKitManager.swift"
)

# Function to sync a single file
sync_file() {
    local file=$1
    local project_file="$PROJECT_DIR/$file"
    local xcode_file="$XCODE_DIR/$file"
    
    # Skip if either file doesn't exist
    if [[ ! -f "$project_file" && ! -f "$xcode_file" ]]; then
        echo "⚠️  $file: Neither file exists, skipping"
        return
    fi
    
    # If only one exists, copy it to the other location
    if [[ ! -f "$project_file" ]]; then
        echo "📂 $file: Copying from Xcode project to project structure"
        cp "$xcode_file" "$project_file"
        return
    fi
    
    if [[ ! -f "$xcode_file" ]]; then
        echo "📱 $file: Copying from project structure to Xcode project"
        cp "$project_file" "$xcode_file"
        return
    fi
    
    # Both files exist - sync the newer one
    if [[ "$project_file" -nt "$xcode_file" ]]; then
        echo "📱 $file: Project structure is newer → syncing to Xcode project"
        cp "$project_file" "$xcode_file"
    elif [[ "$xcode_file" -nt "$project_file" ]]; then
        echo "📂 $file: Xcode project is newer → syncing to project structure"
        cp "$xcode_file" "$project_file"
    else
        echo "✅ $file: Files are in sync"
    fi
}

# Sync all files
for file in "${FILES[@]}"; do
    sync_file "$file"
done

echo "🎉 Sync completed!"

# Show current file timestamps for verification
echo ""
echo "📊 Current file timestamps:"
echo "Project Structure (~/modularhealth/xcode-project/):"
ls -la "$PROJECT_DIR"/*.swift 2>/dev/null | awk '{print "  " $9 ": " $6 " " $7 " " $8}'

echo ""
echo "Xcode Project (~/Documents/Modular Health/Modular Health/):"
ls -la "$XCODE_DIR"/*.swift 2>/dev/null | awk '{print "  " $9 ": " $6 " " $7 " " $8}' 