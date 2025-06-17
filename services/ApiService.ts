// services/ApiService.ts
import { supabase } from '../lib/supabase';

class ApiService {
  async uploadAudio(file: any, metadata: any) {
    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(fileName, file);

    if (error) throw error;

    // Save metadata to database
    const { data: songData, error: dbError } = await supabase
      .from('songs')
      .insert({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        genre: metadata.genre,
        file_path: data.path,
        user_id: metadata.userId,
      });

    if (dbError) throw dbError;
    return songData;
  }

  async getSongs() {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getAudioUrl(filePath: string) {
    const { data } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    return data?.signedUrl;
  }
}

export const apiService = new ApiService();