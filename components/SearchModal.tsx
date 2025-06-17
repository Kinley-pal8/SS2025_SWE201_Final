import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  FlatList,
  Image,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

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

interface Artist {
  id: string;
  name: string;
  followers: string;
  image: string;
  isFollowing: boolean;
}

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSongPress: (song: Song) => void;
}

// Sample search data
const sampleArtists: Artist[] = [
  { id: "a1", name: "Local Band", followers: "12.5K", image: "https://picsum.photos/150/150?random=30", isFollowing: false },
  { id: "a2", name: "Street Musician", followers: "8.2K", image: "https://picsum.photos/150/150?random=31", isFollowing: true },
  { id: "a3", name: "Garage Rock", followers: "25.1K", image: "https://picsum.photos/150/150?random=32", isFollowing: false },
  { id: "a4", name: "Local Jazz Trio", followers: "5.7K", image: "https://picsum.photos/150/150?random=33", isFollowing: false },
];

const sampleTracks: Song[] = [
  { id: "1", title: "Midnight Dreams", artist: "Local Band", album: "Indie Nights", plays: "1,240", duration: 225, likes: 89, image: "https://picsum.photos/200/200?random=1" },
  { id: "2", title: "City Lights", artist: "Street Musician", album: "Folk Tales", plays: "856", duration: 252, likes: 67, image: "https://picsum.photos/200/200?random=2" },
  { id: "3", title: "Electric Nights", artist: "Garage Rock", album: "Power Chords", plays: "2,150", duration: 208, likes: 156, image: "https://picsum.photos/200/200?random=3" },
  { id: "4", title: "Jazz Corner", artist: "Local Jazz Trio", album: "Smooth Vibes", plays: "743", duration: 333, likes: 45, image: "https://picsum.photos/200/200?random=4" },
  { id: "5", title: "Hip Hop Heights", artist: "Underground MC", album: "Street Beats", plays: "1,890", duration: 197, likes: 203, image: "https://picsum.photos/200/200?random=5" },
  { id: "6", title: "Acoustic Sunset", artist: "Folk Singer", album: "Simple Times", plays: "1,120", duration: 245, likes: 78, image: "https://picsum.photos/200/200?random=6" },
  { id: "7", title: "Digital Dreams", artist: "Electronic Duo", album: "Synth Wave", plays: "3,440", duration: 188, likes: 289, image: "https://picsum.photos/200/200?random=7" },
];

const recentSearches = ["Local Band", "Jazz Corner", "Indie music", "Folk Tales"];

const musicGenres = [
  { name: "Rock", color: "#E53E3E", icon: "musical-notes" },
  { name: "Jazz", color: "#38B2AC", icon: "library" },
  { name: "Hip Hop", color: "#805AD5", icon: "mic" },
  { name: "Electronic", color: "#3182CE", icon: "radio" },
  { name: "Folk", color: "#D69E2E", icon: "leaf" },
  { name: "Indie", color: "#38A169", icon: "heart" },
];

