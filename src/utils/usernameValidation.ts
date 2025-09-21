/**
 * Username validation utility following strict rules:
 * - 3-20 characters
 * - Only ASCII alphanumeric (a-z, A-Z, 0-9) and underscores (_)
 * - Must start and end with letter or number (not underscore)
 * - No consecutive underscores
 * - Case-insensitive uniqueness
 */

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUsername?: string;
}

// Regex pattern: ^[a-zA-Z0-9][a-zA-Z0-9_]{1,18}[a-zA-Z0-9]$
// This ensures:
// - Starts with letter/number
// - Middle can be letter/number/underscore (1-18 chars for total 3-20)
// - Ends with letter/number
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_]{1,18}[a-zA-Z0-9]$/;

// For 3-character usernames (special case - no middle section)
const USERNAME_REGEX_SHORT = /^[a-zA-Z0-9]{3}$/;

export function validateUsername(username: string): UsernameValidationResult {
  // Strip whitespace
  const trimmed = username.trim();
  
  // Check length
  if (trimmed.length < 3) {
    return { isValid: false, error: "Username must be between 3 and 20 characters" };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, error: "Username must be between 3 and 20 characters" };
  }
  
  // Check for invalid characters (only allow a-z, A-Z, 0-9, _)
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { isValid: false, error: "Username can only contain letters, numbers, and underscores" };
  }
  
  // Check if starts with letter or number
  if (!/^[a-zA-Z0-9]/.test(trimmed)) {
    return { isValid: false, error: "Username must start with a letter or number" };
  }
  
  // Check if ends with letter or number
  if (!/[a-zA-Z0-9]$/.test(trimmed)) {
    return { isValid: false, error: "Username cannot end with an underscore" };
  }
  
  // Check for consecutive underscores
  if (trimmed.includes('__')) {
    return { isValid: false, error: "Username cannot contain consecutive underscores" };
  }
  
  // Final regex validation (handles edge cases)
  const isValidPattern = trimmed.length === 3 ? 
    USERNAME_REGEX_SHORT.test(trimmed) : 
    USERNAME_REGEX.test(trimmed);
    
  if (!isValidPattern) {
    return { isValid: false, error: "Username contains invalid characters" };
  }
  
  // Convert to lowercase for storage
  const normalizedUsername = trimmed.toLowerCase();
  
  return { 
    isValid: true, 
    normalizedUsername 
  };
}

/**
 * Generate a valid username suggestion based on email or name
 */
export function generateUsernameSuggestion(email: string, fullName?: string): string {
  let suggestion = '';
  
  if (fullName) {
    // Try to create from full name
    suggestion = fullName
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '') // Remove all non-alphanumeric
      .substring(0, 15); // Leave room for numbers if needed
  } else {
    // Use email prefix
    suggestion = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '') // Remove all non-alphanumeric
      .substring(0, 15); // Leave room for numbers if needed
  }
  
  // Ensure it starts with letter/number and is at least 3 chars
  if (suggestion.length < 3 || !/^[a-zA-Z0-9]/.test(suggestion)) {
    suggestion = 'user' + Math.floor(Math.random() * 1000);
  }
  
  return suggestion;
}

/**
 * Check if username is available in database
 */
export async function checkUsernameAvailability(
  username: string, 
  supabase: any,
  excludeUserId?: string
): Promise<{ isAvailable: boolean; error?: string }> {
  try {
    const normalizedUsername = username.toLowerCase();
    
    let query = supabase
      .from('profiles')
      .select('id')
      .ilike('username', normalizedUsername) // Case-insensitive check
      .single();
    
    // Exclude current user when updating
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }
    
    const { data, error } = await query;
    
    // If no data found, username is available
    if (error && error.code === 'PGRST116') {
      return { isAvailable: true };
    }
    
    if (error) {
      return { isAvailable: false, error: 'Error checking username availability' };
    }
    
    // If data exists, username is taken
    return { isAvailable: false, error: 'Username is already taken' };
    
  } catch (error) {
    return { isAvailable: false, error: 'Error checking username availability' };
  }
}
