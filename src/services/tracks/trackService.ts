import { supabase } from "../api/supabaseClient";

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
  // Upload audio file to Supabase Storage with optimizations
  async uploadAudioFile(file: any, artistId: string): Promise<string> {
    console.log("🔄 Uploading audio file:", file.name);

    try {
      // Validate file exists
      if (!file || !file.uri) {
        throw new Error("Invalid file: missing file or URI");
      }

      // Validate file type (accept MP3, WAV, FLAC)
      const validTypes = [".mp3", ".wav", ".flac"];
      const fileExt = file.name?.toLowerCase();
      const isValidType = validTypes.some((ext) => fileExt?.endsWith(ext));

      if (!isValidType) {
        throw new Error("Only MP3, WAV, and FLAC files are supported");
      }

      // Create a unique file name with proper structure
      const timestamp = Date.now();
      const originalExt = file.name.split(".").pop()?.toLowerCase() || "mp3";
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${artistId}/${timestamp}_${sanitizedFileName}`;

      console.log("📁 Uploading to path:", fileName);
      console.log(
        "📦 File size:",
        file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Unknown"
      );

      // Convert file to blob for upload with increased timeout
      console.log("🔄 Converting file to blob...");
      const blobTimeout = Math.max(
        60000,
        ((file.size || 0) / 1024 / 1024) * 5000
      ); // 5 seconds per MB, min 1 minute

      const response = await Promise.race([
        fetch(file.uri),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `File read timeout after ${Math.round(
                    blobTimeout / 1000
                  )} seconds`
                )
              ),
            blobTimeout
          )
        ),
      ]);

      if (!response.ok) {
        throw new Error(
          `Failed to read file: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      console.log("📦 Blob created, size:", blob.size);

      // Determine content type based on file extension
      const contentTypeMap: { [key: string]: string } = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        flac: "audio/flac",
      };
      const contentType = contentTypeMap[originalExt] || "audio/mpeg";

      // Upload to Supabase Storage with optimized settings and timeout protection
      console.log("🚀 Starting upload to Supabase storage...");
      const uploadStartTime = Date.now();

      // Calculate timeout based on file size (more generous for larger files)
      const fileSizeMB = blob.size / (1024 * 1024);
      const uploadTimeoutMs = Math.max(
        120000, // Minimum 2 minutes
        fileSizeMB * 15000 // 15 seconds per MB, max effective timeout
      );

      console.log(
        `⏰ Upload timeout set to ${Math.round(
          uploadTimeoutMs / 1000
        )}s for ${fileSizeMB.toFixed(2)}MB file`
      );

      // Create upload promise with timeout
      // Create upload promise with timeout and retry logic
      const uploadWithRetry = async (retries = 2): Promise<any> => {
        for (let attempt = 1; attempt <= retries + 1; attempt++) {
          try {
            console.log(`🚀 Upload attempt ${attempt}/${retries + 1}`);

            const uploadPromise = supabase.storage
              .from("audio-files")
              .upload(fileName, blob, {
                contentType: contentType,
                upsert: false,
                cacheControl: "3600",
              });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error(
                      `Supabase upload timeout after ${Math.round(
                        uploadTimeoutMs / 1000
                      )} seconds`
                    )
                  ),
                uploadTimeoutMs
              )
            );

            return await Promise.race([uploadPromise, timeoutPromise]);
          } catch (error: any) {
            console.log(`❌ Upload attempt ${attempt} failed:`, error.message);

            if (
              attempt <= retries &&
              !error.message.includes("Payload too large")
            ) {
              console.log(
                `🔄 Retrying upload in 2 seconds... (${attempt}/${retries + 1})`
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
              continue;
            }
            throw error;
          }
        }
      };

      const { data, error } = await uploadWithRetry();

      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`⏱️ Upload completed in ${uploadDuration}ms`);

      if (error) {
        console.error("❌ Audio upload error:", error);
        // Provide more specific error messages
        if (error.message.includes("Payload too large")) {
          throw new Error(
            "File is too large. Please use a file smaller than 50MB."
          );
        } else if (error.message.includes("timeout")) {
          throw new Error(
            "Upload timed out. Please check your internet connection and try again."
          );
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }

      console.log("✅ Audio file uploaded successfully:", data.path);

      // Test if the file is accessible by generating public URL
      const { data: urlData } = supabase.storage
        .from("audio-files")
        .getPublicUrl(data.path);

      console.log("🔗 Public URL generated:", urlData.publicUrl);

      return data.path;
    } catch (error) {
      console.error("❌ Audio upload failed:", error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Audio upload failed: ${error.message}`);
      } else {
        throw new Error("Audio upload failed: Unknown error");
      }
    }
  },

  // Create a new track (updated to handle the file properly)
  async createTrack(
    artistId: string,
    trackData: TrackData
  ): Promise<{ data: Track | null; error: any }> {
    try {
      console.log("🔄 Creating track:", trackData.title);

      let filePath = "";
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
        .from("tracks")
        .insert([track])
        .select(
          `
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `
        )
        .single();

      if (error) {
        console.error("❌ Track creation error:", error);
        return { data: null, error };
      }

      console.log("✅ Track created:", data.title);
      return { data, error: null };
    } catch (error) {
      console.error("❌ Track creation failed:", error);
      return { data: null, error };
    }
  },

  // Get all tracks with pagination
  async getAllTracks(
    page: number = 0,
    limit: number = 20
  ): Promise<{ data: Track[]; error: any }> {
    try {
      console.log(`🔄 Loading tracks page ${page}...`);

      const { data, error } = await supabase
        .from("tracks")
        .select(
          `
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) {
        console.error("❌ Failed to load tracks:", error);
        return { data: [], error };
      }

      console.log(`✅ Loaded ${data.length} tracks`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error("❌ Track loading failed:", error);
      return { data: [], error };
    }
  },

  // Get tracks by specific artist
  async getTracksByArtist(
    artistId: string
  ): Promise<{ data: Track[]; error: any }> {
    try {
      console.log("🔄 Loading tracks for artist:", artistId);

      const { data, error } = await supabase
        .from("tracks")
        .select(
          `
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `
        )
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Failed to load artist tracks:", error);
        return { data: [], error };
      }

      console.log(`✅ Loaded ${data.length} tracks for artist`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error("❌ Artist tracks loading failed:", error);
      return { data: [], error };
    }
  },

  // Search tracks
  async searchTracks(query: string): Promise<{ data: Track[]; error: any }> {
    try {
      console.log("🔄 Searching tracks:", query);

      const { data, error } = await supabase
        .from("tracks")
        .select(
          `
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `
        )
        .eq("is_public", true)
        .or(
          `title.ilike.%${query}%,genre.ilike.%${query}%,album.ilike.%${query}%`
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("❌ Search failed:", error);
        return { data: [], error };
      }

      console.log(`✅ Found ${data.length} tracks`);
      return { data: data || [], error: null };
    } catch (error) {
      console.error("❌ Search failed:", error);
      return { data: [], error };
    }
  },

  // Update track
  async updateTrack(
    trackId: string,
    updates: Partial<TrackData>
  ): Promise<{ data: Track | null; error: any }> {
    try {
      console.log("🔄 Updating track:", trackId);

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("tracks")
        .update(updateData)
        .eq("id", trackId)
        .select(
          `
          *,
          users:artist_id (
            display_name,
            artist_name,
            avatar_url
          )
        `
        )
        .single();

      if (error) {
        console.error("❌ Track update error:", error);
        return { data: null, error };
      }

      console.log("✅ Track updated:", data.title);
      return { data, error: null };
    } catch (error) {
      console.error("❌ Track update failed:", error);
      return { data: null, error };
    }
  },

  // Delete track
  async deleteTrack(trackId: string): Promise<{ error: any }> {
    try {
      console.log("🔄 Deleting track:", trackId);

      // First get the track to find the file path
      const { data: track } = await supabase
        .from("tracks")
        .select("file_path")
        .eq("id", trackId)
        .single();

      // Delete the audio file from storage
      if (track?.file_path) {
        await supabase.storage.from("audio-files").remove([track.file_path]);
      }

      // Delete the track record
      const { error } = await supabase
        .from("tracks")
        .delete()
        .eq("id", trackId);

      if (error) {
        console.error("❌ Track deletion error:", error);
        return { error };
      }

      console.log("✅ Track deleted");
      return { error: null };
    } catch (error) {
      console.error("❌ Track deletion failed:", error);
      return { error };
    }
  },

  // Increment play count
  async incrementPlayCount(trackId: string): Promise<void> {
    try {
      console.log("🔄 Incrementing play count:", trackId);

      // First, get the current play count
      const { data: currentTrack, error: fetchError } = await supabase
        .from("tracks")
        .select("play_count")
        .eq("id", trackId)
        .single();

      if (fetchError) {
        console.error("❌ Failed to fetch current play count:", fetchError);
        throw fetchError;
      }

      // Increment the play count
      const newPlayCount = (currentTrack?.play_count || 0) + 1;

      const { error } = await supabase
        .from("tracks")
        .update({
          play_count: newPlayCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trackId);

      if (error) {
        console.error("❌ Failed to increment play count:", error);
        throw error;
      }

      console.log("✅ Play count incremented to:", newPlayCount);
    } catch (error) {
      console.error("❌ Play count increment failed:", error);
      // Don't throw error for play count since it's not critical
    }
  },

  // Get audio file URL for playback
  async getAudioUrl(filePath: string): Promise<string> {
    console.log("🔄 Getting public URL for file:", filePath);

    // If filePath is already a full URL, return it as-is
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      console.log("✅ File path is already a full URL:", filePath);
      return filePath;
    }

    const { data } = supabase.storage
      .from("audio-files")
      .getPublicUrl(filePath);

    console.log("✅ Generated public URL:", data.publicUrl);
    return data.publicUrl;
  },
};
