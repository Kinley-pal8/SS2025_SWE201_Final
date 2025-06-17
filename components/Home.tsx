import React, { useState, useRef } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

// Import the separate components
import UploadModal from "./UploadModal";
import SearchModal from "./SearchModal";
import MusicPlayerCard from "./MusicPlayerCard";

const { width, height } = Dimensions.get("window");

// Song interface
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  plays: string;
  duration: number;
  likes: number;
  image: string;
}

// Sample data
const recentlyPlayed: Song[] = [
  {
    id: "1",
    title: "Midnight Dreams",
    artist: "Local Band",
    album: "Indie Nights",
    plays: "1,240",
    duration: 225,
    likes: 89,
    image: "https://picsum.photos/200/200?random=1",
  },
  {
    id: "2",
    title: "City Lights",
    artist: "Street Musician",
    album: "Folk Tales",
    plays: "856",
    duration: 252,
    likes: 67,
    image: "https://picsum.photos/200/200?random=2",
  },
  {
    id: "3",
    title: "Electric Nights",
    artist: "Garage Rock",
    album: "Power Chords",
    plays: "2,150",
    duration: 208,
    likes: 156,
    image: "https://picsum.photos/200/200?random=3",
  },
  {
    id: "4",
    title: "Jazz Corner",
    artist: "Local Jazz Trio",
    album: "Smooth Vibes",
    plays: "743",
    duration: 333,
    likes: 45,
    image: "https://picsum.photos/200/200?random=4",
  },
  {
    id: "5",
    title: "Hip Hop Heights",
    artist: "Underground MC",
    album: "Street Beats",
    plays: "1,890",
    duration: 197,
    likes: 203,
    image: "https://picsum.photos/200/200?random=5",
  },
];

const madeForYou = [
  {
    id: "p1",
    title: "Discover Weekly",
    description: "Your weekly mixtape of fresh music",
    image: "https://picsum.photos/300/300?random=10",
    type: "playlist",
  },
  {
    id: "p2",
    title: "Daily Mix 1",
    description: "Indie, Folk, and more",
    image: "https://picsum.photos/300/300?random=11",
    type: "playlist",
  },
  {
    id: "p3",
    title: "Release Radar",
    description: "Catch all the latest music",
    image: "https://picsum.photos/300/300?random=12",
    type: "playlist",
  },
  {
    id: "p4",
    title: "Liked Songs",
    description: "203 liked songs",
    image: "https://picsum.photos/300/300?random=13",
    type: "playlist",
  },
];

const quickPicks = [
  {
    id: "q1",
    title: "Liked Songs",
    image: "https://picsum.photos/100/100?random=20",
    icon: "heart",
  },
  {
    id: "q2",
    title: "Recently Played",
    image: "https://picsum.photos/100/100?random=21",
    icon: "time",
  },
  {
    id: "q3",
    title: "Local Favorites",
    image: "https://picsum.photos/100/100?random=22",
    icon: "location",
  },
  {
    id: "q4",
    title: "Discover Mix",
    image: "https://picsum.photos/100/100?random=23",
    icon: "compass",
  },
  {
    id: "q5",
    title: "Chill Vibes",
    image: "https://picsum.photos/100/100?random=24",
    icon: "leaf",
  },
  {
    id: "q6",
    title: "Workout",
    image: "https://picsum.photos/100/100?random=25",
    icon: "fitness",
  },
];

