import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
  FlatList,
  Animated,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase"; // Adjust path as needed

const { width, height } = Dimensions.get('window');

// Types
interface Song {
  id: string;
  title: string;
  artist?: string;
  plays?: number;
  likes: number;
  duration: number;
  image: string;
}

interface Artist {
  id: string;
  name: string;
  image: string;
  followers: string;
}

interface Album {
  id: string;
  title: string;
  trackCount: number;
  image: string;
}

interface Playlist {
  id: string;
  title: string;
  trackCount: number;
  image: string;
}

interface UserProfile {
  id: string;
  displayName: string;
  artistName?: string;
  email: string;
  phone?: string;
  userType: 'artist' | 'listener';
  isArtist: boolean;
  profileImage?: string;
  coverImage?: string;
  bio?: string;
  location?: string;
  website?: string;
  followers: number;
  following: number;
  totalPlays?: number;
  monthlyListeners?: number;
  totalLikes?: number;
  playlistsCreated?: number;
  joinedDate: string;
  verified?: boolean;
  songs?: Song[];
  albums?: Album[];
  followingArtists?: Artist[];
  likedSongs?: Song[];
  playlists?: Playlist[];
}

// Sample/Default data - replace with actual data fetching
const getDefaultProfileData = (userType: 'artist' | 'listener'): UserProfile => {
  const baseProfile = {
    id: userType === 'artist' ? 'artist_123' : 'listener_456',
    displayName: userType === 'artist' ? 'Alex Rivers' : 'Sarah Johnson',
    email: userType === 'artist' ? 'alex@example.com' : 'sarah@example.com',
    phone: userType === 'artist' ? '+1234567890' : '+1987654321',
    userType,
    isArtist: userType === 'artist',
    profileImage: `https://picsum.photos/400/400?random=${userType === 'artist' ? 100 : 200}`,
    coverImage: `https://picsum.photos/800/400?random=${userType === 'artist' ? 101 : 201}`,
    bio: userType === 'artist' 
      ? 'Indie folk artist creating music that speaks to the soul. Based in Nashville, inspired by life\'s beautiful moments.'
      : 'Music lover and playlist curator. Always discovering new artists and sharing great music with friends.',
    location: userType === 'artist' ? 'Nashville, TN' : 'Los Angeles, CA',
    website: userType === 'artist' ? 'https://alexrivers.com' : undefined,
    followers: userType === 'artist' ? 2847 : 234,
    following: userType === 'artist' ? 156 : 89,
    joinedDate: userType === 'artist' ? 'March 2023' : 'January 2024',
    verified: userType === 'artist',
  };

  if (userType === 'artist') {
    return {
      ...baseProfile,
      artistName: 'Alex Rivers',
      totalPlays: 284750,
      monthlyListeners: 12890,
      songs: [
        { id: "1", title: "Midnight Dreams", plays: 45000, likes: 230, duration: 225, image: "https://picsum.photos/200/200?random=1" },
        { id: "2", title: "City Lights", plays: 38000, likes: 189, duration: 252, image: "https://picsum.photos/200/200?random=2" },
        { id: "3", title: "Electric Nights", plays: 52000, likes: 301, duration: 208, image: "https://picsum.photos/200/200?random=3" },
        { id: "4", title: "Jazz Corner", plays: 29000, likes: 145, duration: 333, image: "https://picsum.photos/200/200?random=4" },
      ],
      albums: [
        { id: "a1", title: "Indie Nights", trackCount: 12, image: "https://picsum.photos/300/300?random=10" },
        { id: "a2", title: "Folk Tales", trackCount: 8, image: "https://picsum.photos/300/300?random=11" },
      ]
    };
  } else {
    return {
      ...baseProfile,
      totalLikes: 1250,
      playlistsCreated: 15,
      followingArtists: [
        { id: "1", name: "Alex Rivers", image: "https://picsum.photos/100/100?random=301", followers: "2.8K" },
        { id: "2", name: "Luna Marie", image: "https://picsum.photos/100/100?random=302", followers: "5.2K" },
        { id: "3", name: "The Wanderers", image: "https://picsum.photos/100/100?random=303", followers: "12K" },
        { id: "4", name: "Echo Valley", image: "https://picsum.photos/100/100?random=304", followers: "8.7K" },
      ],
      likedSongs: [
        { id: "1", title: "Midnight Dreams", artist: "Alex Rivers", likes: 230, duration: 225, image: "https://picsum.photos/200/200?random=1" },
        { id: "2", title: "Ocean Waves", artist: "Luna Marie", likes: 445, duration: 252, image: "https://picsum.photos/200/200?random=2" },
        { id: "3", title: "Mountain High", artist: "The Wanderers", likes: 789, duration: 208, image: "https://picsum.photos/200/200?random=3" },
        { id: "4", title: "Silent Storm", artist: "Echo Valley", likes: 334, duration: 333, image: "https://picsum.photos/200/200?random=4" },
      ],
      playlists: [
        { id: "p1", title: "Chill Vibes", trackCount: 45, image: "https://picsum.photos/200/200?random=401" },
        { id: "p2", title: "Workout Hits", trackCount: 32, image: "https://picsum.photos/200/200?random=402" },
        { id: "p3", title: "Late Night Study", trackCount: 28, image: "https://picsum.photos/200/200?random=403" },
      ]
    };
  }
};

