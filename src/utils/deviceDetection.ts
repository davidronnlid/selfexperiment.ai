// Device and platform detection utilities for Apple Health integration

export interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  canSyncAppleHealth: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  version: string;
}

export function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // iOS detection (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Android detection
  const isAndroid = /Android/.test(userAgent);
  
  // macOS detection
  const isMac = /Mac/.test(platform) && !isIOS;
  
  // Windows detection
  const isWindows = /Win/.test(platform);
  
  // Linux detection
  const isLinux = /Linux/.test(platform) && !isAndroid;
  
  // Device type detection
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/Mobile|Android|iPhone|iPod/.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/iPad|Tablet/.test(userAgent) || (isIOS && window.screen.width >= 768)) {
    deviceType = 'tablet';
  }
  
  // Browser detection
  let browser = 'unknown';
  if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    browser = 'safari';
  } else if (/Chrome/.test(userAgent)) {
    browser = 'chrome';
  } else if (/Firefox/.test(userAgent)) {
    browser = 'firefox';
  } else if (/Edge/.test(userAgent)) {
    browser = 'edge';
  }
  
  // Extract version
  const versionMatch = userAgent.match(/(?:Version|Chrome|Firefox|Edge)\/(\d+(?:\.\d+)*)/);
  const version = versionMatch ? versionMatch[1] : 'unknown';
  
  // Apple Health sync capability
  // Only iOS devices can sync Apple Health data
  const canSyncAppleHealth = isIOS;
  
  return {
    isIOS,
    isAndroid,
    isMac,
    isWindows,
    isLinux,
    canSyncAppleHealth,
    deviceType,
    browser,
    version
  };
}

export function getAppleHealthSyncAppUrl(): string {
  // Deep link to your Modular Health Sync app
  // This should be your actual app's URL scheme
  return 'modularhealth://sync';
}

export function getAppStoreUrl(): string {
  // Replace YOUR_APP_ID with your actual App Store ID
  // You can find this in App Store Connect under App Information
  // Example: https://apps.apple.com/app/modular-health-sync/id1234567890
  // TODO: Replace with your actual App Store ID when available
  // For now, we'll use a fallback or handle the case where app isn't published yet
  return 'https://apps.apple.com/developer/6749085412'; // Replace with your developer ID
}

export function canInstallApp(): boolean {
  const deviceInfo = getDeviceInfo();
  return deviceInfo.isIOS || deviceInfo.isAndroid;
}

export function shouldShowAppleHealthConnect(): boolean {
  const deviceInfo = getDeviceInfo();
  // Show Apple Health connect option for all devices, but handle differently
  return true;
}

export function generateAppleHealthInstructions(deviceInfo: DeviceInfo): string {
  if (deviceInfo.canSyncAppleHealth) {
    return "You're on an iOS device! We'll open the Modular Health Sync app to authorize HealthKit access and sync your data.";
  }
  
  if (deviceInfo.isMac) {
    return "You're on a Mac. Apple Health syncing requires an iOS device, but you can view your synced data here. Please use your iPhone or iPad to sync Apple Health data.";
  }
  
  if (deviceInfo.isAndroid) {
    return "You're on an Android device. Apple Health syncing requires an iOS device, but you can view your synced data here. If you have an iPhone or iPad, please use that device to sync Apple Health data.";
  }
  
  return "Apple Health syncing requires an iOS device (iPhone, iPad), but you can view your synced data on any device. Please use an iOS device to sync your Apple Health data.";
} 