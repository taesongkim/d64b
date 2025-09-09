import { supabase } from '@/services/supabase';

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase connection error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connected successfully');
    console.log('Project URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }
}

export async function debugSupabaseConnection() {
  console.log('🔍 Debugging Supabase Connection...');
  
  // Check environment variables
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('URL:', url ? '✅ Set' : '❌ Missing');
  console.log('Key:', key ? '✅ Set' : '❌ Missing');
  console.log('URL format:', url?.includes('.supabase.co') ? '✅ Valid' : '❌ Invalid');
  console.log('Key length:', key?.length || 'N/A');
  
  if (!url || !key) {
    console.error('❌ Environment variables missing');
    console.error('Make sure you have created .env.local with your Supabase credentials');
    return false;
  }
  
  if (url.includes('your-project-id') || key.includes('your-anon-key')) {
    console.error('❌ Please replace placeholder values in .env.local with actual Supabase credentials');
    return false;
  }
  
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Connection error:', error.message);
      return false;
    } else {
      console.log('✅ Supabase client initialized successfully');
    }
    
    // Test database access (optional)
    const { error: dbError } = await supabase.from('profiles').select('count').limit(1);
    
    if (dbError && !dbError.message.includes('relation "public.profiles" does not exist')) {
      console.warn('⚠️ Database access issue:', dbError.message);
    } else if (dbError?.message.includes('relation "public.profiles" does not exist')) {
      console.log('ℹ️ Database tables not yet created (run migrations first)');
    } else {
      console.log('✅ Database access confirmed');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}