const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose, onSongPress }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTab, setSearchTab] = useState("tracks");
  const [searchResults, setSearchResults] = useState({ tracks: [], artists: [] });
  const [followedArtists, setFollowedArtists] = useState(new Set(["a2"]));
  const [likedTracks, setLikedTracks] = useState(new Set(["1", "3", "5"]));

  // Animation refs
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Focus search input after animation
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      const filteredTracks = sampleTracks.filter(track => 
        track.title.toLowerCase().includes(query.toLowerCase()) ||
        track.artist.toLowerCase().includes(query.toLowerCase())
      );
      const filteredArtists = sampleArtists.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults({ tracks: filteredTracks, artists: filteredArtists });
    } else {
      setSearchResults({ tracks: [], artists: [] });
    }
  };

  const handleFollow = (artistId: string) => {
    setFollowedArtists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(artistId)) {
        newSet.delete(artistId);
      } else {
        newSet.add(artistId);
      }
      return newSet;
    });
  };

  const handleLike = (trackId: string) => {
    setLikedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults({ tracks: [], artists: [] });
    onClose();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults({ tracks: [], artists: [] });
    searchInputRef.current?.focus();
  };

  const renderSearchTrack = ({ item }: { item: Song }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => onSongPress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
        style={styles.searchResultGradient}
      >
        <View style={styles.searchResultImageContainer}>
          <Image source={{ uri: item.image }} style={styles.searchResultImage} />
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.3)', 'rgba(168, 85, 247, 0.1)']}
            style={styles.searchResultImageOverlay}
          />
        </View>
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.searchResultMetadata}>
            <Text style={styles.searchResultSubtitle} numberOfLines={1}>{item.artist}</Text>
            <View style={styles.searchResultStats}>
              <Ionicons name="play" size={12} color="#8B5CF6" />
              <Text style={styles.searchResultPlays}>{item.plays}</Text>
            </View>
          </View>
        </View>
        <View style={styles.searchActions}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              likedTracks.has(item.id) && styles.actionButtonActive
            ]}
            onPress={() => handleLike(item.id)}
          >
            <Ionicons 
              name={likedTracks.has(item.id) ? "heart" : "heart-outline"} 
              size={16} 
              color={likedTracks.has(item.id) ? "#FFFFFF" : "#8B5CF6"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.playButton}
            onPress={() => onSongPress(item)}
          >
            <LinearGradient
              colors={['#8B5CF6', '#A855F7']}
              style={styles.playButtonGradient}
            >
              <Ionicons name="play" size={14} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSearchArtist = ({ item }: { item: Artist }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
        style={styles.searchResultGradient}
      >
        <View style={styles.searchResultImageContainer}>
          <Image source={{ uri: item.image }} style={styles.artistImage} />
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.3)', 'rgba(168, 85, 247, 0.1)']}
            style={styles.artistImageOverlay}
          />
        </View>
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.searchResultSubtitle} numberOfLines={1}>
            {item.followers} followers
          </Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.followButton, 
            followedArtists.has(item.id) && styles.followButtonActive
          ]}
          onPress={() => handleFollow(item.id)}
        >
          {followedArtists.has(item.id) ? (
            <LinearGradient
              colors={['#8B5CF6', '#A855F7']}
              style={styles.followButtonGradient}
            >
              <Text style={styles.followButtonTextActive}>Following</Text>
            </LinearGradient>
          ) : (
            <View style={styles.followButtonInactive}>
              <Text style={styles.followButtonText}>Follow</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.recentSearchItem}
      onPress={() => handleSearch(item)}
      activeOpacity={0.8}
    >
      <View style={styles.recentSearchIconContainer}>
        <Ionicons name="time-outline" size={18} color="#8B5CF6" />
      </View>
      <Text style={styles.recentSearchText}>{item}</Text>
      <Ionicons name="arrow-up-outline" size={16} color="#666" style={styles.recentSearchArrow} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" />
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={handleClose}
          activeOpacity={1}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#1A0A1A', '#0A0A0A']}
            style={styles.modalGradient}
          >
            {/* Handle Bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={handleClose}
                style={styles.headerButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View style={styles.headerTitleContainer}>
                <Ionicons name="search-outline" size={24} color="#8B5CF6" />
                <Text style={styles.modalTitle}>Search Music</Text>
              </View>
              
              <View style={styles.headerSpacer} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.searchBarGradient}
              >
                <Ionicons name="search-outline" size={20} color="#8B5CF6" style={styles.searchIcon} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search artists, songs, or albums"
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>

            {/* Search Tabs */}
            {searchQuery.length > 0 && (
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, searchTab === "tracks" && styles.tabActive]}
                  onPress={() => setSearchTab("tracks")}
                >
                  {searchTab === "tracks" ? (
                    <LinearGradient
                      colors={['#8B5CF6', '#A855F7']}
                      style={styles.tabActiveGradient}
                    >
                      <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
                      <Text style={styles.tabTextActive}>
                        Tracks ({searchResults.tracks.length})
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tabInactive}>
                      <Ionicons name="musical-notes-outline" size={16} color="#666" />
                      <Text style={styles.tabText}>
                        Tracks ({searchResults.tracks.length})
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.tab, searchTab === "artists" && styles.tabActive]}
                  onPress={() => setSearchTab("artists")}
                >
                  {searchTab === "artists" ? (
                    <LinearGradient
                      colors={['#8B5CF6', '#A855F7']}
                      style={styles.tabActiveGradient}
                    >
                      <Ionicons name="person" size={16} color="#FFFFFF" />
                      <Text style={styles.tabTextActive}>
                        Artists ({searchResults.artists.length})
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tabInactive}>
                      <Ionicons name="person-outline" size={16} color="#666" />
                      <Text style={styles.tabText}>
                        Artists ({searchResults.artists.length})
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Search Results or Recent Searches */}
            <ScrollView 
              style={styles.searchResults}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {searchQuery.length === 0 ? (
                // Recent Searches & Categories
                <View style={styles.searchContent}>
                  <View style={styles.recentSection}>
                    <Text style={styles.searchSectionTitle}>Recent searches</Text>
                    <FlatList
                      data={recentSearches}
                      renderItem={renderRecentSearch}
                      keyExtractor={(item, index) => `recent_${index}`}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    />
                  </View>
                  
                  {/* Browse Categories */}
                  <View style={styles.categoriesSection}>
                    <Text style={styles.searchSectionTitle}>Browse genres</Text>
                    <View style={styles.categoriesGrid}>
                      {musicGenres.map((genre, index) => (
                        <TouchableOpacity 
                          key={genre.name}
                          style={styles.categoryCard}
                          onPress={() => handleSearch(genre.name)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={[genre.color, `${genre.color}80`]}
                            style={styles.categoryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name={genre.icon} size={24} color="#FFFFFF" />
                            <Text style={styles.categoryText}>{genre.name}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              ) : (
                // Search Results
                <View style={styles.searchContent}>
                  {searchResults.tracks.length === 0 && searchResults.artists.length === 0 ? (
                    <View style={styles.noResultsContainer}>
                      <View style={styles.noResultsIconContainer}>
                        <Ionicons name="search-outline" size={48} color="#666" />
                      </View>
                      <Text style={styles.noResultsText}>No results found</Text>
                      <Text style={styles.noResultsSubtext}>
                        Try searching for something else or check your spelling
                      </Text>
                    </View>
                  ) : (
                    <>
                      {searchTab === "tracks" ? (
                        <FlatList
                          data={searchResults.tracks}
                          renderItem={renderSearchTrack}
                          keyExtractor={(item) => `search_track_${item.id}`}
                          scrollEnabled={false}
                          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                        />
                      ) : (
                        <FlatList
                          data={searchResults.artists}
                          renderItem={renderSearchArtist}
                          keyExtractor={(item) => `search_artist_${item.id}`}
                          scrollEnabled={false}
                          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                        />
                      )}
                    </>
                  )}
                </View>
              )}
              
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: height * 0.95,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.1)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  tabActive: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  tabInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchResults: {
    flex: 1,
  },
  searchContent: {
    paddingHorizontal: 20,
  },
  recentSection: {
    marginBottom: 32,
  },
  searchSectionTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  recentSearchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recentSearchArrow: {
    transform: [{ rotate: '45deg' }],
  },
  categoriesSection: {
    marginBottom: 32,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 64) / 2,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchResultItem: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchResultGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  searchResultImageContainer: {
    position: 'relative',
  },
  searchResultImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  searchResultImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  artistImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  artistImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  searchResultMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: '#B3B3B3',
    fontWeight: '500',
    flex: 1,
  },
  searchResultStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultPlays: {
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 4,
    fontWeight: '600',
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  playButton: {
    borderRadius: 18,
  },
  playButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  followButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 12,
  },
  followButtonActive: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  followButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonInactive: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  followButtonTextActive: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noResultsText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#B3B3B3',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default SearchModal;