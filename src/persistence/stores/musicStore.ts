import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Track } from "../../services/tracks/trackService";
import { trackService } from "../../services/tracks/trackService";

// Storage availability check and fallback implementation
const createSafeStorage = () => {
  // Try to use AsyncStorage (React Native) or localStorage (Web)
  const getStorage = () => {
    try {
      // Check if we're in React Native environment
      if (typeof window === "undefined") {
        // React Native - try to import AsyncStorage
        try {
          const AsyncStorage =
            require("@react-native-async-storage/async-storage").default;
          return AsyncStorage;
        } catch {
          return null;
        }
      } else {
        // Web environment - try localStorage
        const testKey = "__storage_test__";
        localStorage.setItem(testKey, "test");
        localStorage.removeItem(testKey);
        return localStorage;
      }
    } catch {
      return null;
    }
  };

  const storage = getStorage();

  // If no storage is available, create memory-based fallback
  if (!storage) {
    const memoryStorage = new Map<string, string>();
    return {
      getItem: async (key: string) => memoryStorage.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      removeItem: async (key: string) => {
        memoryStorage.delete(key);
      },
    };
  }

  // Wrap the storage to handle async/sync differences
  return {
    getItem: async (key: string) => {
      try {
        const result = await storage.getItem(key);
        return result;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await storage.setItem(key, value);
      } catch {
        // Silently fail
      }
    },
    removeItem: async (key: string) => {
      try {
        await storage.removeItem(key);
      } catch {
        // Silently fail
      }
    },
  };
};

interface MusicState {
  // Playback state
  currentTrack: Track | null;
  audioUrl: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  volume: number;

  // Queue management
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  repeat: "none" | "one" | "all";

  // Error handling
  error: string | null;

