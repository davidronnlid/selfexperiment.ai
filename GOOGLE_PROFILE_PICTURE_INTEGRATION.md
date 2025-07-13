# Google Profile Picture Integration

## Overview

This document describes the implementation of Google profile picture integration, which automatically displays Google profile pictures for users who sign in with Google OAuth.

## Changes Made

### 1. Database Trigger Update (`database/create_profile_trigger.sql`)

Updated the `handle_new_user()` function to properly extract Google profile pictures from OAuth metadata:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, date_of_birth, avatar_url)
  VALUES (
    NEW.id,
    NULL,
    NULL,
    NULL,
    COALESCE(
      NEW.raw_user_meta_data->>'picture', -- Google OAuth uses 'picture'
      NEW.raw_user_meta_data->>'avatar_url' -- Other OAuth providers might use 'avatar_url'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key Change**: Uses `COALESCE` to check both `picture` (Google's field) and `avatar_url` (generic OAuth field).

### 2. Complete Profile Page (`src/pages/complete-profile.tsx`)

Enhanced the profile completion page to:

- Automatically populate Google profile pictures
- Pre-fill user's name from Google account
- Display the profile picture prominently
- Show helpful text about automatic population

**Key Features**:

- Auto-populates `form.avatar_url` with `user.user_metadata?.picture`
- Pre-fills name from `user.user_metadata?.name`
- Shows a large, styled avatar at the top when available
- Provides user-friendly helper text

### 3. Avatar Uploader Component (`src/components/AvatarUploader.tsx`)

Updated to display Google profile pictures as fallback when no custom avatar is uploaded:

**Key Changes**:

- Added `useUser` hook to access user metadata
- Extracts Google profile pic with `user?.user_metadata?.picture`
- Uses Google picture as fallback when no custom avatar exists
- Shows source indicator ("Custom upload" vs "From Google account")

### 4. Header Component (Already Working)

The header component already had proper OAuth profile picture support:

```typescript
const oauthProfilePic =
  user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
```

## How It Works

### For New Users (Google Sign-in)

1. User signs in with Google OAuth
2. Database trigger automatically creates profile with Google profile picture
3. User completes profile with pre-populated name and avatar
4. Profile picture appears throughout the app

### For Existing Users

1. The database trigger update handles new sign-ins
2. The AvatarUploader component displays Google pictures as fallback
3. Users can still upload custom avatars to override Google pictures

## User Experience

### Sign-in Flow

1. User clicks "Continue with Google"
2. Google OAuth provides profile data including picture
3. Profile creation page shows Google picture and pre-filled name
4. User only needs to enter username to complete profile

### Profile Management

- Google profile picture appears automatically
- Users can upload custom pictures to override
- Clear indication of picture source ("From Google account" vs "Custom upload")
- Seamless fallback to Google picture if custom picture is removed

## Technical Details

### OAuth Data Structure

Google OAuth provides user metadata in this format:

```json
{
  "user_metadata": {
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/...",
    "email": "john@example.com"
  }
}
```

### Database Storage

- Profile pictures are stored as URLs in the `profiles.avatar_url` column
- Google pictures are stored directly as external URLs
- Custom uploads are stored as Supabase storage paths

### Priority Order

1. **Custom uploaded avatar** (highest priority)
2. **Google OAuth profile picture** (fallback)
3. **Default user icon** (final fallback)

## Testing

To test the integration:

1. Sign out of the application
2. Sign in with Google OAuth
3. Verify profile picture appears on profile completion page
4. Complete profile and check that picture appears in header
5. Visit profile page to confirm picture is displayed
6. Upload custom picture to test override functionality

## Benefits

- **Seamless User Experience**: Users see their familiar Google profile picture immediately
- **Reduced Friction**: No need to manually upload profile pictures
- **Professional Appearance**: Apps look more polished with actual profile pictures
- **Fallback Support**: Works with custom uploads and other OAuth providers
- **Automatic Updates**: New Google users get pictures automatically

## Future Enhancements

Potential improvements:

- Support for other OAuth providers (GitHub, Facebook, etc.)
- Automatic sync of Google picture updates
- Profile picture caching for better performance
- Image resizing/optimization for custom uploads
