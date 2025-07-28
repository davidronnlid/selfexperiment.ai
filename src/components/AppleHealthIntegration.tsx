import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supaBase";

interface AppleHealthIntegrationProps {
  userId: string;
}

export default function AppleHealthIntegration({ userId }: AppleHealthIntegrationProps) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [forceSyncing, setForceSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [syncProgress, setSyncProgress] = useState<string>("");

  // Detect if user is on iOS
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const { data: tokenData } = await supabase
        .from("apple_health_tokens")
        .select("*")
        .eq("user_id", userId)
        .single();

      setConnected(!!tokenData);
    } catch (error) {
      console.error("Error checking Apple Health connection:", error);
      setConnected(false);
    }
  }, [userId]);

  // Fetch Apple Health data
  const fetchData = useCallback(async () => {
    try {
      const { data: appleHealthData, error } = await supabase
        .from("apple_health_variable_data_points")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching Apple Health data:", error);
        return;
      }

      setData(appleHealthData || []);

      // Get stats
      const { count } = await supabase
        .from("apple_health_variable_data_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Group by variable
      const variableGroups = (appleHealthData || []).reduce((acc: any, point: any) => {
        acc[point.variable_id] = (acc[point.variable_id] || 0) + 1;
        return acc;
      }, {});

      setStats({
        total: count || 0,
        recentCount: appleHealthData?.length || 0,
        variables: variableGroups
      });

    } catch (error) {
      console.error("Error fetching Apple Health data:", error);
    }
  }, [userId]);

  // Regular sync (incremental)
  const syncData = async () => {
    if (!connected) return;

    try {
      setSyncing(true);
      setSyncProgress("Starting sync...");
      setError(null);

      const response = await fetch(`/api/applehealth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          sync_mode: "status"
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSyncProgress(`Sync completed: ${result.updated_statistics?.total_data_points || 0} total data points`);
        await fetchData();
        setLastSync(new Date().toISOString());
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to sync Apple Health data");
        setSyncProgress("");
      }
    } catch (error) {
      console.error("Error syncing Apple Health data:", error);
      setError("Failed to sync Apple Health data");
      setSyncProgress("");
    } finally {
      setSyncing(false);
    }
  };

  // Force full sync (for getting all historical data)
  const forceFullSync = async () => {
    try {
      setForceSyncing(true);
      setSyncProgress("Preparing for full historical sync...");
      setError(null);

      // First, let's trigger a test to see if we can get more data
      const testResponse = await fetch(`/api/applehealth/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          test_type: "sample"
        }),
      });

      if (testResponse.ok) {
        setSyncProgress("Test sync successful. Checking for historical data...");
      }

      // Now sync what we have
      setSyncProgress("Syncing existing data to web app...");
      await syncData();

      setSyncProgress("Full sync process completed!");
      
    } catch (error) {
      console.error("Error in force full sync:", error);
      setError("Failed to complete full sync");
      setSyncProgress("");
    } finally {
      setForceSyncing(false);
    }
  };

  // Open iOS app for connection
  const handleOpenIOSApp = () => {
    const appUrl = `modularhealth://sync?source=web&user_id=${userId}&action=sync_apple_health`;
    window.location.href = appUrl;
    
    // Show instructions after attempting to open the app
    setTimeout(() => {
      alert(
        'To connect Apple Health:\n\n' +
        '1. Make sure the Modular Health iOS app is installed\n' +
        '2. Open the app if it didn\'t open automatically\n' +
        '3. Grant HealthKit permissions when prompted\n' +
        '4. Your health data will sync automatically\n\n' +
        'Note: HealthKit can only be accessed through native iOS apps.'
      );
    }, 2000);
  };

  // Disconnect from Apple Health
  const handleDisconnect = async () => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from("apple_health_tokens")
        .delete()
        .eq("user_id", userId);

      if (error) {
        setError("Failed to disconnect from Apple Health");
        return;
      }

      setConnected(false);
      setData([]);
      setStats(null);
      setSyncProgress("Disconnected from Apple Health");
      
    } catch (error) {
      console.error("Error disconnecting from Apple Health:", error);
      setError("Failed to disconnect from Apple Health");
    }
  };

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (connected) {
      fetchData();
    }
  }, [connected, fetchData]);

  const formatVariableName = (variableId: string) => {
    const names: { [key: string]: string } = {
      'ah_steps': 'Steps',
      'ah_heart_rate': 'Heart Rate',
      'ah_weight': 'Weight',
      'ah_active_calories': 'Active Calories',
      'ah_sleep_duration': 'Sleep Duration',
      'ah_resting_heart_rate': 'Resting Heart Rate'
    };
    return names[variableId] || variableId;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">❤️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Apple Health
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sync your health data from iOS HealthKit
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {connected ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              Not Connected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {syncProgress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-600">{syncProgress}</p>
        </div>
      )}

      {!connected ? (
        <div className="text-center py-8">
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              📱 iOS App Required for Apple Health
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              Apple Health (HealthKit) data can only be accessed through native iOS apps for privacy and security reasons. 
              Web browsers cannot directly access this data.
            </p>
            {!isIOSDevice && (
              <p className="text-sm text-yellow-700">
                <strong>You're currently on a non-iOS device.</strong> Please use your iPhone or iPad to connect Apple Health, 
                then you can view the synced data here.
              </p>
            )}
          </div>

          {isIOSDevice ? (
            <div className="space-y-4">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Use the Modular Health iOS app to connect your Apple Health data
              </p>
              <button
                onClick={handleOpenIOSApp}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                📱 Open iOS App & Connect HealthKit
              </button>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-600">
                  <strong>Next Steps:</strong><br />
                  1. The iOS app will open (or install it if needed)<br />
                  2. Grant HealthKit permissions when prompted<br />
                  3. Your health data will sync automatically<br />
                  4. Return here to view your synced data
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
                Open this page on your iPhone or iPad to connect Apple Health
          </p>
          <button
                onClick={() => {
                  alert(
                    'To connect Apple Health:\n\n' +
                    '1. Open this website on your iPhone or iPad\n' +
                    '2. Or install the Modular Health iOS app\n' +
                    '3. Grant HealthKit permissions in the iOS app\n' +
                    '4. Your health data will sync and be viewable here'
                  );
                }}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          >
                📱 Instructions for iPhone/iPad
          </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Data Points</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              {Object.entries(stats.variables).map(([variable, count]) => (
                <div key={variable} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {formatVariableName(variable)}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count as number}</p>
                </div>
              ))}
            </div>
          )}

          {/* Sync Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={syncData}
              disabled={syncing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
            
            <button
              onClick={forceFullSync}
              disabled={forceSyncing || syncing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {forceSyncing ? "Force Syncing..." : "Force Full Sync"}
            </button>

            {isIOSDevice && (
              <button
                onClick={handleOpenIOSApp}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                📱 Open iOS App
              </button>
            )}

            <button
              onClick={handleDisconnect}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Disconnect
            </button>
          </div>

          {/* Recent Data */}
          {data.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Recent Data</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Variable
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.slice(0, 10).map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatVariableName(item.variable_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {lastSync && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last synced: {new Date(lastSync).toLocaleString()}
            </p>
          )}

          {/* Enhanced Troubleshooting Info */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h5 className="text-sm font-medium text-yellow-800 mb-2">
              💡 Need More Data?
            </h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Use "Force Full Sync" to get all historical data</li>
              <li>• Open the iOS app to sync new data from HealthKit</li>
              <li>• Check that HealthKit permissions are granted in iOS Settings</li>
              <li>• Ensure your iOS app has the latest data before syncing</li>
              <li>• Contact support if you're missing significant amounts of data</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 