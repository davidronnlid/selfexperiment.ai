# 🍎 Apple Health Backend API Documentation

This document describes the backend API endpoints for Apple Health integration with Modular Health.

## 📋 Overview

The Apple Health backend provides a RESTful API for iOS apps to send HealthKit data to the Modular Health platform. The system supports real-time data synchronization, validation, and comprehensive error handling.

## 🔗 Base URL

```
Development: http://localhost:3001
Production: https://your-domain.com
```

## 🔐 Authentication

All endpoints require a valid `user_id` (UUID format) that corresponds to an existing user in the system.

## 📡 API Endpoints

### 1. Receive Health Data

**Endpoint:** `POST /api/applehealth/receive`

**Description:** Receives individual health data points from iOS apps.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "type": "step_count",
  "value": 8543,
  "timestamp": "2025-01-23T10:30:00Z",
  "raw_data": {
    "from_ios_app": true,
    "app_version": "1.0.0",
    "device_info": "iPhone 15 Pro",
    "health_kit_metadata": {
      "source": "HealthKit",
      "device": "Apple Watch"
    }
  }
}
```

**Required Fields:**
- `user_id`: Valid UUID string
- `type`: Health data type (see supported types below)
- `value`: Numeric value

**Optional Fields:**
- `timestamp`: ISO 8601 date string (defaults to current time)
- `raw_data`: Additional metadata object

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Health data stored successfully",
  "data": {
    "variable_id": "ah_steps",
    "value": 8543,
    "unit": "steps",
    "date": "2025-01-23",
    "type": "step_count",
    "from_ios_app": true
  }
}
```

**Response (Error - 400/500):**
```json
{
  "error": "Error description",
  "details": "Additional error details",
  "supported_types": ["step_count", "heart_rate", ...]
}
```

### 2. Batch Sync Health Data

**Endpoint:** `POST /api/applehealth/sync`

**Description:** Processes multiple health data points in a single request.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "sync_mode": "batch",
  "data_points": [
    {
      "type": "step_count",
      "value": 8543,
      "timestamp": "2025-01-23T10:30:00Z",
      "raw_data": {
        "from_ios_app": true,
        "app_version": "1.0.0"
      }
    },
    {
      "type": "heart_rate",
      "value": 72,
      "timestamp": "2025-01-23T10:30:00Z",
      "raw_data": {
        "from_ios_app": true,
        "app_version": "1.0.0"
      }
    }
  ]
}
```

**Response (Success - 200):**
```json
{
  "user_id": "uuid-string",
  "sync_mode": "batch",
  "summary": {
    "total_processed": 2,
    "successful": 2,
    "failed": 0,
    "success_rate": "100.0%"
  },
  "results": [
    {
      "type": "step_count",
      "success": true,
      "data": { ... }
    },
    {
      "type": "heart_rate",
      "success": true,
      "data": { ... }
    }
  ],
  "updated_statistics": {
    "total_data_points": 150
  },
  "timestamp": "2025-01-23T10:30:00Z"
}
```

### 3. Get Sync Status

**Endpoint:** `POST /api/applehealth/sync`

**Description:** Retrieves current sync status and statistics.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "sync_mode": "status"
}
```

**Response (Success - 200):**
```json
{
  "user_id": "uuid-string",
  "sync_status": "idle",
  "statistics": {
    "total_data_points": 150,
    "variables_tracked": 5,
    "variable_breakdown": {
      "ah_steps": 45,
      "ah_heart_rate": 30,
      "ah_weight": 15,
      "ah_sleep_duration": 30,
      "ah_active_calories": 30
    },
    "last_sync": "2025-01-23T10:30:00Z"
  },
  "recent_data": [
    {
      "variable_id": "ah_steps",
      "value": 8543,
      "date": "2025-01-23",
      "created_at": "2025-01-23T10:30:00Z",
      "raw": { ... }
    }
  ]
}
```

### 4. Check Integration Status

**Endpoint:** `GET /api/applehealth/status?user_id=uuid-string`

**Description:** Checks if user has Apple Health integration enabled.

**Response (Success - 200):**
```json
{
  "connected": true,
  "dataPoints": 150,
  "hasRealData": true,
  "lastDataReceived": "2025-01-23T10:30:00Z",
  "connection": {
    "connectedAt": "2025-01-20T10:00:00Z",
    "expiresAt": "2026-01-20T10:00:00Z"
  },
  "iosApp": {
    "endpointUrl": "https://your-domain.com/api/applehealth/receive",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "bodyFormat": { ... },
    "supportedTypes": [ ... ]
  }
}
```

### 5. Test Integration

**Endpoint:** `POST /api/applehealth/test`

