# Supabase OAuth Authentication Setup Guide

## Manual Steps Required

This guide covers the manual steps you need to complete in the Supabase Dashboard before the authentication system will work.

### 1. Configure Google OAuth Provider

1. **Go to Supabase Dashboard:**
   - Navigate to your project
   - Go to **Authentication** → **Providers**
   - Find **Google** in the list

2. **Enable Google Provider:**
   - Toggle the **Enable Google provider** switch to ON

3. **Get Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://[your-project-ref].supabase.co/auth/v1/callback`
     - Replace `[your-project-ref]` with your actual Supabase project reference
     - You can find your project ref in Supabase Dashboard → Settings → API
   - Copy the **Client ID** and **Client Secret**

4. **Add Credentials to Supabase:**
   - In Supabase Dashboard → Authentication → Providers → Google
   - Paste the **Client ID** and **Client Secret** from Google Cloud Console
   - Save the configuration

### 2. Get Supabase API Keys

1. **Go to Supabase Dashboard:**
   - Navigate to **Settings** → **API**

2. **Copy the following:**
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

### 3. Configure Environment Variables

Add these to your environment files:

**Backend `.env` file:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Frontend `.env.local` file:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Set Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- Add `http://localhost:3000/auth/callback` for local development
- Add your production URL (e.g., `https://yourdomain.com/auth/callback`) for production

## Testing

After completing these steps and running the application:
1. Click the "Sign in with Google" button
2. You should be redirected to Google for authentication
3. After authorizing, you'll be redirected back to the app
4. You should be logged in and see your user profile

## Troubleshooting

- **"Redirect URI mismatch"**: Make sure the redirect URI in Google Cloud Console exactly matches `https://[your-project-ref].supabase.co/auth/v1/callback`
- **"Invalid client"**: Verify your Google OAuth Client ID and Secret are correct in Supabase
- **"Token verification failed"**: Check that your Supabase URL and keys are correct in environment variables




