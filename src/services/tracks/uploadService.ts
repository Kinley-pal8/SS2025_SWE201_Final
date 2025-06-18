import { supabase } from '../api/supabaseClient';

export interface UploadResult {
  path: string;
  fullPath: string;
  id: string;
}

export interface AudioMetadata {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration?: number;
}

class UploadService {
  // Upload audio file to storage
  async uploadAudio(file: any, userId: string): Promise<{ data: UploadResult | null; error: any }> {
    try {
      // Generate unique filename
      const fileExt = file.name?.split('.').pop() || 'mp3';
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        return { data: null, error };
      }

      return {
        data: {
          path: data.path,
          fullPath: data.fullPath,
          id: data.id,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Upload cover image to storage
  async uploadCoverImage(file: any, userId: string): Promise<{ data: UploadResult | null; error: any }> {
    try {
      const fileExt = file.name?.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}_cover.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('cover-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        return { data: null, error };
      }

      return {
        data: {
          path: data.path,
          fullPath: data.fullPath,
          id: data.id,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete file from storage
  async deleteFile(bucket: string, filePath: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Get file info
  async getFileInfo(bucket: string, filePath: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(filePath);

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Complete upload flow: audio + metadata + optional cover
  async uploadTrack(
    audioFile: any,
    metadata: AudioMetadata,
    userId: string,
    coverImage?: any
  ): Promise<{ data: any; error: any }> {
    try {
      // Upload audio file
      const { data: audioData, error: audioError } = await this.uploadAudio(audioFile, userId);
      if (audioError || !audioData) {
        return { data: null, error: audioError || new Error('Audio upload failed') };
      }

      let coverImagePath: string | undefined;

      // Upload cover image if provided
      if (coverImage) {
        const { data: coverData, error: coverError } = await this.uploadCoverImage(coverImage, userId);
        if (coverError) {
          // Delete uploaded audio if cover fails
          await this.deleteFile('audio-files', audioData.path);
          return { data: null, error: coverError };
        }
        coverImagePath = coverData?.path;
      }

      // Create track record
      const { data: track, error: trackError } = await trackService.createTrack(userId, {
        title: metadata.title,
        genre: metadata.genre,
        album: metadata.album,
        file_path: audioData.path,
        cover_image_path: coverImagePath,
        duration: metadata.duration,
        file_size: audioFile.size,
      });

      if (trackError) {
        // Cleanup uploaded files if track creation fails
        await this.deleteFile('audio-files', audioData.path);
        if (coverImagePath) {
          await this.deleteFile('cover-images', coverImagePath);
        }
        return { data: null, error: trackError };
      }

      return { data: track, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const uploadService = new UploadService();