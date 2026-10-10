import { createClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { UserCredits, ExtractedStatement } from '../types';

// Supabase Configuration from provided project credentials
const DEFAULT_SUPABASE_URL = 'https://snlfvemrbbriwszrgemb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_2OalWmJEQuilL7U0Fu5_zw_2tkI7ZrF';

function getValidSupabaseUrl(): string {
  try {
    let candidate = '';
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      candidate = ((import.meta as any).env.VITE_SUPABASE_URL || '').trim();
    }
    candidate = candidate.replace(/^["']|["']$/g, '').trim();
    if (candidate && (candidate.startsWith('http://') || candidate.startsWith('https://'))) {
      new URL(candidate); // test validity
      return candidate;
    }
  } catch (e) {
    console.warn('Invalid VITE_SUPABASE_URL provided, falling back to default:', e);
  }
  return DEFAULT_SUPABASE_URL;
}

function getValidSupabaseAnonKey(): string {
  try {
    let candidate = '';
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      candidate = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();
    }
    candidate = candidate.replace(/^["']|["']$/g, '').trim();
    if (candidate && candidate.length > 5 && !candidate.startsWith('MY_') && candidate !== 'undefined' && candidate !== 'null') {
      return candidate;
    }
  } catch (e) {
    console.warn('Invalid VITE_SUPABASE_ANON_KEY provided, falling back to default:', e);
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

export const SUPABASE_URL = getValidSupabaseUrl();
export const SUPABASE_ANON_KEY = getValidSupabaseAnonKey();

// Create Supabase Client instance safely
export const supabase = (() => {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('Failed to initialize custom Supabase client, using fallback configuration:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
})();

export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  createdAt?: string;
}

// Transform Supabase user object to unified AppUser
export const formatSupabaseUser = (user: SupabaseUser | null): AppUser | null => {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    displayName: meta.full_name || meta.display_name || meta.name || user.email?.split('@')[0] || 'User',
    avatarUrl: meta.avatar_url || meta.picture || undefined,
    phoneNumber: user.phone || meta.phone_number || meta.phone || undefined,
    phoneVerified: Boolean(user.phone_confirmed_at || meta.phone_verified),
    createdAt: user.created_at,
  };
};

// ==========================================
// Supabase Authentication Methods
// ==========================================

export const signUpWithEmail = async (email: string, pass: string, displayName?: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          full_name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) {
      console.error('Supabase Sign Up Error:', error);
      return { user: null, session: null, error: formatSupabaseAuthError(error) };
    }

    const appUser = formatSupabaseUser(data.user);
    if (appUser && data.user) {
      // Store user information in Supabase database
      await syncUserProfileToSupabase(data.user.id, {
        email: data.user.email || email,
        displayName: displayName || email.split('@')[0],
      });
    }

    return { user: appUser, session: data.session, error: null };
  } catch (err: any) {
    console.error('Unexpected Sign Up Error:', err);
    return { user: null, session: null, error: err.message || 'Failed to sign up.' };
  }
};

export const signInWithEmail = async (email: string, pass: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      console.error('Supabase Sign In Error:', error);
      return { user: null, session: null, error: formatSupabaseAuthError(error) };
    }

    const appUser = formatSupabaseUser(data.user);
    if (appUser && data.user) {
      // Ensure user profile in database
      await syncUserProfileToSupabase(data.user.id, {
        email: data.user.email || email,
        displayName: appUser.displayName,
      });
    }

    return { user: appUser, session: data.session, error: null };
  } catch (err: any) {
    console.error('Unexpected Sign In Error:', err);
    return { user: null, session: null, error: err.message || 'Failed to sign in.' };
  }
};

export const signInWithOAuth = async (provider: 'google' | 'github') => {
  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error(`Supabase ${provider} OAuth Error:`, error);
      return { data: null, error: formatSupabaseAuthError(error) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error(`Unexpected ${provider} OAuth Error:`, err);
    return { data: null, error: err.message || `Failed to start ${provider} sign in.` };
  }
};

export const resetPasswordForEmail = async (email: string) => {
  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Supabase Password Reset Error:', error);
      return { success: false, error: formatSupabaseAuthError(error) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Unexpected Password Reset Error:', err);
    return { success: false, error: err.message || 'Failed to send reset email.' };
  }
};

export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase Sign Out Error:', error);
      return { success: false, error: formatSupabaseAuthError(error) };
    }
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Unexpected Sign Out Error:', err);
    return { success: false, error: err.message || 'Failed to sign out.' };
  }
};

export const getCurrentSupabaseUser = async (): Promise<AppUser | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return formatSupabaseUser(user);
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
};

export const onSupabaseAuthStateChange = (callback: (user: AppUser | null, session: Session | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session?.user ? formatSupabaseUser(session.user) : null;
    callback(user, session);
  });
  return subscription;
};

export const formatSupabaseAuthError = (error: any): string => {
  if (!error) return 'An unexpected error occurred.';
  const message: string = error.message || '';
  
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please verify and try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Your email address is not confirmed yet. Please check your inbox for the verification email.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  return message || 'Authentication failed. Please try again.';
};

