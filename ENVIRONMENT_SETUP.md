# Environment Setup Guide

## 🚀 Quick Setup for Local Development

Create a `.env.local` file in the root directory with these variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:your-email@domain.com

# Withings Integration (Optional)
WITHINGS_ClientID=your_withings_client_id
WITHINGS_Secret=your_withings_client_secret

# Oura Integration (Optional)
OURA_CLIENT_ID=your_oura_client_id
OURA_CLIENT_SECRET=your_oura_client_secret
personal_access_two_oura=your_oura_personal_access_token

# OpenAI API Keys (Optional)
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_FIRST_KEY=your_first_openai_api_key
```

## 📝 Where to Find These Values

### Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the URL and anon key

### VAPID Keys

Generate new keys by running:

```bash
node scripts/generate-vapid-keys.js
```

## ⚠️ Important Notes

- **Never commit `.env.local`** to git (it's already in `.gitignore`)
- **Required for basic functionality**: Supabase URL and anon key
- **Optional integrations**: Other services can be added later
- **Production**: Set these as environment variables in your hosting platform

## 🔧 Troubleshooting

If you see "Missing Supabase configuration" error:

1. Ensure `.env.local` exists in the root directory
2. Check that variable names match exactly (including `NEXT_PUBLIC_` prefix)
3. Restart your development server after adding environment variables

## 📚 More Information

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [VAPID Keys for Web Push](https://web.dev/push-notifications-web-push-protocol/)
