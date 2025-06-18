import { supabase } from '../api/supabaseClient';

export interface Track {
  id: string;
  title: string;
  artist_id: string;
  genre?: string;
  album?: string;
  description?: string;
  file_path: string;
  cover_image_path?: string;
  duration?: number;
  file_size?: number;
  is_public: boolean;
  play_count: number;
  created_at: string;
  updated_at: string;
  // Joined user data
  users?: {
    display_name: string;
    artist_name?: string;
    avatar_url?: string;
  };
}

export interface CreateTrackData {
  title: string;
  genre?: string;
  album?: string;
  description?: string;
  file_path: string;
  cover_image_path?: string;
  duration?: number;
  file_size?: number;
  is_public?: boolean;
}

export interface UpdateTrackData {
  title?: string;
  genre?: string;
  album?: string;
  description?: string;
  cover_image_path?: string;
  is_public?: boolean;
}

class TrackService {
  // Create a new track
  async createTrack(artistId: string, data: CreateTrackData): Promise<{ data: Track | null; error: any }> {
    try {
      const { data: track, error } = await supabase
        .from('tracks')
        .insert({
          artist_id: artistId,
          title: data.title,
          genre: data.genre,
          album: data.album,
          description: data.description,
          file_path: data.file_path,
          cover_image_path: data.cover_image_path,
          duration: data.duration,
          file_size: data.file_size,
          is_public: data.is_public ?? true,
        })
        .select(`
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `)
        .single();

      return { data: track, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get all public tracks with pagination
  async getAllTracks(page = 0, limit = 20): Promise<{ data: Track[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get tracks by artist
  async getTracksByArtist(artistId: string): Promise<{ data: Track[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `)
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get track by ID
  async getTrack(trackId: string): Promise<{ data: Track | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `)
        .eq('id', trackId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update track
  async updateTrack(trackId: string, updates: UpdateTrackData): Promise<{ data: Track | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trackId)
        .select(`
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete track
  async deleteTrack(trackId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Search tracks
  async searchTracks(query: string): Promise<{ data: Track[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .or(`title.ilike.%${query}%,genre.ilike.%${query}%,album.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Increment play count
  async incrementPlayCount(trackId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.rpc('increment_play_count', {
        track_id: trackId
      });

      // If RPC doesn't exist, fallback to manual increment
      if (error && error.message?.includes('function')) {
        const { data: track, error: fetchError } = await supabase
          .from('tracks')
          .select('play_count')
          .eq('id', trackId)
          .single();

        if (!fetchError && track) {
          const { error: updateError } = await supabase
            .from('tracks')
            .update({ play_count: (track.play_count || 0) + 1 })
            .eq('id', trackId);
          return { error: updateError };
        }
        return { error: fetchError };
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Get audio URL from storage
  async getAudioUrl(filePath: string): Promise<string | null> {
    try {
      const { data } = await supabase.storage
        .from('audio-files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting audio URL:', error);
      return null;
    }
  }

  // Get cover image URL from storage
  async getCoverImageUrl(filePath: string): Promise<string | null> {
    try {
      const { data } = await supabase.storage
        .from('cover-images')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting cover image URL:', error);
      return null;
    }
  }
}

export const trackService = new TrackService();