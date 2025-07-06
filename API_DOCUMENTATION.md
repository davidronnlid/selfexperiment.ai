# SelfExperiment.AI - Complete API Documentation

## Table of Contents
1. [Overview](#overview)
2. [React Components](#react-components)
3. [API Endpoints](#api-endpoints)
4. [Utility Functions](#utility-functions)
5. [Custom Hooks](#custom-hooks)
6. [Database Schema](#database-schema)
7. [Authentication](#authentication)
8. [Privacy & Sharing System](#privacy--sharing-system)
9. [Usage Examples](#usage-examples)

## Overview

SelfExperiment.AI is a comprehensive self-tracking application built with Next.js, TypeScript, and Supabase. It allows users to log health and wellness variables, integrate with wearable devices (Oura), build experiments, and share data with the community while maintaining privacy controls.

### Tech Stack
- **Frontend**: Next.js 15.3.4, React 19.1.0, TypeScript 5
- **UI Components**: Material-UI 7.2.0, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth)
- **External APIs**: OpenAI GPT-4, Oura Ring API
- **Charts**: Chart.js 4.5.0, react-chartjs-2 5.3.0

## React Components

### Header Component
Main navigation header with authentication and user profile management.

**File**: `src/components/header.tsx`

```typescript
export default function Header(): JSX.Element
```

**Features**:
- Responsive navigation with branded logo
- User authentication state management
- Profile picture display with OAuth integration
- Dropdown menu for profile/logout
- Dynamic navigation links based on auth state

**Usage Example**:
```tsx
import Header from '@/components/header';

function Layout({ children }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
```

### AnalyzePrivacySection Component
Comprehensive privacy and data sharing management interface.

**File**: `src/components/AnalyzePrivacySection.tsx`

```typescript
export default function AnalyzePrivacySection(): JSX.Element
```

**Features**:
- Tabbed interface for different privacy settings
- Variable-level sharing controls
- Individual log privacy management
- Categorized variable organization
- Real-time privacy setting updates

**Props**: None (uses global user context)

**Usage Example**:
```tsx
import AnalyzePrivacySection from '@/components/AnalyzePrivacySection';

function PrivacyPage() {
  return (
    <div>
      <h1>Privacy Settings</h1>
      <AnalyzePrivacySection />
    </div>
  );
}
```

### AvatarUploader Component
File upload component for user profile pictures with Supabase storage integration.

**File**: `src/components/AvatarUploader.tsx`

```typescript
interface Props {
  userId: string;
  avatarUrl: string | null;
  onUpload: (url: string) => void;
}

export default function AvatarUploader({ userId, avatarUrl, onUpload }: Props): JSX.Element
```

**Props**:
- `userId`: Unique user identifier
- `avatarUrl`: Current avatar URL path
- `onUpload`: Callback function when upload completes

**Usage Example**:
```tsx
import AvatarUploader from '@/components/AvatarUploader';

function ProfilePage() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  return (
    <AvatarUploader 
      userId={user.id}
      avatarUrl={avatarUrl}
      onUpload={(url) => setAvatarUrl(url)}
    />
  );
}
```

### ValidatedInput Component
Form input with built-in validation based on LOG_LABELS constraints.

**File**: `src/components/ValidatedInput.tsx`

```typescript
interface ValidatedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
}

export default function ValidatedInput(props: ValidatedInputProps): JSX.Element
```

**Props**:
- `label`: Variable name (must match LOG_LABELS)
- `value`: Current input value
- `onChange`: Value change callback
- `onValidationChange`: Validation state callback
- `disabled`: Whether input is disabled
- `className`: Additional CSS classes
- `showValidation`: Whether to show validation indicators

**Usage Example**:
```tsx
import ValidatedInput from '@/components/ValidatedInput';

function LogForm() {
  const [mood, setMood] = useState('');
  const [isValid, setIsValid] = useState(false);

  return (
    <ValidatedInput
      label="Mood"
      value={mood}
      onChange={setMood}
      onValidationChange={setIsValid}
      showValidation={true}
    />
  );
}
```

### DropdownInput Component
Dropdown input with validation for predefined options.

**File**: `src/components/DropdownInput.tsx`

```typescript
interface DropdownInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
}

export default function DropdownInput(props: DropdownInputProps): JSX.Element
```

**Usage Example**:
```tsx
import DropdownInput from '@/components/DropdownInput';

function MenstrualPhaseInput() {
  const [phase, setPhase] = useState('');

  return (
    <DropdownInput
      label="Menstrual Phase"
      value={phase}
      onChange={setPhase}
    />
  );
}
```

### LogPrivacyManager Component
Component for managing individual log privacy settings.

**File**: `src/components/LogPrivacyManager.tsx`

```typescript
interface LogPrivacyManagerProps {
  maxLogs?: number;
  showFilters?: boolean;
}

export default function LogPrivacyManager(props: LogPrivacyManagerProps): JSX.Element
```

### VariableConstraintManager Component
Component for managing variable constraints and validation rules.

**File**: `src/components/VariableConstraintManager.tsx`

```typescript
export default function VariableConstraintManager(): JSX.Element
```

### VariableSharingManager Component
Component for managing variable sharing settings.

**File**: `src/components/VariableSharingManager.tsx`

```typescript
export default function VariableSharingManager(): JSX.Element
```

### Tooltip Component
Simple tooltip component for displaying additional information.

**File**: `src/components/Tooltip.tsx`

```typescript
interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps): JSX.Element
```

## API Endpoints

### Privacy Settings API
Comprehensive API for managing user privacy settings.

**File**: `src/pages/api/privacy-settings.ts`

**Endpoint**: `/api/privacy-settings`

**Methods**: GET, POST, PUT, DELETE

**Query Parameters**:
- `type`: Settings type (`variable-settings` | `log-settings` | `profile`)
- `id`: Record ID (for PUT/DELETE operations)

**Request Body Examples**:

```typescript
// Variable sharing setting
{
  "variable_name": "Mood",
  "is_shared": true,
  "variable_type": "predefined",
  "category": "Mental & Emotional"
}

// Log privacy setting
{
  "log_id": 123,
  "log_type": "daily_log",
  "is_hidden": false
}

// Privacy profile
{
  "profile_visibility": "public",
  "allow_follow_requests": true,
  "show_username_in_shared_data": false,
  "anonymize_shared_data": true
}
```

**Usage Examples**:

```javascript
// Get variable sharing settings
const response = await fetch('/api/privacy-settings?type=variable-settings');
const { data } = await response.json();

// Update variable sharing
await fetch('/api/privacy-settings?type=variable-settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variable_name: 'Sleep Quality',
    is_shared: true,
    variable_type: 'predefined'
  })
});
```

### Log Validation API
Validates log entries against defined constraints.

**File**: `src/pages/api/validate-log.ts`

**Endpoint**: `/api/validate-log`

**Method**: POST

**Request Body**:
```typescript
{
  "label": string,
  "value": string | number
}
```

**Response**:
```typescript
{
  "isValid": boolean,
  "error": string | null,
  "label": string,
  "value": string
}
```

**Usage Example**:
```javascript
const validation = await fetch('/api/validate-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    label: 'Sleep Quality',
    value: '8'
  })
});
const result = await validation.json();
```

### GPT Emoji API
Generates appropriate emojis for custom variables using OpenAI GPT.

**File**: `src/pages/api/gpt-emoji.ts`

**Endpoint**: `/api/gpt-emoji`

**Method**: POST

**Request Body**:
```typescript
{
  "variable": string
}
```

**Response**:
```typescript
{
  "emoji": string
}
```

**Usage Example**:
```javascript
const response = await fetch('/api/gpt-emoji', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ variable: 'Water Intake' })
});
const { emoji } = await response.json(); // Returns "💧"
```

### Oura Integration APIs

#### Oura OAuth Callback
Handles OAuth callback from Oura Ring integration.

**File**: `src/pages/api/oura/callback.ts`

**Endpoint**: `/api/oura/callback`

**Method**: GET

**Query Parameters**:
- `code`: OAuth authorization code
- `state`: User ID for token association

#### Oura Data Fetch
Fetches and stores Oura Ring data.

**File**: `src/pages/api/oura/fetch.ts`

**Endpoint**: `/api/oura/fetch`

**Method**: GET

**Features**:
- Fetches sleep, activity, and readiness data
- Handles token refresh
- Stores data in structured format

### Hello World API
Simple test endpoint.

**File**: `src/pages/api/hello.ts`

**Endpoint**: `/api/hello`

**Method**: GET

**Response**:
```typescript
{
  "name": "John Doe"
}
```

## Utility Functions

### Supabase Client
Database and authentication client.

**File**: `src/utils/supaBase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Privacy API Utilities
Functions for managing privacy settings.

**File**: `src/utils/privacyApi.ts`

```typescript
// Fetch variable sharing settings
export async function fetchVariableSharingSettings(userId: string): Promise<any>

// Upsert variable sharing setting
export async function upsertVariableSharingSetting(params: {
  userId: string;
  variableName: string;
  isShared: boolean;
  variableType: string;
  category?: string;
}): Promise<any>
```

### Privacy Utilities
Comprehensive privacy and data access functions.

**File**: `src/utils/privacyUtils.ts`

```typescript
// Get shared logs for a user
export async function getSharedLogs(
  targetUserId: string,
  viewerUserId?: string
): Promise<SharedLog[]>

// Get shared variables for a user
export async function getSharedVariables(userId: string): Promise<string[]>

// Check if a user can view another user's data
export async function canViewUserData(
  targetUserId: string,
  viewerUserId?: string
): Promise<boolean>

// Get user's privacy profile
export async function getUserPrivacyProfile(
  userId: string
): Promise<UserPrivacyProfile | null>

// Update user's privacy profile
export async function updateUserPrivacyProfile(
  userId: string,
  updates: Partial<UserPrivacyProfile>
): Promise<boolean>

// Follow/unfollow users
export async function followUser(
  followerId: string,
  followingId: string
): Promise<boolean>

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<boolean>
```

**Interface Definitions**:
```typescript
interface SharedLog {
  log_id: number;
  variable_name: string;
  value: string;
  date: string;
  log_type: "daily_log" | "oura_data";
  user_id?: string;
  username?: string;
}

interface UserPrivacyProfile {
  profile_visibility: "public" | "private" | "followers_only";
  allow_follow_requests: boolean;
  show_username_in_shared_data: boolean;
  anonymize_shared_data: boolean;
}
```

### Log Labels and Validation
Comprehensive variable definitions and validation system.

**File**: `src/utils/logLabels.ts`

```typescript
// Variable definition interface
interface LogLabel {
  label: string;
  type: "number" | "scale" | "text" | "time" | "yesno" | "dropdown";
  description: string;
  options?: string[];
  icon?: string;
  constraints?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    required?: boolean;
    unit?: string;
    scaleMin?: number;
    scaleMax?: number;
  };
}

// Predefined variables array
export const LOG_LABELS: LogLabel[]

// Validation function
export const validateValue = (
  label: string,
  value: string
): { isValid: boolean; error?: string }

// Get input properties for form fields
export const getInputProps = (label: string): InputProps
```

**Example Variables**:
- **Mood**: Scale 1-10, Mental & Emotional category
- **Sleep Quality**: Scale 1-10, Sleep & Recovery category
- **Caffeine (mg)**: Number 0-1000, Substances & Diet category
- **Exercise**: Text field, Physical Health category
- **Menstrual Phase**: Dropdown, Physical Health category

## Custom Hooks

### useVariableSharingSettings
Hook for managing variable sharing settings.

**File**: `src/hooks/useVariableSharingSettings.ts`

```typescript
export interface VariableSharingSetting {
  variable_name: string;
  is_shared: boolean;
  variable_type: string;
  category?: string;
}

export function useVariableSharingSettings(userId: string): {
  settings: VariableSharingSetting[];
  loading: boolean;
  load: () => Promise<void>;
  update: (
    variableName: string,
    isShared: boolean,
    variableType: string,
    category?: string
  ) => Promise<void>;
}
```

**Usage Example**:
```typescript
import { useVariableSharingSettings } from '@/hooks/useVariableSharingSettings';

function PrivacySettings() {
  const { settings, loading, load, update } = useVariableSharingSettings(user.id);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleSharing = async (variableName: string, isShared: boolean) => {
    await update(variableName, isShared, 'predefined');
  };

  return (
    <div>
      {settings.map(setting => (
        <div key={setting.variable_name}>
          <label>{setting.variable_name}</label>
          <input
            type="checkbox"
            checked={setting.is_shared}
            onChange={(e) => handleToggleSharing(setting.variable_name, e.target.checked)}
          />
        </div>
      ))}
    </div>
  );
}
```

## Database Schema

### Core Tables

#### variable_sharing_settings
Controls which variable types a user wants to share.

```sql
CREATE TABLE variable_sharing_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_name TEXT NOT NULL,
    is_shared BOOLEAN DEFAULT false,
    variable_type TEXT NOT NULL CHECK (variable_type IN ('predefined', 'custom', 'oura')),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, variable_name)
);
```

#### log_privacy_settings
Controls which specific logged values are hidden.

```sql
CREATE TABLE log_privacy_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_id INTEGER NOT NULL,
    log_type TEXT NOT NULL CHECK (log_type IN ('daily_log', 'oura_data')),
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, log_id, log_type)
);
```

#### user_privacy_profile
User's overall privacy preferences.

```sql
CREATE TABLE user_privacy_profile (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'followers_only')),
    allow_follow_requests BOOLEAN DEFAULT true,
    show_username_in_shared_data BOOLEAN DEFAULT false,
    anonymize_shared_data BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### user_follows
User following relationships.

```sql
CREATE TABLE user_follows (
    id SERIAL PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);
```

### Database Functions

#### get_shared_variables
Returns shared variables for a user.

```sql
CREATE OR REPLACE FUNCTION get_shared_variables(target_user_id UUID)
RETURNS TABLE(variable_name TEXT, variable_type TEXT, category TEXT)
```

#### get_shared_logs
Returns shared logs respecting privacy settings.

```sql
CREATE OR REPLACE FUNCTION get_shared_logs(target_user_id UUID, viewer_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    log_id INTEGER,
    variable_name TEXT,
    value TEXT,
    date TIMESTAMP WITH TIME ZONE,
    log_type TEXT
)
```

## Authentication

The application uses Supabase Auth for authentication with the following features:

### User Context
Global user state management.

**File**: `src/pages/_app.tsx`

```typescript
export function useUser(): {
  user: User | null;
  loading: boolean;
}
```

### Auth Patterns
```typescript
// Check if user is authenticated
const { user, loading } = useUser();

// Redirect to login if not authenticated
if (!loading && !user) {
  router.push('/auth');
}

// Get user from API route
const { data: { user }, error } = await supabase.auth.getUser();
```

## Privacy & Sharing System

### Privacy Levels
1. **Private**: Data not visible to others
2. **Public**: Data visible to all users
3. **Followers Only**: Data visible only to followers

### Sharing Controls
- **Variable-level**: Control which variable types are shared
- **Log-level**: Hide specific logged values
- **Profile-level**: Overall visibility settings

### Data Access Flow
1. Check user's privacy profile
2. Verify variable sharing settings
3. Check individual log privacy settings
4. Apply appropriate filters to results

## Usage Examples

### Complete Component Example
```tsx
import React, { useState, useEffect } from 'react';
import { useUser } from '@/pages/_app';
import ValidatedInput from '@/components/ValidatedInput';
import { validateValue } from '@/utils/logLabels';

function DailyLogForm() {
  const { user } = useUser();
  const [logs, setLogs] = useState<{[key: string]: string}>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleLogChange = (label: string, value: string) => {
    setLogs(prev => ({ ...prev, [label]: value }));
    
    // Validate input
    const validation = validateValue(label, value);
    setErrors(prev => ({
      ...prev,
      [label]: validation.error || ''
    }));
  };

  const handleSubmit = async () => {
    const validLogs = Object.entries(logs).filter(([label, value]) => {
      const validation = validateValue(label, value);
      return validation.isValid;
    });

    // Submit to API
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        logs: validLogs
      })
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <ValidatedInput
        label="Mood"
        value={logs.Mood || ''}
        onChange={(value) => handleLogChange('Mood', value)}
        showValidation={true}
      />
      
      <ValidatedInput
        label="Sleep Quality"
        value={logs['Sleep Quality'] || ''}
        onChange={(value) => handleLogChange('Sleep Quality', value)}
        showValidation={true}
      />
      
      <button type="submit">Submit Logs</button>
    </form>
  );
}
```

### Privacy Settings Integration
```tsx
import { useVariableSharingSettings } from '@/hooks/useVariableSharingSettings';
import { getSharedLogs } from '@/utils/privacyUtils';

function CommunityDataView() {
  const { user } = useUser();
  const { settings } = useVariableSharingSettings(user.id);
  const [sharedLogs, setSharedLogs] = useState([]);

  useEffect(() => {
    const loadSharedData = async () => {
      const logs = await getSharedLogs(user.id);
      setSharedLogs(logs);
    };
    loadSharedData();
  }, [user.id]);

  return (
    <div>
      <h2>My Shared Data</h2>
      {sharedLogs.map(log => (
        <div key={log.log_id}>
          <strong>{log.variable_name}:</strong> {log.value}
          <small>{log.date}</small>
        </div>
      ))}
    </div>
  );
}
```

### API Integration Example
```typescript
// Complete API integration example
class PrivacyManager {
  static async updateVariableSharing(
    variableName: string,
    isShared: boolean,
    category?: string
  ) {
    const response = await fetch('/api/privacy-settings?type=variable-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variable_name: variableName,
        is_shared: isShared,
        variable_type: 'predefined',
        category
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update privacy settings');
    }
    
    return response.json();
  }

  static async hideLog(logId: number, logType: 'daily_log' | 'oura_data') {
    const response = await fetch('/api/privacy-settings?type=log-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: logId,
        log_type: logType,
        is_hidden: true
      })
    });
    
    return response.json();
  }
}
```

## Error Handling

### API Error Responses
```typescript
// Standard error response format
{
  "error": string,
  "code"?: string,
  "details"?: any
}
```

### Component Error Handling
```tsx
function ErrorBoundary({ children }) {
  const [error, setError] = useState(null);
  
  if (error) {
    return <div>Something went wrong: {error.message}</div>;
  }
  
  return children;
}
```

## Contributing

### Adding New Variables
1. Add to `LOG_LABELS` array in `src/utils/logLabels.ts`
2. Include proper validation constraints
3. Add appropriate icon and description
4. Update category groupings if needed

### Adding New Privacy Controls
1. Update database schema with new tables/columns
2. Add API endpoints in `src/pages/api/privacy-settings.ts`
3. Update utility functions in `src/utils/privacyUtils.ts`
4. Create or update React components

### Testing
```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

This documentation covers all public APIs, components, and functions in the SelfExperiment.AI application. For additional details on specific implementations, refer to the individual source files mentioned throughout this documentation.