**Description:** Tests the integration with sample or validation data.

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "test_type": "sample"
}
```

**Test Types:**
- `sample`: Generates realistic sample data
- `validation`: Tests error handling with invalid data

**Response (Success - 200):**
```json
{
  "user_id": "uuid-string",
  "test_type": "sample",
  "results": [
    {
      "test_item": { ... },
      "status": 200,
      "response": { ... },
      "success": true
    }
  ],
  "summary": {
    "total_tests": 4,
    "successful_tests": 4,
    "failed_tests": 0,
    "current_data_points": 154,
    "recent_data": [ ... ]
  },
  "api_info": {
    "endpoint": "https://your-domain.com/api/applehealth/receive",
    "method": "POST",
    "content_type": "application/json"
  }
}
```

## 📊 Supported Health Data Types

| HealthKit Type | Variable ID | Unit | Min | Max | Description |
|----------------|-------------|------|-----|-----|-------------|
| `step_count` | `ah_steps` | steps | 0 | 50,000 | Daily step count |
| `heart_rate` | `ah_heart_rate` | bpm | 30 | 220 | Heart rate |
| `body_mass` | `ah_weight` | kg | 30 | 300 | Body weight |
| `active_energy_burned` | `ah_active_calories` | kcal | 0 | 5,000 | Active calories |
| `sleep_analysis` | `ah_sleep_duration` | hours | 0 | 24 | Sleep duration |
| `resting_heart_rate` | `ah_resting_heart_rate` | bpm | 30 | 150 | Resting heart rate |
| `body_fat_percentage` | `ah_body_fat_percentage` | % | 5 | 50 | Body fat percentage |
| `blood_pressure_systolic` | `ah_blood_pressure_systolic` | mmHg | 70 | 200 | Systolic blood pressure |
| `blood_pressure_diastolic` | `ah_blood_pressure_diastolic` | mmHg | 40 | 130 | Diastolic blood pressure |
| `vo2_max` | `ah_vo2_max` | ml/kg/min | 20 | 80 | VO2 max |

## 🔧 Error Handling

### Common Error Codes

**400 Bad Request:**
- Missing required fields
- Invalid UUID format
- Unsupported health data type
- Value outside valid range
- Invalid numeric value

**404 Not Found:**
- User not found

**500 Internal Server Error:**
- Database connection issues
- Server processing errors

### Error Response Format

```json
{
  "error": "Error description",
  "details": "Additional error details",
  "code": "ERROR_CODE",
  "supported_types": ["step_count", "heart_rate", ...],
  "valid_range": {
    "min": 0,
    "max": 50000
  },
  "unit": "steps"
}
```

## 📱 iOS App Integration Example

### Swift Implementation

```swift
import HealthKit
import Foundation

class HealthDataSync {
    private let baseUrl = "https://your-domain.com"
    private let userId = "your-user-uuid"
    
    func syncHealthData() async {
        let healthStore = HKHealthStore()
        
        // Request authorization
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!
        ]
        
        do {
            try await healthStore.requestAuthorization(toShare: nil, read: typesToRead)
            
            // Fetch and sync data
            await syncSteps()
            await syncHeartRate()
            
        } catch {
            print("HealthKit authorization failed: \(error)")
        }
    }
    
    private func syncSteps() async {
        let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
        let predicate = HKQuery.predicateForSamples(withStart: Date().startOfDay, end: Date().endOfDay)
        
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            guard let result = result, let sum = result.sumQuantity() else { return }
            
            let steps = sum.doubleValue(for: .count())
            
            // Send to API
            Task {
                await self.sendHealthData(type: "step_count", value: steps)
            }
        }
        
        healthStore.execute(query)
    }
    
    private func sendHealthData(type: String, value: Double) async {
        let url = URL(string: "\(baseUrl)/api/applehealth/receive")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "user_id": userId,
            "type": type,
            "value": value,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "raw_data": [
                "from_ios_app": true,
                "app_version": "1.0.0",
                "device_info": UIDevice.current.model,
                "health_kit_metadata": [
                    "source": "HealthKit",
                    "device": "iPhone"
                ]
            ]
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 {
                    print("✅ \(type): \(value) synced successfully")
                } else {
                    print("❌ \(type): Server error \(httpResponse.statusCode)")
                }
            }
        } catch {
            print("❌ \(type): Network error \(error)")
        }
    }
}
```

## 🧪 Testing

### Test the API

```bash
# Test with sample data
curl -X POST http://localhost:3001/api/applehealth/test \
  -H "Content-Type: application/json" \
  -d '{"user_id": "your-user-uuid", "test_type": "sample"}'

# Test validation
curl -X POST http://localhost:3001/api/applehealth/test \
  -H "Content-Type: application/json" \
  -d '{"user_id": "your-user-uuid", "test_type": "validation"}'

# Send real data
curl -X POST http://localhost:3001/api/applehealth/receive \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-uuid",
    "type": "step_count",
    "value": 8543,
    "timestamp": "2025-01-23T10:30:00Z",
    "raw_data": {
      "from_ios_app": true,
      "app_version": "1.0.0"
    }
  }'
```

## 🚀 Production Deployment

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NEXTAUTH_URL=https://your-domain.com
VERCEL_URL=https://your-domain.com
```

### Security Considerations

1. **Rate Limiting**: Implement rate limiting on `/api/applehealth/receive`
2. **Authentication**: Consider adding API keys for production
3. **HTTPS**: Always use HTTPS in production
4. **Validation**: All input is validated server-side
5. **Logging**: Monitor API usage and errors

### Performance Optimization

1. **Batch Processing**: Use `/api/applehealth/sync` for multiple data points
2. **Caching**: Cache user validation results
3. **Database Indexes**: Ensure proper indexing on `user_id` and `date`
4. **Connection Pooling**: Configure database connection pooling

## 📈 Monitoring

### Key Metrics

- API response times
- Error rates by endpoint
- Data points received per day
- User engagement (active users)
- iOS app vs web app usage

### Logging

All endpoints log important events:
- Data received and processed
- Validation errors
- Database operations
- Sync statistics

## 🔄 Updates and Maintenance

### Database Schema

The Apple Health integration uses these tables:
- `apple_health_tokens`: User connection tokens
- `apple_health_variable_data_points`: Health data storage
- `data_points`: Universal data storage
- `variables`: Variable definitions

### Migration Notes

When updating the schema:
1. Test with sample data first
2. Validate existing data integrity
3. Update iOS app if needed
4. Monitor for errors after deployment

---

**Ready to integrate your iOS app with Apple Health!** 🎉

For support, check the logs or contact the development team. 