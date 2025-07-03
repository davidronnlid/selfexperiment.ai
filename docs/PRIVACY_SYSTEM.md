# Privacy & Sharing System

## Overview

The privacy and sharing system provides users with granular control over what data they share with other users in the application. It consists of multiple layers of privacy controls:

1. **Variable-level sharing** - Control which variable types are shared
2. **Individual log privacy** - Hide specific logged values
3. **Profile visibility** - Control overall profile access
4. **User following** - Manage who can see your shared data

## Architecture

### Database Schema

The system uses four main tables:

#### `variable_sharing_settings`

Controls which variable types a user wants to share with others.

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

#### `log_privacy_settings`

Controls which specific logged values are hidden from others.

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

#### `user_follows`

Tracks follow relationships between users.

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

#### `user_privacy_profile`

Controls overall profile visibility and sharing preferences.

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

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- Users can only see and modify their own privacy settings
- Follow relationships are visible to both parties
- Profile visibility is enforced at the application level

### Database Functions

#### `get_shared_variables(target_user_id UUID)`

Returns all variables that a user has chosen to share.

#### `get_shared_logs(target_user_id UUID, viewer_user_id UUID DEFAULT NULL)`

Returns logs that should be visible to a viewer, respecting all privacy settings.

## Components

### Privacy Settings Page (`/privacy-settings`)

A dedicated page for managing all privacy settings with three main sections:

1. **Variable Sharing** - Checkboxes for each variable type
2. **Individual Log Privacy** - Table of recent logs with hide/show toggles
3. **Profile Settings** - Overall profile visibility controls

### Analyze Privacy Section (`AnalyzePrivacySection.tsx`)

Integrated into the Analyze section with tabs for:

- Variable sharing management
- Individual log privacy
- Profile settings

### Log Privacy Manager (`LogPrivacyManager.tsx`)

A reusable component for managing individual log privacy with:

- Search and filtering
- Bulk operations
- Visual indicators for hidden logs

## API Endpoints

### `/api/privacy-settings`

Handles all privacy-related operations:

- `GET /api/privacy-settings?type=variable-settings` - Get variable sharing settings
- `GET /api/privacy-settings?type=log-settings` - Get log privacy settings
- `GET /api/privacy-settings?type=profile` - Get profile privacy settings
- `POST /api/privacy-settings?type=variable-settings` - Create/update variable sharing
- `POST /api/privacy-settings?type=log-settings` - Create/update log privacy
- `POST /api/privacy-settings?type=profile` - Create/update profile settings

## Utility Functions

### `privacyUtils.ts`

Contains helper functions for privacy-aware data access:

- `getSharedLogs()` - Get logs respecting privacy settings
- `getSharedVariables()` - Get shared variable types
- `canViewUserData()` - Check if user can view another's data
- `followUser()` / `unfollowUser()` - Manage follow relationships
- `getFollowingUsers()` / `getFollowers()` - Get follow lists

## Privacy Logic

### Data Visibility Rules

1. **Own Data**: Users can always see all their own data
2. **Variable Sharing**: Only shared variable types are visible to others
3. **Log Privacy**: Individual logs can be hidden even if variable type is shared
4. **Profile Visibility**: Controls overall access to user's shared data
5. **Follow Relationships**: Some data may only be visible to followers

### Privacy Hierarchy

```
Profile Visibility (public/private/followers_only)
    ↓
Variable Sharing Settings (which types to share)
    ↓
Individual Log Privacy (hide specific values)
    ↓
Final Data Visibility
```

## Usage Examples

### Setting Variable Sharing

```typescript
// Share a variable type
await supabase.from("variable_sharing_settings").upsert({
  user_id: userId,
  variable_name: "Stress",
  is_shared: true,
  variable_type: "predefined",
});
```

### Hiding Individual Logs

```typescript
// Hide a specific log
await supabase.from("log_privacy_settings").upsert({
  user_id: userId,
  log_id: 123,
  log_type: "daily_log",
  is_hidden: true,
});
```

### Getting Shared Data

```typescript
// Get logs visible to a viewer
const sharedLogs = await getSharedLogs(targetUserId, viewerUserId);

// Check if user can view data
const canView = await canViewUserData(targetUserId, viewerUserId);
```

## Future Features

### Community Insights

- Aggregated, anonymized data for community insights
- Privacy-preserving analytics
- Trend analysis across shared data

### Advanced Privacy Controls

- Time-based sharing (share data for specific periods)
- Conditional sharing (share only when certain conditions are met)
- Data expiration (automatically hide old data)

### Social Features

- Follow/unfollow functionality
- Privacy-aware feed of shared data
- Community discovery based on shared interests

## Security Considerations

1. **Row Level Security**: All tables have RLS enabled
2. **Input Validation**: All inputs are validated and sanitized
3. **Permission Checks**: Multiple layers of permission checking
4. **Audit Trail**: All changes are timestamped
5. **Default Privacy**: New users start with private settings

## Testing

The system includes comprehensive tests in `src/test/privacyTest.ts`:

- Variable sharing functionality
- Log privacy settings
- User following system
- Privacy-aware data access
- API endpoint testing

Run tests with:

```bash
npm run test:privacy
```

## Migration Guide

To add the privacy system to an existing application:

1. Run the database schema migration
2. Add the privacy components to your pages
3. Update data access functions to use privacy-aware utilities
4. Test thoroughly with existing data

## Troubleshooting

### Common Issues

1. **Data not showing**: Check variable sharing settings
2. **Hidden logs still visible**: Verify log privacy settings
3. **Follow not working**: Check profile visibility settings
4. **API errors**: Ensure proper authentication

### Debug Tools

- Use the privacy settings page to verify settings
- Check browser console for privacy-related errors
- Use the test suite to validate functionality