const MyProfile: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Safely get session from route params
  const params = route.params as { session?: any } | undefined;
  const session = params?.session;
  
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [300, 100],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  // Fetch user profile data
  useEffect(() => {
    fetchUserProfile();
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Check if session exists
      if (!session) {
        console.log('No session found, redirecting to auth...');
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignUpOrLogIn' }],
        });
        return;
      }

      if (!session?.user) {
        console.log('No authenticated user in session');
        // Use default listener profile for demo
        const profileData = getDefaultProfileData('listener');
        setProfile(profileData);
        setLoading(false);
        return;
      }

      // Get user metadata from session
      const userMetadata = session.user.user_metadata || {};
      const userType = userMetadata.is_artist ? 'artist' : 'listener';
      
      // For now, use default data. Replace this with actual API calls
      // You would typically fetch from your database here
      const profileData = getDefaultProfileData(userType);
      
      // Override with actual session data
      profileData.id = session.user.id;
      profileData.email = session.user.email || profileData.email;
      profileData.displayName = userMetadata.display_name || profileData.displayName;
      profileData.artistName = userMetadata.artist_name || profileData.artistName;
      profileData.userType = userType;
      profileData.isArtist = userMetadata.is_artist || false;
      
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Instead of showing alert, use default data
      console.log('Using default profile data...');
      setProfile(getDefaultProfileData('listener'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen or show edit modal
    navigation.navigate('EditProfile', { session, profile });
  };

  const handleShare = () => {
    // Implement share functionality
    Alert.alert('Share Profile', 'Share functionality would be implemented here');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignUpOrLogIn' }],
              });
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If can't go back, navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home', params: { session } }],
      });
    }
  };

  if (loading || !profile) {
    return (
      <LinearGradient
        colors={['#0A0A0A', '#1A0A1A', '#0A0A0A']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  const isArtist = profile.isArtist;
  const tabs = isArtist 
    ? ['Music', 'Albums', 'About']
    : ['Liked', 'Following', 'Playlists', 'About'];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderSongItem = ({ item }: { item: Song }) => (
    <TouchableOpacity style={styles.songItem} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.songImage} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
        {isArtist ? (
          <View style={styles.songStats}>
            <Ionicons name="play" size={12} color="#8B5CF6" />
            <Text style={styles.statText}>{formatNumber(item.plays || 0)} plays</Text>
            <Ionicons name="heart" size={12} color="#8B5CF6" style={styles.statIcon} />
            <Text style={styles.statText}>{item.likes}</Text>
          </View>
        ) : (
          <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.songPlayButton}>
        <Ionicons name="play" size={16} color="#8B5CF6" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderArtistItem = ({ item }: { item: Artist }) => (
    <TouchableOpacity style={styles.artistItem} activeOpacity={0.8}>
      <View style={styles.artistImageContainer}>
        <Image source={{ uri: item.image }} style={styles.artistImage} />
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.3)', 'rgba(168, 85, 247, 0.1)']}
          style={styles.artistImageOverlay}
        />
      </View>
      <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.artistFollowers}>{item.followers} followers</Text>
      <TouchableOpacity style={styles.followButton}>
        <LinearGradient
          colors={['#8B5CF6', '#A855F7']}
          style={styles.followButtonGradient}
        >
          <Text style={styles.followButtonText}>Following</Text>
        </LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderAlbumItem = ({ item }: { item: Album }) => (
    <TouchableOpacity style={styles.albumItem} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.albumImage} />
      <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.albumTracks}>{item.trackCount} tracks</Text>
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity style={styles.playlistItem} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.playlistImage} />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.playlistTracks}>{item.trackCount} tracks</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        if (isArtist) {
          return (
            <FlatList
              data={profile.songs || []}
              renderItem={renderSongItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No songs uploaded yet</Text>
              }
            />
          );
        } else {
          return (
            <FlatList
              data={profile.likedSongs || []}
              renderItem={renderSongItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No liked songs yet</Text>
              }
            />
          );
        }
      case 1:
        if (isArtist) {
          return (
            <FlatList
              data={profile.albums || []}
              renderItem={renderAlbumItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.albumRow}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No albums created yet</Text>
              }
            />
          );
        } else {
          return (
            <FlatList
              data={profile.followingArtists || []}
              renderItem={renderArtistItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.artistRow}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Not following any artists yet</Text>
              }
            />
          );
        }
      case 2:
        if (!isArtist) {
          return (
            <FlatList
              data={profile.playlists || []}
              renderItem={renderPlaylistItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No playlists created yet</Text>
              }
            />
          );
        }
        // Fall through to About for artists (case 2) or listeners (case 3)
      case 3:
      default:
        return (
          <View style={styles.aboutSection}>
            <View style={styles.aboutItem}>
              <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
              <Text style={styles.aboutText}>Joined {profile.joinedDate}</Text>
            </View>
            <View style={styles.aboutItem}>
              <Ionicons name="location-outline" size={20} color="#8B5CF6" />
              <Text style={styles.aboutText}>{profile.location}</Text>
            </View>
            <View style={styles.aboutItem}>
              <Ionicons name="mail-outline" size={20} color="#8B5CF6" />
              <Text style={styles.aboutText}>{profile.email}</Text>
            </View>
            {profile.website && (
              <View style={styles.aboutItem}>
                <Ionicons name="link-outline" size={20} color="#8B5CF6" />
                <Text style={styles.aboutText}>{profile.website}</Text>
              </View>
            )}
            <View style={styles.bioContainer}>
              <Text style={styles.bioTitle}>Bio</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
            
            {/* Sign Out Button */}
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <LinearGradient
                colors={['rgba(255, 59, 48, 0.1)', 'rgba(255, 59, 48, 0.05)']}
                style={styles.signOutGradient}
              >
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <LinearGradient
        colors={['#0A0A0A', '#1A0A1A', '#0A0A0A']}
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
          {/* Header with Cover Image */}
          <Animated.View style={[styles.header, { height: headerHeight }]}>
            <Animated.Image
              source={{ uri: profile.coverImage }}
              style={[styles.coverImage, { opacity: imageOpacity }]}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.headerOverlay}
            />
            
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
            >
              <View style={styles.backButtonContainer}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
              style={styles.shareButtonHeader}
              onPress={handleShare}
            >
              <View style={styles.shareButtonHeaderContainer}>
                <Ionicons name="share-outline" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Profile Info */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <Image source={{ uri: profile.profileImage }} style={styles.profileImage} />
              {profile.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{profile.displayName}</Text>
              {isArtist && profile.artistName !== profile.displayName && (
                <Text style={styles.artistName}>"{profile.artistName}"</Text>
              )}
              <Text style={styles.userType}>
                {isArtist ? '🎤 Artist' : '🎧 Music Lover'}
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(profile.followers)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(profile.following)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              {isArtist && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{formatNumber(profile.totalPlays || 0)}</Text>
                    <Text style={styles.statLabel}>Total Plays</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{formatNumber(profile.monthlyListeners || 0)}</Text>
                    <Text style={styles.statLabel}>Monthly</Text>
                  </View>
                </>
              )}
              {!isArtist && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{formatNumber(profile.totalLikes || 0)}</Text>
                    <Text style={styles.statLabel}>Likes</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{profile.playlistsCreated || 0}</Text>
                    <Text style={styles.statLabel}>Playlists</Text>
                  </View>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.editButtonGradient}
                >
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <View style={styles.shareButtonContainer}>
                  <Ionicons name="share-outline" size={20} color="#8B5CF6" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tabs.map((tab, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.tab,
                    activeTab === index && styles.activeTab
                  ]}
                  onPress={() => setActiveTab(index)}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === index && styles.activeTabText
                  ]}>
                    {tab}
                  </Text>
                  {activeTab === index && (
                    <LinearGradient
                      colors={['#8B5CF6', '#A855F7']}
                      style={styles.tabIndicator}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {renderTabContent()}
          </View>

          <View style={styles.bottomSpacing} />
        </Animated.ScrollView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  shareButtonHeaderContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    padding: 20,
    marginTop: -50,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#8B5CF6',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0A0A0A',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  displayName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  userType: {
    fontSize: 16,
    color: '#B3B3B3',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#B3B3B3',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    marginHorizontal: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    flex: 1,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareButton: {
    width: 48,
    height: 48,
  },
  shareButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.1)',
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    // Active tab styling handled by indicator
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B3B3B3',
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: 2,
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#B3B3B3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#B3B3B3',
    fontWeight: '500',
  },
  songStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginLeft: 4,
  },
  statIcon: {
    marginLeft: 12,
  },
  songPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  artistItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    marginHorizontal: 6,
  },
  artistRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  artistImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  artistImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  artistFollowers: {
    fontSize: 12,
    color: '#B3B3B3',
    marginBottom: 12,
  },
  followButton: {
    width: '100%',
  },
  followButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  albumItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  albumRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  albumImage: {
    width: (width - 64) / 2,
    height: (width - 64) / 2,
    borderRadius: 16,
    marginBottom: 12,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  albumTracks: {
    fontSize: 12,
    color: '#B3B3B3',
    textAlign: 'center',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  playlistImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playlistTracks: {
    fontSize: 14,
    color: '#B3B3B3',
    fontWeight: '500',
  },
  aboutSection: {
    gap: 16,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  aboutText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  bioContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    color: '#E5E5E5',
    lineHeight: 22,
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: 16,
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default MyProfile;