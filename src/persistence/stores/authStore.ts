import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, Session } from "@supabase/supabase-js";
import { authService, UserProfile } from "../../services/auth/authService";
import { userService } from "../../services/auth/userService";

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    userType: "artist" | "listener",
    artistName?: string
  ) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (updates: any) => Promise<boolean>;
  clearUserData: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      profile: null,
      loading: false,
      error: null,

      // Initialize auth state
      initialize: async () => {
        set({ loading: true });
        try {
          const session = await authService.getCurrentSession();
          const user = await authService.getCurrentUser();

          if (user && session) {
            console.log("👤 User found during initialization:", user.email);
            set({ user, session });
            await get().loadProfile();
          } else {
            console.log("👤 No user found during initialization");
            set({ user: null, session: null, profile: null });
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          set({ error: "Failed to initialize authentication" });
        } finally {
          set({ loading: false });
        }

        // Listen for auth state changes
        authService.onAuthStateChange((event, session) => {
          console.log("🔐 Auth state changed:", event, session?.user?.email);

          if (event === "SIGNED_IN" && session?.user) {
            set({ user: session.user, session });
            get().loadProfile();
          } else if (event === "SIGNED_OUT") {
            console.log("🔄 User signed out, clearing data");
            get().clearUserData();
          } else if (event === "TOKEN_REFRESHED" && session?.user) {
            set({ user: session.user, session });
          }
        });
      },

      // Sign up
      signUp: async (email, password, displayName, userType, artistName) => {
        set({ loading: true, error: null });
        try {
          const { user, session, error } = await authService.signUp({
            email,
            password,
            displayName,
            userType,
            artistName,
          });

          if (error) {
            set({ error: error.message });
            return false;
          }

          if (user && session) {
            set({ user, session });
            await get().loadProfile();
            return true;
          }

          return false;
        } catch (error: any) {
          set({ error: error.message || "Sign up failed" });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      // Sign in
      signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { user, session, error } = await authService.signIn({
            email,
            password,
          });

          if (error) {
            set({ error: error.message });
            return false;
          }

          if (user && session) {
            set({ user, session });
            await get().loadProfile();
            return true;
          }

          return false;
        } catch (error: any) {
          set({ error: error.message || "Sign in failed" });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      // Sign out
      signOut: async () => {
        set({ loading: true });
        try {
          console.log("🔐 Signing out user...");
          await authService.signOut();
          // clearUserData will be called by the auth state listener
        } catch (error: any) {
          console.error("❌ Sign out error:", error);
          set({ error: error.message || "Sign out failed" });
        } finally {
          set({ loading: false });
        }
      },

      // Clear user data (called on sign out)
      clearUserData: () => {
        console.log("🧹 Clearing user data from auth store");
        set({
          user: null,
          session: null,
          profile: null,
          error: null,
        });
      },

      // Load user profile
      loadProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { data: profile, error } = await userService.getUserProfile(
            user.id
          );
          if (error) {
            console.error("Profile load error:", error);
            // Don't set error state for missing profile - user might not have one yet
            if (error.code !== "PGRST116") {
              set({ error: "Failed to load profile" });
            }
          } else {
            set({ profile });
          }
        } catch (error) {
          console.error("Profile load error:", error);
        }
      },

      // Update profile
      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return false;

        set({ loading: true, error: null });
        try {
          const { data: updatedProfile, error } =
            await userService.updateProfile(user.id, updates);

          if (error) {
            set({ error: error.message });
            return false;
          }

          set({ profile: updatedProfile });
          return true;
        } catch (error: any) {
          set({ error: error.message || "Profile update failed" });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Set loading
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
      }),
      onRehydrateStorage: () => (state) => {
        console.log("Auth store rehydrated");
      },
    }
  )
);
