import { supabase } from "../api/supabaseClient";
import { UserProfile } from "./authService";

export interface UpdateProfileData {
  display_name?: string;
  artist_name?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
}

class UserService {
  // Get user profile by ID
  async getUserProfile(
    userId: string
  ): Promise<{ data: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // Use maybeSingle() to handle no results gracefully

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update user profile
  async updateProfile(
    userId: string,
    updates: UpdateProfileData
  ): Promise<{ data: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get users by type (artists or listeners)
  async getUsersByType(
    userType: "artist" | "listener",
    limit = 20
  ): Promise<{ data: UserProfile[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_type", userType)
        .order("created_at", { ascending: false })
        .limit(limit);

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Search users by name
  async searchUsers(
    query: string,
    userType?: "artist" | "listener"
  ): Promise<{ data: UserProfile[]; error: any }> {
    try {
      let queryBuilder = supabase
        .from("users")
        .select("*")
        .or(`display_name.ilike.%${query}%,artist_name.ilike.%${query}%`);

      if (userType) {
        queryBuilder = queryBuilder.eq("user_type", userType);
      }

      const { data, error } = await queryBuilder
        .order("created_at", { ascending: false })
        .limit(50);

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get all artists
  async getAllArtists(): Promise<{ data: UserProfile[]; error: any }> {
    return this.getUsersByType("artist");
  }
}

export const userService = new UserService();
