// services/AudioService.ts
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "../api/supabaseClient";
import { Song } from "../../presentation/components/MusicPlayerCard";

// Upload-related interfaces
export interface UploadProgress {
  progress: number;
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  error?: string;
}

export interface TrackUploadData {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  audioFile: DocumentPicker.DocumentPickerResult | null;
  coverImage: ImagePicker.ImagePickerResult | null;
  duration?: number;
}

export interface UploadedTrack extends Omit<Song, "id"> {
  id?: string;
  audioUrl: string;
  coverImageUrl?: string;
  userId: string;
  createdAt: string;
}

class AudioService {
  private sound: Audio.Sound | null = null;
  private currentSong: Song | null = null;
  private isPlaying: boolean = false;
  private position: number = 0;
  private duration: number = 0;

  async initializeAudio() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  async loadSong(song: Song, url: string) {
    if (this.sound) {
      await this.sound.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: false }
    );

    this.sound = sound;
    this.currentSong = song;

    // Set up status updates
    this.sound.setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate);
  }

  async play() {
    if (this.sound) {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
  }

  async pause() {
    if (this.sound) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  async seekTo(position: number) {
    if (this.sound) {
      await this.sound.setPositionAsync(position * 1000); // Convert to milliseconds
    }
  }

  private onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      this.position = status.positionMillis / 1000; // Convert to seconds
      this.duration = status.durationMillis / 1000;
      this.isPlaying = status.isPlaying;

      // Emit events to update UI
      // You can use EventEmitter or Context API
    }
  };

  // File selection methods
  async selectAudioFile(): Promise<DocumentPicker.DocumentPickerResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        throw new Error("Audio file selection cancelled");
      }

      const asset = result.assets[0];

      // Validate file size (50MB limit)
      if (asset.size && asset.size > 50 * 1024 * 1024) {
        throw new Error("File size exceeds 50MB limit");
      }

      // Validate file type
      const allowedMimeTypes = [
        "audio/mp3",
        "audio/mpeg",
        "audio/wav",
        "audio/flac",
      ];
      if (asset.mimeType && !allowedMimeTypes.includes(asset.mimeType)) {
        throw new Error(
          "Unsupported audio format. Please use MP3, WAV, or FLAC"
        );
      }

      return result;
    } catch (error) {
      console.error("Error selecting audio file:", error);
      throw error;
    }
  }

  async selectCoverImage(): Promise<ImagePicker.ImagePickerResult> {
    try {
      // Request permission to access media library
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permission to access media library is required");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for album art
        quality: 0.8,
        exif: false,
      });

      if (result.canceled) {
        throw new Error("Image selection cancelled");
      }

      const asset = result.assets[0];

      // Validate minimum dimensions (640x640)
      if (asset.width < 640 || asset.height < 640) {
        throw new Error("Cover image must be at least 640x640 pixels");
      }

      return result;
    } catch (error) {
      console.error("Error selecting cover image:", error);
      throw error;
    }
  }

  // Upload methods
  async uploadTrack(
    trackData: TrackUploadData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedTrack> {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User must be authenticated to upload tracks");
      }

      onProgress?.({ progress: 5, status: "uploading" });

      // Upload audio file
      const audioUrl = await this.uploadAudioFile(
        trackData.audioFile!,
        user.id,
        onProgress
      );

      onProgress?.({ progress: 70, status: "uploading" });

      // Upload cover image if provided
      let coverImageUrl: string | undefined;
      if (trackData.coverImage?.assets?.[0]) {
        coverImageUrl = await this.uploadCoverImage(
          trackData.coverImage,
          user.id
        );
      }

      onProgress?.({ progress: 85, status: "processing" });

      // Get audio duration if not provided
      let duration = trackData.duration;
      if (!duration && trackData.audioFile?.assets?.[0]) {
        duration = await this.getAudioDuration(
          trackData.audioFile.assets[0].uri
        );
      }

      // Save track metadata to database
      const trackRecord = await this.saveTrackToDatabase({
        title: trackData.title,
        artist: trackData.artist || "Unknown Artist",
        album: trackData.album || "",
        plays: "0",
        duration: duration || 0,
        likes: 0,
        image: coverImageUrl || "",
        audioUrl,
        coverImageUrl,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });

      onProgress?.({ progress: 100, status: "completed" });

      return trackRecord;
    } catch (error) {
      console.error("Error uploading track:", error);
      onProgress?.({
        progress: 0,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async uploadAudioFile(
    audioFile: DocumentPicker.DocumentPickerResult,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const asset = audioFile.assets![0];
    const fileExtension = asset.name.split(".").pop()?.toLowerCase() || "mp3";
    const fileName = `${userId}_${Date.now()}.${fileExtension}`;
    const filePath = `audio/${fileName}`;

    try {
      // Read file as base64
      const fileData = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      onProgress?.({ progress: 30, status: "uploading" });

      // Convert base64 to array buffer
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("audio-files")
        .upload(filePath, bytes, {
          contentType: asset.mimeType || "audio/mpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload audio file: ${error.message}`);
      }

      onProgress?.({ progress: 60, status: "uploading" });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("audio-files")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading audio file:", error);
      throw error;
    }
  }

  private async uploadCoverImage(
    coverImage: ImagePicker.ImagePickerResult,
    userId: string
  ): Promise<string> {
    const asset = coverImage.assets![0];
    const fileExtension = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${userId}_${Date.now()}.${fileExtension}`;
    const filePath = `covers/${fileName}`;

    try {
      // Read file as base64
      const fileData = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to array buffer
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("cover-images")
        .upload(filePath, bytes, {
          contentType: asset.mimeType || "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload cover image: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("cover-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading cover image:", error);
      throw error;
    }
  }

  private async getAudioDuration(uri: string): Promise<number> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();

      if (status.isLoaded && status.durationMillis) {
        return Math.round(status.durationMillis / 1000);
      }
      return 0;
    } catch (error) {
      console.error("Error getting audio duration:", error);
      return 0;
    }
  }

  private async saveTrackToDatabase(
    trackData: UploadedTrack
  ): Promise<UploadedTrack> {
    try {
      const { data, error } = await supabase
        .from("tracks")
        .insert([
          {
            title: trackData.title,
            artist: trackData.artist,
            album: trackData.album,
            plays: trackData.plays,
            duration: trackData.duration,
            likes: trackData.likes,
            image: trackData.image,
            audio_url: trackData.audioUrl,
            cover_image_url: trackData.coverImageUrl,
            user_id: trackData.userId,
            created_at: trackData.createdAt,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save track to database: ${error.message}`);
      }

      return {
        ...trackData,
        id: data.id.toString(),
      };
    } catch (error) {
      console.error("Error saving track to database:", error);
      throw error;
    }
  }

  // Get user's uploaded tracks
  async getUserTracks(userId: string): Promise<Song[]> {
    try {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user tracks: ${error.message}`);
      }

      return data.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || "",
        plays: track.plays || "0",
        duration: track.duration || 0,
        likes: track.likes || 0,
        image: track.image || "",
        audioUrl: track.audio_url,
      }));
    } catch (error) {
      console.error("Error fetching user tracks:", error);
      throw error;
    }
  }
}

export const audioService = new AudioService();
