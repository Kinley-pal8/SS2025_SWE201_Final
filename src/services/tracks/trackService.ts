import { supabase } from '../api/supabaseClient';

export interface Track {
  id: string;
  title: string;
  artist_id: string;
  genre: string | null;
  album: string | null;
  description: string | null;
  file_path: string;
  cover_image_path: string | null;
  duration: number | null;
  file_size: number | null;
  is_public: boolean;
  play_count: number;
  created_at: string;
  updated_at: string;
  // Joined data from users table
  users?: {
    display_name: string | null;
    artist_name: string | null;
    avatar_url: string | null;
  };
}

export interface TrackData {
  title: string;
  genre?: string | null;
  album?: string | null;
  description?: string | null;
  is_public?: boolean;
  audioFile?: any; // The audio file from DocumentPicker
}

export const trackService = {
  // Upload audio file to Supabase Storage
  async uploadAudioFile(file: any, artistId: string): Promise<string> {
    console.log('🔄 Uploading audio file:', file.name);
    
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${artistId}/${Date.now()}_${file.name}`;
    
    // Convert file to blob for upload
    const response = await fetch(file.uri);
    const blob = await response.blob();
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('audio-files') // Make sure this bucket exists in your Supabase
      .upload(fileName, blob, {
        contentType: file.mimeType || 'audio/mpeg',
        upsert: false,
      });
    
    if (error) {
      console.error('❌ Audio upload error:', error);
      throw error;
    }
    
    console.log('✅ Audio file uploaded:', data.path);
    return data.path;
  },

  // Create a new track (updated to handle the file properly)
  async createTrack(artistId: string, trackData: TrackData): Promise<{ data: Track | null; error: any }> {
    try {
      console.log('🔄 Creating track:', trackData.title);
      
      let filePath = '';
      let fileSize = 0;
      
      // Extract audio file from trackData
      const { audioFile, ...restTrackData } = trackData;
      
      // Upload audio file if provided
      if (audioFile) {
        filePath = await this.uploadAudioFile(audioFile, artistId);
        fileSize = audioFile.size || 0;
      }
      
      // Prepare track record
      const track = {
        title: restTrackData.title,
        artist_id: artistId,
        genre: restTrackData.genre || null,
        album: restTrackData.album || null,
        description: restTrackData.description || null,
        file_path: filePath,
        file_size: fileSize,
        is_public: restTrackData.is_public !== false, // Default to public
        play_count: 0,
        duration: null, // You can calculate this later
        cover_image_path: null, // You can add this later
      };
      
      // Insert into database
      const { data, error } = await supabase
        .from('tracks')
        .insert([track])
        .select(`
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `)
        .single();
      
      if (error) {
        console.error('❌ Track creation error:', error);
        return { data: null, error };
      }
      
      console.log('✅ Track created:', data.title);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Track creation failed:', error);
      return { data: null, error };
    }
  },

  // Get all tracks with pagination
  async getAllTracks(page: number = 0, limit: number = 20): Promise<{ data: Track[]; error: any }> {
    try {
      console.log(`🔄 Loading tracks page ${page}...`);
      
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
      
      if (error) {
        console.error('❌ Failed to load tracks:', error);
        return { data: [], error };
      }
      
      console.log(`✅ Loaded ${data.length} tracks`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Track loading failed:', error);
      return { data: [], error };
    }
  },

  // Get tracks by specific artist
  async getTracksByArtist(artistId: string): Promise<{ data: Track[]; error: any }> {
    try {
      console.log('🔄 Loading tracks for artist:', artistId);
      
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
      
      if (error) {
        console.error('❌ Failed to load artist tracks:', error);
        return { data: [], error };
      }
      
      console.log(`✅ Loaded ${data.length} tracks for artist`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Artist tracks loading failed:', error);
      return { data: [], error };
    }
  },

  // Search tracks
  async searchTracks(query: string): Promise<{ data: Track[]; error: any }> {
    try {
      console.log('🔄 Searching tracks:', query);
      
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
      
      if (error) {
        console.error('❌ Search failed:', error);
        return { data: [], error };
      }
      
      console.log(`✅ Found ${data.length} tracks`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Search failed:', error);
      return { data: [], error };
    }
  },

  // Update track
  async updateTrack(trackId: string, updates: Partial<TrackData>): Promise<{ data: Track | null; error: any }> {
    try {
      console.log('🔄 Updating track:', trackId);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('tracks')
        .update(updateData)
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
      
      if (error) {
        console.error('❌ Track update error:', error);
        return { data: null, error };
      }
      
      console.log('✅ Track updated:', data.title);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Track update failed:', error);
      return { data: null, error };
    }
  },

  // Delete track
  async deleteTrack(trackId: string): Promise<{ error: any }> {
    try {
      console.log('🔄 Deleting track:', trackId);
      
      // First get the track to find the file path
      const { data: track } = await supabase
        .from('tracks')
        .select('file_path')
        .eq('id', trackId)
        .single();
      
      // Delete the audio file from storage
      if (track?.file_path) {
        await supabase.storage
          .from('audio-files')
          .remove([track.file_path]);
      }
      
      // Delete the track record
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);
      
      if (error) {
        console.error('❌ Track deletion error:', error);
        return { error };
      }
      
      console.log('✅ Track deleted');
      return { error: null };
    } catch (error) {
      console.error('❌ Track deletion failed:', error);
      return { error };
    }
  },

  // Increment play count
  async incrementPlayCount(trackId: string): Promise<void> {
    try {
      console.log('🔄 Incrementing play count:', trackId);
      
      const { error } = await supabase
        .from('tracks')
        .update({ 
          play_count: supabase.sql`play_count + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', trackId);
      
      if (error) {
        console.error('❌ Failed to increment play count:', error);
        throw error;
      }
      
      console.log('✅ Play count incremented');
    } catch (error) {
      console.error('❌ Play count increment failed:', error);
      // Don't throw error for play count since it's not critical
    }
  },

  // Get audio file URL for playback
  async getAudioUrl(filePath: string): Promise<string> {
    const { data } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  },
};