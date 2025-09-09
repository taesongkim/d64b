# Supabase Environment Setup Guide

## Quick Setup Steps

### 1. Configure Environment Variables

1. **You already have `.env.local` file created**
2. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings → API
   - Copy your **Project URL** and **anon key**

3. **Update `.env.local` with your actual values:**
   ```bash
   # Replace these placeholder values with your actual Supabase credentials
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 2. Restart Development Server

After updating `.env.local`, restart your Expo server:

```bash
npx expo start --clear
```

### 3. Test Connection

**Option A: Visual Connection Test (Recommended)**

Add the connection test component to your main screen:

```typescript
// Add to any screen, e.g., DashboardScreen.tsx
import { useState } from 'react';
import SupabaseConnectionTest from '@/components/SupabaseConnectionTest';

export default function DashboardScreen(): React.JSX.Element {
  const [showConnectionTest, setShowConnectionTest] = useState(true);

  return (
    <View className="flex-1 justify-center items-center p-5 bg-gray-50">
      {showConnectionTest && (
        <SupabaseConnectionTest onHide={() => setShowConnectionTest(false)} />
      )}
      
      <Text className="text-3xl font-bold mb-2 text-gray-900">Dashboard</Text>
      <Text className="text-lg text-gray-600 mb-5 text-center">
        Habit tracking will go here
      </Text>
    </View>
  );
}
```

**Option B: Console-Only Test**

Add this to your `App.tsx` temporarily:

```typescript
import { useEffect } from 'react';
import { debugSupabaseConnection } from '@/utils/testSupabase';

export default function App(): React.JSX.Element {
  useEffect(() => {
    // Remove this after confirming connection works
    debugSupabaseConnection();
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
```

### 4. Check Console Output

Look for these messages in your development console:
- ✅ **Success**: "Supabase client initialized successfully"
- ❌ **Error**: Follow the specific error message to fix the issue

## Common Issues

### "Environment variables missing"
- Make sure `.env.local` is in the project root (same level as `package.json`)
- Ensure variable names start with `EXPO_PUBLIC_`
- No quotes around values
- Restart Expo server after changes

### "Please replace placeholder values"
- You need to replace `your-project-id` and `your-anon-key-here` with actual values from your Supabase dashboard

### Connection errors
- Double-check your Supabase project is active
- Verify the URL format: `https://projectid.supabase.co`
- Ensure anon key is complete (starts with `eyJ...`)

## Security Notes

- ✅ **Safe to use in client**: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- ❌ **Never use in client**: `SUPABASE_SERVICE_ROLE_KEY`
- The `.env.local` file is already added to `.gitignore`

## Next Steps

Once connection is confirmed:
1. Remove the test code from `App.tsx`
2. Your app is ready to use Supabase authentication and database features
3. Run database migrations if needed: `supabase db push`