export default function Home({ route }) {
  const navigation = useNavigation();
  const { session } = route.params || {};
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

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  // User settings
  const isArtist = true; // This should come from your auth/user data

  const getGreeting = () => {
    const greetings = {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    };
    return greetings[currentTime];
  };

  const getGreetingIcon = () => {
    const icons = {
      morning: "sunny",
      afternoon: "partly-sunny",
      evening: "moon",
    };
    return icons[currentTime];
  };

  const handleSongPress = (song: Song) => {
    setSelectedSong(song);
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
  };

  const handleSongChange = (song: Song) => {
    setSelectedSong(song);
  };

  const renderQuickPick = ({ item, index }) => (
    <TouchableOpacity style={styles.quickPickItem} activeOpacity={0.8}>
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

  const renderPlaylistCard = ({ item }) => (
    <TouchableOpacity style={styles.playlistCard} activeOpacity={0.8}>
      <View style={styles.playlistImageContainer}>
        <Image source={{ uri: item.image }} style={styles.playlistImage} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.playlistImageOverlay}
        />
        <View style={styles.playlistPlayButton}>
          <LinearGradient
            colors={["#8B5CF6", "#A855F7"]}
            style={styles.playButtonGradient}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </View>
      <Text style={styles.playlistTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.playlistDescription} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentSong = ({ item, index }) => (
    <TouchableOpacity
      style={styles.recentSongItem}
      onPress={() => handleSongPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.songImageContainer}>
        <Image source={{ uri: item.image }} style={styles.songImage} />
        <View style={styles.songImageOverlay}>
          <LinearGradient
            colors={["rgba(139, 92, 246, 0.3)", "rgba(168, 85, 247, 0.2)"]}
            style={styles.songImageGradient}
          />
        </View>
      </View>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.songMetadata}>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          <View style={styles.songStats}>
            <Ionicons name="play" size={12} color="#8B5CF6" />
            <Text style={styles.songPlays}>{item.plays}</Text>
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
          <Ionicons name="play" size={16} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
                  <Text style={styles.greeting}>{getGreeting()}</Text>
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
                  onPress={() => navigation.navigate("Account", { session })}
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

                {isArtist && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setShowUpload(true)}
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
              </View>
            </LinearGradient>
          </Animated.View>

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

          {/* Recently Played */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="time-outline" size={24} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Recently played</Text>
              </View>
              <TouchableOpacity style={styles.showAllButton}>
                <Text style={styles.showAll}>Show all</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentlyPlayed.slice(0, 3)}
              renderItem={renderRecentSong}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </View>

          {/* Made For You */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="sparkles" size={24} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Made for you</Text>
              </View>
              <TouchableOpacity style={styles.showAllButton}>
                <Text style={styles.showAll}>Show all</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={madeForYou}
              renderItem={renderPlaylistCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            />
          </View>

          {/* Your Top Mixes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="trophy-outline" size={24} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Your top mixes</Text>
              </View>
              <TouchableOpacity style={styles.showAllButton}>
                <Text style={styles.showAll}>Show all</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={madeForYou.slice(1)}
              renderItem={renderPlaylistCard}
              keyExtractor={(item) => `top_${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            />
          </View>

          {/* Jump back in */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="refresh-outline" size={24} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Jump back in</Text>
              </View>
              <TouchableOpacity style={styles.showAllButton}>
                <Text style={styles.showAll}>Show all</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentlyPlayed.slice(2)}
              renderItem={renderRecentSong}
              keyExtractor={(item) => `jump_${item.id}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </View>

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
          onSongPress={handleSongPress}
        />

        {selectedSong && (
          <MusicPlayerCard
            visible={showPlayer}
            onClose={handleClosePlayer}
            song={selectedSong}
            playlist={recentlyPlayed}
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  spacer: {
    width: 44, // Same width as iconButton to balance layout
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
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: (width - 72) / 4 - 6, // Responsive width with gaps
    maxWidth: (width - 72) / 3, // Max width for better fit
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
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  profileButton: {
    backgroundColor: "transparent",
  },
  profileButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  uploadButton: {
    backgroundColor: "transparent",
  },
  uploadButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  recentSongItem: {
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
  songImageContainer: {
    position: "relative",
  },
  songImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  songImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  songImageGradient: {
    flex: 1,
    borderRadius: 12,
  },
  songInfo: {
    flex: 1,
    marginLeft: 16,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  songMetadata: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  songArtist: {
    fontSize: 14,
    color: "#B3B3B3",
    flex: 1,
    fontWeight: "500",
  },
  songStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  songPlays: {
    fontSize: 12,
    color: "#8B5CF6",
    marginLeft: 4,
    fontWeight: "600",
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
  playlistCard: {
    width: 180,
  },
  playlistImageContainer: {
    position: "relative",
    marginBottom: 12,
  },
  playlistImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
  },
  playlistImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  playlistPlayButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  playButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  playlistDescription: {
    fontSize: 13,
    color: "#B3B3B3",
    lineHeight: 18,
    fontWeight: "500",
  },
  bottomSpacing: {
    height: 40,
  },
});