// ==========================================
// Supabase Database User Data Store Operations
// ==========================================

export interface UserProfileData {
  id?: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  credits?: UserCredits;
  updatedAt?: string;
}

export const syncUserCreditsToSupabase = async (userId: string, credits: UserCredits, userEmail?: string | null, userName?: string | null) => {
  return syncUserProfileToSupabase(userId, {
    email: userEmail || '',
    displayName: userName || undefined,
    credits,
  });
};

/**
 * Stores/updates user profile and credits in Supabase database (`user_profiles` table).
 * Includes fallback logic to handle custom table structures or fresh project databases.
 */
export const syncUserProfileToSupabase = async (
  userId: string, 
  profile: { 
    email: string; 
    displayName?: string; 
    avatarUrl?: string; 
    phoneNumber?: string;
    phoneVerified?: boolean;
    credits?: UserCredits;
  }
) => {
  try {
    const payload = {
      id: userId,
      email: profile.email,
      display_name: profile.displayName || profile.email.split('@')[0],
      avatar_url: profile.avatarUrl || null,
      phone_number: profile.phoneNumber || profile.credits?.phoneNumber || null,
      phone_verified: profile.phoneVerified || profile.credits?.phoneVerified || false,
      available_credits: profile.credits?.availableCredits ?? 10,
      total_earned: profile.credits?.totalEarned ?? 10,
      total_used: profile.credits?.totalUsed ?? 0,
      shares_count: profile.credits?.sharesCount ?? 0,
      referral_code: profile.credits?.referralCode || null,
      updated_at: new Date().toISOString(),
    };

    // Attempt upsert into user_profiles table
    const { error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      // If user_profiles doesn't exist yet, try profiles table or log notice
      console.warn('Supabase user_profiles upsert note:', error.message);
      
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: profile.email,
          full_name: profile.displayName,
          phone_number: profile.phoneNumber || profile.credits?.phoneNumber || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      if (profileErr) {
        console.warn('Supabase profiles upsert note:', profileErr.message);
      }
    }
  } catch (err) {
    console.warn('Failed to sync user profile to Supabase database:', err);
  }
};

/**
 * Loads user credits from Supabase database.
 */
export const loadUserCreditsFromSupabase = async (userId: string): Promise<UserCredits | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('available_credits, total_earned, total_used, shares_count, referral_code')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase load credits note:', error.message);
      return null;
    }

    if (data) {
      return {
        availableCredits: typeof data.available_credits === 'number' ? data.available_credits : 10,
        totalEarned: typeof data.total_earned === 'number' ? data.total_earned : 10,
        totalUsed: typeof data.total_used === 'number' ? data.total_used : 0,
        sharesCount: typeof data.shares_count === 'number' ? data.shares_count : 0,
        referralCode: data.referral_code || undefined,
        referredUsersCount: 0,
        claimedReferralBonus: false,
      };
    }
  } catch (err) {
    console.warn('Failed to load user credits from Supabase:', err);
  }
  return null;
};

/**
 * Synchronizes user statement to Supabase database (`user_statements` table).
 */
export const syncStatementToSupabase = async (userId: string, statement: ExtractedStatement) => {
  try {
    const payload = {
      id: statement.id,
      user_id: userId,
      file_name: statement.fileName,
      file_type: statement.fileType,
      file_size: statement.fileSize,
      upload_date: statement.uploadDate,
      bank_name: statement.summary.bankName,
      currency: statement.summary.currency,
      opening_balance: statement.summary.openingBalance,
      closing_balance: statement.summary.closingBalance,
      transactions_count: statement.transactions.length,
      statement_data: statement, // Stores complete structured JSON data
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_statements')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase sync statement note:', error.message);
    }
  } catch (err) {
    console.warn('Failed to sync statement to Supabase:', err);
  }
};

/**
 * Loads all statements belonging to a user from Supabase database.
 */
export const loadStatementsFromSupabase = async (userId: string): Promise<ExtractedStatement[]> => {
  try {
    const { data, error } = await supabase
      .from('user_statements')
      .select('statement_data, upload_date')
      .eq('user_id', userId)
      .order('upload_date', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Supabase load statements note:', error.message);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data
        .map((row: any) => row.statement_data as ExtractedStatement)
        .filter(Boolean);
    }
  } catch (err) {
    console.warn('Failed to load statements from Supabase:', err);
  }
  return [];
};

/**
 * Deletes a statement from Supabase database.
 */
export const deleteStatementFromSupabase = async (userId: string, statementId: string) => {
  try {
    const { error } = await supabase
      .from('user_statements')
      .delete()
      .eq('user_id', userId)
      .eq('id', statementId);

    if (error) {
      console.warn('Supabase delete statement note:', error.message);
    }
  } catch (err) {
    console.warn('Failed to delete statement from Supabase:', err);
  }
};

/**
 * Clears all statements for a user from Supabase database.
 */
export const clearStatementsFromSupabase = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('user_statements')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase clear statements note:', error.message);
    }
  } catch (err) {
    console.warn('Failed to clear statements from Supabase:', err);
  }
};
