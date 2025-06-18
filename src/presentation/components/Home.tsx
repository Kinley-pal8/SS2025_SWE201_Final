import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Animated,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Import the Zustand stores (updated paths based on your structure)
import { useAuthStore } from "../../persistence/stores/authStore";
import { useTracksStore } from "../../persistence/stores/tracksStore";
import { useMusicStore } from "../../persistence/stores/musicStore";

// Import the separate components (keep your existing imports)
import UploadModal from "./UploadModal";
import SearchModal from "./SearchModal";
import MusicPlayerCard, { Song as PlayerSong } from "./MusicPlayerCard";

const { width, height } = Dimensions.get("window");

// Updated Song interface to match database schema
export interface Song {
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

// Simplified quick picks - just core features
const quickPicks = [
  {
    id: "q1",
    title: "All Tracks",
    image: "https://picsum.photos/100/100?random=20",
    icon: "musical-notes",
  },
  {
    id: "q2",
    title: "Recently Added",
    image: "https://picsum.photos/100/100?random=21",
    icon: "time",
  },
  {
    id: "q3",
    title: "My Favorites",
    image: "https://picsum.photos/100/100?random=22",
    icon: "heart",
  },
  {
    id: "q4",
    title: "Search",
    image: "https://picsum.photos/100/100?random=23",
    icon: "search",
  },
];

export default function Home() {
  const navigation = useNavigation();

  // Get data from stores instead of route params
  const { user, profile, loading: authLoading, clearUserData } = useAuthStore();
  const {
    tracks,
    loading: tracksLoading,
    error: tracksError,
    loadTracks,
    clearError,
    clearTracks,
  } = useTracksStore();
  const {
    currentTrack,
    loadTrack,
    play,
    setQueue,
    isPlaying,
    clearMusicState,
  } = useMusicStore();

  // Helper function to check if user is an artist (same as Account.tsx)
  const isUserArtist = () => {
    return profile?.is_artist === true || 
           user?.user_metadata?.is_artist === true || 
           profile?.user_type === 'artist' || 
           user?.user_metadata?.user_type === 'artist';
  };

  const [currentTime, setCurrentTime] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  });

  // Modal states
  const [showUpload, setShowUpload] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  // Debug logging
  useEffect(() => {
    console.log("🏠 HOME DEBUG - Raw user object:", user);
    console.log("🏠 HOME DEBUG - User metadata:", user?.user_metadata);
    console.log("🏠 HOME DEBUG - Raw profile object:", profile);
    
    // Check all possible ways the app might determine artist status
    console.log("🎤 HOME ARTIST STATUS CHECKS:");
    console.log("  - profile?.is_artist:", profile?.is_artist);
    console.log("  - profile?.user_type:", profile?.user_type);
    console.log("  - user?.user_metadata?.is_artist:", user?.user_metadata?.is_artist);
    console.log("  - user?.user_metadata?.user_type:", user?.user_metadata?.user_type);
    console.log("  - isUserArtist():", isUserArtist());
  }, [user, profile]);

  // Load tracks when user changes
  useEffect(() => {
    if (user) {
      console.log("👤 User logged in:", user.email);
      loadTracks(true);
    } else {
      console.log("👤 No user, clearing data");
      // Clear all data when no user
      clearTracks();
      clearMusicState();
    }
  }, [user?.id]); // Watch user ID specifically

  // Handle auth state changes
  useEffect(() => {
    if (!authLoading && !user) {
      console.log("🔄 Redirecting to auth...");
      (navigation as any).replace("SignUpOrLogIn");
    }
  }, [user, authLoading, navigation]);

  // Debug current user state
  useEffect(() => {
    console.log("🔍 Current user state:", {
      user: user?.email,
      userId: user?.id,
      profile: profile?.display_name,
      tracksCount: tracks.length,
      isArtist: isUserArtist(),
    });
  }, [user, profile, tracks]);

  // Debug function to test data fetching
  const debugDataFetch = async () => {
    console.log("🧪 Testing data fetch...");
    try {
      // Load tracks from database
      await loadTracks(true);

      console.log("✅ Data fetch test completed");
    } catch (error) {
      console.error("❌ Data fetch test failed:", error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    clearError();
    await loadTracks(true);
    setRefreshing(false);
  };

  // Convert database track to Song format for existing components
  const convertTrackToSong = (track: any): Song => ({
    id: track.id,
    title: track.title,
    artist:
      track.users?.artist_name || track.users?.display_name || "Unknown Artist",
    album: track.album || "Unknown Album",
    plays: track.play_count?.toString() || "0",
    duration: track.duration || 0,
    likes: 0, // You can add likes functionality later
    image: track.cover_image_path
      ? `https://picsum.photos/200/200?random=${track.id}` // Placeholder until you implement cover images
      : "https://picsum.photos/200/200?random=default",
    // Keep original track data
    ...track,
  });

  // Convert to PlayerSong format for MusicPlayerCard
  const convertToPlayerSong = (song: Song): PlayerSong => ({
    id: song.id,
    title: song.title,
    artist:
      song.users?.artist_name || song.users?.display_name || "Unknown Artist",
    album: song.album || "Unknown Album",
    plays: song.play_count?.toString() || "0",
    duration: song.duration || 0,
    likes: 0, // Will implement likes later
    image:
      song.cover_image_path || "https://picsum.photos/200/200?random=default",
  });

  const getGreeting = () => {
    const greetings: Record<string, string> = {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    };
    return greetings[currentTime];
  };

  const getGreetingIcon = () => {
    const icons: Record<string, any> = {
      morning: "sunny",
      afternoon: "partly-sunny",
      evening: "moon",
    };
    return icons[currentTime];
  };

  const handleSongPress = async (song: Song) => {
    try {
      // Convert all tracks to song format for the queue
      const allSongs = tracks.map(convertTrackToSong);
      const songIndex = allSongs.findIndex((s) => s.id === song.id);

      // Set up the queue
      setQueue(tracks, songIndex);

      // Load and play the track
      await loadTrack(song);
      play();

      // Show the player
      setSelectedSong(song);
      setShowPlayer(true);
    } catch (error) {
      console.error("Failed to play song:", error);
    }
  };

  // Wrapper for SearchModal which expects synchronous function with different Song interface
  const handleSongPressSync = (searchSong: any) => {
    // Convert SearchModal Song to our Track format
    const trackSong: Song = {
      id: searchSong.id,
      title: searchSong.title,
      artist_id: "", // We don't have this from search
      album: searchSong.album,
      file_path: searchSong.audioUrl || "",
      duration: searchSong.duration,
      play_count: parseInt(searchSong.plays) || 0,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      users: {
        display_name: searchSong.artist,
        artist_name: searchSong.artist,
      },
      cover_image_path: searchSong.image,
    };
    handleSongPress(trackSong); // Fire and forget async call
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
  };

  const handleSongChange = (song: PlayerSong) => {
    // Convert PlayerSong back to our Song format
    const homeSong = recentlyAdded.find((s) => s.id === song.id);
    if (homeSong) {
      setSelectedSong(homeSong);
    }
  };

  const handleQuickPickPress = (item: any) => {
    switch (item.icon) {
      case "search":
        setShowSearch(true);
        break;
      case "musical-notes":
        // Could navigate to all tracks screen
        break;
      case "time":
        // Could show recently added
        break;
      case "heart":
        // Could show favorites (when implemented)
        break;
    }
  };

  // Get tracks organized by different criteria
  const recentlyAdded = tracks.slice(0, 10).map(convertTrackToSong);
  const allTracks = tracks.map(convertTrackToSong);

  const renderQuickPick = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.quickPickItem}
      activeOpacity={0.8}
      onPress={() => handleQuickPickPress(item)}
    >
      <LinearGradient
        colors={[
          index % 3 === 0 ? "#8B5CF6" : index % 3 === 1 ? "#A855F7" : "#9333EA",
          index % 3 === 0 ? "#A855F7" : index % 3 === 1 ? "#9333EA" : "#8B5CF6",
        ]}
        style={styles.quickPickGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Image source={{ uri: item.image }} style={styles.quickPickImage} />
        <View style={styles.quickPickContent}>
          <Text style={styles.quickPickTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.quickPickIcon}>
            <Ionicons name={item.icon} size={16} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderTrackItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handleSongPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.trackImageContainer}>
        <Image source={{ uri: item.image }} style={styles.trackImage} />
        <View style={styles.trackImageOverlay}>
          <LinearGradient
            colors={["rgba(139, 92, 246, 0.3)", "rgba(168, 85, 247, 0.2)"]}
            style={styles.trackImageGradient}
          />
        </View>
      </View>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.trackMetadata}>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          <View style={styles.trackStats}>
            <Ionicons name="play" size={12} color="#8B5CF6" />
            <Text style={styles.trackPlays}>{item.plays} plays</Text>
            {item.genre && (
              <>
                <Text style={styles.trackDivider}>•</Text>
                <Text style={styles.trackGenre}>{item.genre}</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => handleSongPress(item)}
      >
        <LinearGradient
          colors={["#8B5CF6", "#A855F7"]}
          style={styles.playButtonSmall}
        >
          <Ionicons
            name={currentTrack?.id === item.id && isPlaying ? "pause" : "play"}
            size={16}
            color="#FFFFFF"
          />
        </LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Show loading screen while initializing
  if (authLoading) {
    return (
      <LinearGradient
        colors={["#0A0A0A", "#1A0A1A", "#0A0A0A"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    );
  }

  // Redirect handled in useEffect, but show nothing while redirecting
  if (!user) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <LinearGradient
        colors={["#0A0A0A", "#1A0A1A", "#0A0A0A"]}
        style={styles.container}
      >
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#8B5CF6"]}
              tintColor="#8B5CF6"
            />
          }
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
            <LinearGradient
              colors={["rgba(139, 92, 246, 0.1)", "transparent"]}
              style={styles.headerGradient}
            >
              {/* Main Header Content */}
              <View style={styles.headerContent}>
                <View style={styles.greetingContainer}>
                  <Ionicons
                    name={getGreetingIcon()}
                    size={28}
                    color="#8B5CF6"
                  />
                  <Text style={styles.greeting}>
                    {getGreeting()},{" "}
                    {profile?.display_name ||
                      user?.email?.split("@")[0] ||
                      "Music Lover"}
                    !
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowSearch(true)}
                >
                  <LinearGradient
                    colors={[
                      "rgba(255, 255, 255, 0.1)",
                      "rgba(255, 255, 255, 0.05)",
                    ]}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="search-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Search</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => (navigation as any).navigate("Account")}
                >
                  <LinearGradient
                    colors={[
                      "rgba(139, 92, 246, 0.2)",
                      "rgba(168, 85, 247, 0.1)",
                    ]}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="person-outline" size={22} color="#8B5CF6" />
                    <Text
                      style={[styles.actionButtonText, { color: "#8B5CF6" }]}
                    >
                      Profile
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Upload button - NOW USES CORRECTED ARTIST CHECK */}
                {isUserArtist() && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      console.log("🎵 Upload button pressed!");
                      setShowUpload(true);
                    }}
                  >
                    <LinearGradient
                      colors={["#8B5CF6", "#A855F7"]}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="add" size={22} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Upload</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Load tracks button */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => loadTracks(true)}
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={22}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>Load Tracks</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Debug fetch button */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={debugDataFetch}
                >
                  <LinearGradient
                    colors={["#F59E0B", "#D97706"]}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons
                      name="download-outline"
                      size={22}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>Debug Fetch</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Error Message */}
          {tracksError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{tracksError}</Text>
              <TouchableOpacity
                onPress={handleRefresh}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Debug Status Panel */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              📊 Status: {tracks.length} tracks loaded | User:{" "}
              {user?.email || "Not logged"} | Profile:{" "}
              {profile?.artist_name || profile?.display_name || "None"}
            </Text>
            <Text style={styles.debugText}>
              🎤 Artist Status: {isUserArtist() ? "TRUE" : "FALSE"} | Upload Button: {isUserArtist() ? "VISIBLE" : "HIDDEN"}
            </Text>
            {tracksLoading && (
              <Text style={styles.debugText}>🔄 Loading...</Text>
            )}
          </View>

          {/* Quick Picks Grid */}
          <View style={styles.section}>
            <FlatList
              data={quickPicks}
              renderItem={renderQuickPick}
              numColumns={2}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              columnWrapperStyle={styles.quickPickRow}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          </View>

          {/* Recently Added Tracks */}
          {recentlyAdded.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="time-outline" size={24} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>Recently added</Text>
                </View>
                <TouchableOpacity style={styles.showAllButton}>
                  <Text style={styles.showAll}>Show all ({tracks.length})</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
                </TouchableOpacity>
              </View>

              {tracksLoading ? (
                <View style={styles.sectionLoading}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={styles.loadingText}>Loading tracks...</Text>
                </View>
              ) : (
                <FlatList
                  data={recentlyAdded.slice(0, 5)}
                  renderItem={renderTrackItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
              )}
            </View>
          )}

          {/* All Tracks (if more than 5) */}
          {allTracks.length > 5 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons
                    name="musical-notes-outline"
                    size={24}
                    color="#8B5CF6"
                  />
                  <Text style={styles.sectionTitle}>All tracks</Text>
                </View>
                <TouchableOpacity style={styles.showAllButton}>
                  <Text style={styles.showAll}>Shuffle all</Text>
                  <Ionicons name="shuffle" size={16} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={allTracks.slice(5, 15)} // Show next 10 tracks
                renderItem={renderTrackItem}
                keyExtractor={(item) => `all_${item.id}`}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            </View>
          )}

          {/* Tracks by Genre (if tracks have genres) */}
          {tracks.some((track) => track.genre) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="disc-outline" size={24} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>Browse by genre</Text>
                </View>
              </View>
              <FlatList
                data={[
                  ...new Set(tracks.filter((t) => t.genre).map((t) => t.genre)),
                ].slice(0, 6)}
                renderItem={({ item: genre }) => (
                  <TouchableOpacity style={styles.genreItem}>
                    <LinearGradient
                      colors={["#8B5CF6", "#A855F7"]}
                      style={styles.genreGradient}
                    >
                      <Text style={styles.genreText}>{genre}</Text>
                      <Text style={styles.genreCount}>
                        {tracks.filter((t) => t.genre === genre).length} tracks
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item || "unknown"}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
            </View>
          )}

          {/* Empty State */}
          {!tracksLoading && tracks.length === 0 && !tracksError && (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="musical-notes-outline"
                size={64}
                color="#666666"
              />
              <Text style={styles.emptyTitle}>No tracks yet</Text>
              <Text style={styles.emptyDescription}>
                {isUserArtist()
                  ? "Upload your first track to get started"
                  : "Discover amazing music from local artists"}
              </Text>
              {isUserArtist() && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setShowUpload(true)}
                >
                  <LinearGradient
                    colors={["#8B5CF6", "#A855F7"]}
                    style={styles.emptyButtonGradient}
                  >
                    <Text style={styles.emptyButtonText}>Upload Track</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.ScrollView>

        {/* Real Modal Components */}
        <UploadModal
          visible={showUpload}
          onClose={() => setShowUpload(false)}
        />

        <SearchModal
          visible={showSearch}
          onClose={() => setShowSearch(false)}
          onSongPress={handleSongPressSync}
        />

        {selectedSong && (
          <MusicPlayerCard
            visible={showPlayer}
            onClose={handleClosePlayer}
            song={convertToPlayerSong(selectedSong)}
            playlist={recentlyAdded.map(convertToPlayerSong)}
            onSongChange={handleSongChange}
          />
        )}
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
  },
  loadingText: {
    color: "#B3B3B3",
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 10,
  },
  headerContent: {
    alignItems: "center",
    marginBottom: 20,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 12,
    letterSpacing: -0.5,
    textAlign: "center",
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: (width - 72) / 4 - 6,
    maxWidth: (width - 72) / 3,
  },
  actionButtonGradient: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    minHeight: 64,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 4,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: "center",
  },
  retryText: {
    color: "#8B5CF6",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  showAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  showAll: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "600",
    marginRight: 4,
  },
  sectionLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  quickPickRow: {
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  quickPickItem: {
    width: (width - 52) / 2,
    height: 72,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  quickPickGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
  },
  quickPickImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  quickPickContent: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
  },
  quickPickTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  quickPickIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.1)",
  },
  trackImageContainer: {
    position: "relative",
  },
  trackImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  trackImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  trackImageGradient: {
    flex: 1,
    borderRadius: 12,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 16,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  trackMetadata: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  trackArtist: {
    fontSize: 14,
    color: "#B3B3B3",
    fontWeight: "500",
    marginBottom: 2,
  },
  trackStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  trackPlays: {
    fontSize: 12,
    color: "#8B5CF6",
    marginLeft: 4,
    fontWeight: "600",
  },
  trackDivider: {
    color: "#666666",
    marginHorizontal: 6,
    fontSize: 12,
  },
  trackGenre: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
  },
  playButton: {
    marginLeft: 16,
  },
  playButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  genreItem: {
    borderRadius: 12,
    overflow: "hidden",
  },
  genreGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: "center",
  },
  genreText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  genreCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#B3B3B3",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 20,
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  debugContainer: {
    backgroundColor: "rgba(75, 85, 99, 0.1)",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.2)",
  },
  debugText: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 2,
  },
  bottomSpacing: {
    height: 40,
  },
});