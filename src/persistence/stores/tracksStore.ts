import { create } from "zustand";
import { trackService, Track } from "../../services/tracks/trackService";

interface TracksState {
  // State
  tracks: Track[];
  currentTrack: Track | null;
  myTracks: Track[]; // For artists
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Actions
  loadTracks: (refresh?: boolean) => Promise<void>;
  loadMyTracks: (artistId: string) => Promise<void>;
  searchTracks: (query: string) => Promise<void>;
  loadTracksByArtist: (artistId: string) => Promise<void>;
  createTrack: (artistId: string, data: any) => Promise<boolean>;
  updateTrack: (trackId: string, updates: any) => Promise<boolean>;
  deleteTrack: (trackId: string) => Promise<boolean>;
  setCurrentTrack: (track: Track | null) => void;
  incrementPlayCount: (trackId: string) => Promise<void>;
  clearTracks: () => void;
  clearError: () => void;
}

export const useTracksStore = create<TracksState>((set, get) => ({
  // Initial state
  tracks: [],
  currentTrack: null,
  myTracks: [],
  loading: false,
  error: null,
  hasMore: true,
  page: 0,

  // Load tracks with pagination
  loadTracks: async (refresh = false) => {
    const { page, tracks } = get();
    const currentPage = refresh ? 0 : page;

    set({ loading: true, error: null });

    try {
      const { data, error } = await trackService.getAllTracks(currentPage);

      if (error) {
        set({ error: error.message });
        return;
      }

      const newTracks = refresh ? data : [...tracks, ...data];
      set({
        tracks: newTracks,
        page: currentPage + 1,
        hasMore: data.length === 20, // Assuming 20 is the limit
      });
    } catch (error: any) {
      set({ error: error.message || "Failed to load tracks" });
    } finally {
      set({ loading: false });
    }
  },

  // Load user's own tracks (for artists)
  loadMyTracks: async (artistId: string) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await trackService.getTracksByArtist(artistId);

      if (error) {
        set({ error: error.message });
        return;
      }

      set({ myTracks: data });
    } catch (error: any) {
      set({ error: error.message || "Failed to load your tracks" });
    } finally {
      set({ loading: false });
    }
  },

  // Search tracks
  searchTracks: async (query: string) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await trackService.searchTracks(query);

      if (error) {
        set({ error: error.message });
        return;
      }

      set({ tracks: data, hasMore: false });
    } catch (error: any) {
      set({ error: error.message || "Search failed" });
    } finally {
      set({ loading: false });
    }
  },

  // Load tracks by specific artist
  loadTracksByArtist: async (artistId: string) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await trackService.getTracksByArtist(artistId);

      if (error) {
        set({ error: error.message });
        return;
      }

      set({ tracks: data, hasMore: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to load artist tracks" });
    } finally {
      set({ loading: false });
    }
  },

  // Create new track
  createTrack: async (artistId: string, data: any) => {
    set({ loading: true, error: null });

    try {
      const { data: newTrack, error } = await trackService.createTrack(
        artistId,
        data
      );

      if (error) {
        set({ error: error.message });
        return false;
      }

      // Add to both tracks and myTracks
      if (newTrack) {
        set((state) => ({
          tracks: [newTrack, ...state.tracks],
          myTracks: [newTrack, ...state.myTracks],
        }));
      }

      return true;
    } catch (error: any) {
      set({ error: error.message || "Failed to create track" });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  // Update track
  updateTrack: async (trackId: string, updates: any) => {
    set({ loading: true, error: null });

    try {
      const { data: updatedTrack, error } = await trackService.updateTrack(
        trackId,
        updates
      );

      if (error) {
        set({ error: error.message });
        return false;
      }

      // Update in both tracks and myTracks
      set((state) => ({
        tracks: state.tracks.map((track) =>
          track.id === trackId ? updatedTrack : track
        ),
        myTracks: state.myTracks.map((track) =>
          track.id === trackId ? updatedTrack : track
        ),
        currentTrack:
          state.currentTrack?.id === trackId
            ? updatedTrack
            : state.currentTrack,
      }));

      return true;
    } catch (error: any) {
      set({ error: error.message || "Failed to update track" });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  // Delete track
  deleteTrack: async (trackId: string) => {
    set({ loading: true, error: null });

    try {
      const { error } = await trackService.deleteTrack(trackId);

      if (error) {
        set({ error: error.message });
        return false;
      }

      // Remove from both tracks and myTracks
      set((state) => ({
        tracks: state.tracks.filter((track) => track.id !== trackId),
        myTracks: state.myTracks.filter((track) => track.id !== trackId),
        currentTrack:
          state.currentTrack?.id === trackId ? null : state.currentTrack,
      }));

      return true;
    } catch (error: any) {
      set({ error: error.message || "Failed to delete track" });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  // Set current playing track
  setCurrentTrack: (track: Track | null) => {
    set({ currentTrack: track });
  },

  // Increment play count
  incrementPlayCount: async (trackId: string) => {
    try {
      await trackService.incrementPlayCount(trackId);

      // Update play count in state
      set((state) => ({
        tracks: state.tracks.map((track) =>
          track.id === trackId
            ? { ...track, play_count: track.play_count + 1 }
            : track
        ),
        myTracks: state.myTracks.map((track) =>
          track.id === trackId
            ? { ...track, play_count: track.play_count + 1 }
            : track
        ),
      }));
    } catch (error) {
      console.error("Failed to increment play count:", error);
    }
  },

  // Clear tracks (called when user changes)
  clearTracks: () => {
    console.log("🧹 Clearing tracks data");
    set({
      tracks: [],
      myTracks: [],
      currentTrack: null,
      hasMore: true,
      page: 0,
      error: null,
    });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
