import { supabase } from '../api/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  userType: 'artist' | 'listener';
  artistName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  user_type: 'artist' | 'listener';
  display_name: string;
  artist_name?: string;
  is_artist: boolean;
  bio?: string;
  location?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

class AuthService {
  // Sign up with email and create user profile
  async signUp(data: SignUpData): Promise<{ user: User | null; session: Session | null; error: any }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName,
            user_type: data.userType,
            artist_name: data.userType === 'artist' ? data.artistName : null,
            is_artist: data.userType === 'artist',
          },
        },
      });

      if (authError) {
        return { user: null, session: null, error: authError };
      }

      // Create user profile in database
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: data.email,
            user_type: data.userType,
            display_name: data.displayName,
            artist_name: data.userType === 'artist' ? data.artistName : null,
            is_artist: data.userType === 'artist',
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      return { user: authData.user, session: authData.session, error: null };
    } catch (error) {
      return { user: null, session: null, error };
    }
  }

  // Sign in with email and password
  async signIn(data: SignInData): Promise<{ user: User | null; session: Session | null; error: any }> {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      return { user: authData.user, session: authData.session, error };
    } catch (error) {
      return { user: null, session: null, error };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Send OTP for phone authentication
  async sendOTP(phone: string, userData?: any): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: userData ? { data: userData } : undefined,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Verify OTP
  async verifyOTP(phone: string, token: string): Promise<{ user: User | null; session: Session | null; error: any }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: token,
        type: 'sms',
      });
      return { user: data.user, session: data.session, error };
    } catch (error) {
      return { user: null, session: null, error };
    }
  }

  // Resend confirmation email
  async resendConfirmation(email: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }
}

export const authService = new AuthService();