  // Actions
  loadTrack: (track: Track) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: "none" | "one" | "all") => void;
  updatePosition: (position: number) => void;
  updateDuration: (duration: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMusicState: () => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      audioUrl: null,
      isPlaying: false,
      isLoading: false,
      duration: 0,
      position: 0,
      volume: 1.0,
      queue: [],
      queueIndex: -1,
      shuffle: false,
      repeat: "none",
      error: null,

      // Load and prepare track for playback
      loadTrack: async (track: Track) => {
        set({ isLoading: true, error: null });

        try {
          const url = await trackService.getAudioUrl(track.file_path);

          if (!url) {
            set({ error: "Failed to load audio file" });
            return;
          }

          set({
            currentTrack: track,
            audioUrl: url,
            position: 0,
            isLoading: false,
          });

          // Increment play count
          trackService.incrementPlayCount(track.id);
        } catch (error: any) {
          set({
            error: error.message || "Failed to load track",
            isLoading: false,
          });
        }
      },

      // Play current track
      play: () => {
        set({ isPlaying: true, error: null });
      },

      // Pause current track
      pause: () => {
        set({ isPlaying: false });
      },

      // Stop playback
      stop: () => {
        set({
          isPlaying: false,
          position: 0,
        });
      },

      // Seek to position
      seek: (position: number) => {
        set({ position });
      },

      // Set volume
      setVolume: (volume: number) => {
        set({ volume: Math.max(0, Math.min(1, volume)) });
      },

      // Play next track in queue
      nextTrack: async () => {
        const { queue, queueIndex, shuffle, repeat } = get();

        if (queue.length === 0) return;

        let nextIndex = queueIndex;

        if (repeat === "one") {
          // Stay on current track
          const currentTrack = queue[queueIndex];
          if (currentTrack) {
            await get().loadTrack(currentTrack);
            get().play();
          }
          return;
        }

        if (shuffle) {
          // Random next track (avoid current track)
          const availableIndices = queue
            .map((_, index) => index)
            .filter((index) => index !== queueIndex);

          if (availableIndices.length > 0) {
            nextIndex =
              availableIndices[
                Math.floor(Math.random() * availableIndices.length)
              ];
          }
        } else {
          // Sequential next track
          nextIndex = queueIndex + 1;

          if (nextIndex >= queue.length) {
            if (repeat === "all") {
              nextIndex = 0;
            } else {
              // End of queue
              get().stop();
              return;
            }
          }
        }

        const nextTrack = queue[nextIndex];
        if (nextTrack) {
          set({ queueIndex: nextIndex });
          await get().loadTrack(nextTrack);
          get().play();
        }
      },

      // Play previous track in queue
      previousTrack: async () => {
        const { queue, queueIndex, shuffle } = get();

        if (queue.length === 0) return;

        let prevIndex = queueIndex;

        if (shuffle) {
          // Random previous track
          const availableIndices = queue
            .map((_, index) => index)
            .filter((index) => index !== queueIndex);

          if (availableIndices.length > 0) {
            prevIndex =
              availableIndices[
                Math.floor(Math.random() * availableIndices.length)
              ];
          }
        } else {
          // Sequential previous track
          prevIndex = queueIndex - 1;

          if (prevIndex < 0) {
            prevIndex = queue.length - 1;
          }
        }

        const prevTrack = queue[prevIndex];
        if (prevTrack) {
          set({ queueIndex: prevIndex });
          await get().loadTrack(prevTrack);
          get().play();
        }
      },

      // Set queue and optionally start playing
      setQueue: (tracks: Track[], startIndex = 0) => {
        set({
          queue: tracks,
          queueIndex: Math.max(0, Math.min(startIndex, tracks.length - 1)),
        });

        // Auto-load first track if provided
        if (
          tracks.length > 0 &&
          startIndex >= 0 &&
          startIndex < tracks.length
        ) {
          get().loadTrack(tracks[startIndex]);
        }
      },

      // Add track to end of queue
      addToQueue: (track: Track) => {
        set((state) => ({
          queue: [...state.queue, track],
        }));
      },

      // Remove track from queue
      removeFromQueue: (index: number) => {
        set((state) => {
          const newQueue = state.queue.filter((_, i) => i !== index);
          let newQueueIndex = state.queueIndex;

          // Adjust queue index if necessary
          if (index < state.queueIndex) {
            newQueueIndex = state.queueIndex - 1;
          } else if (index === state.queueIndex) {
            // Current track was removed
            if (newQueue.length === 0) {
              newQueueIndex = -1;
            } else if (newQueueIndex >= newQueue.length) {
              newQueueIndex = newQueue.length - 1;
            }
          }

          return {
            queue: newQueue,
            queueIndex: newQueueIndex,
          };
        });
      },

      // Clear entire queue
      clearQueue: () => {
        set({
          queue: [],
          queueIndex: -1,
        });
        get().stop();
      },

      // Toggle shuffle mode
      setShuffle: (shuffle: boolean) => {
        set({ shuffle });
      },

      // Set repeat mode
      setRepeat: (repeat: "none" | "one" | "all") => {
        set({ repeat });
      },

      // Update playback position (called by audio player)
      updatePosition: (position: number) => {
        set({ position });
      },

      // Update track duration (called by audio player)
      updateDuration: (duration: number) => {
        set({ duration });
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Set error
      setError: (error: string | null) => {
        set({ error });
      },

      // Clear music state (called when user changes)
      clearMusicState: () => {
        console.log("🧹 Clearing music state");
        set({
          currentTrack: null,
          audioUrl: null,
          isPlaying: false,
          isLoading: false,
          duration: 0,
          position: 0,
          queue: [],
          queueIndex: -1,
          error: null,
          // Keep user preferences
          // volume: state.volume,
          // shuffle: state.shuffle,
          // repeat: state.repeat,
        });
      },
    }),
    {
      name: "music-storage",
      storage: createJSONStorage(() => createSafeStorage()),
      partialize: (state) => ({
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        queue: state.queue,
        queueIndex: state.queueIndex,
      }),
      onRehydrateStorage: () => (state) => {
        // Handle rehydration errors silently
        if (state) {
          console.log("🎵 Music store rehydrated successfully");
        }
      },
    }
  )
);
