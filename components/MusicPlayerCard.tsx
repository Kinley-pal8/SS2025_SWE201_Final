import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

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
  audioUrl?: string; // Add audio URL for playback
}

interface MusicPlayerCardProps {
  visible: boolean;
  onClose: () => void;
  song: Song;
  playlist: Song[];
  onSongChange: (song: Song) => void;
}

const MusicPlayerCard: React.FC<MusicPlayerCardProps> = ({
  visible,
  onClose,
  song,
  playlist,
  onSongChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.duration);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one
  const [isLoading, setIsLoading] = useState(false);

  // Audio refs
  const sound = useRef<Audio.Sound | null>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(height)).current;
  const albumRotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const likeAnim = useRef(new Animated.Value(1)).current;

  // Initialize audio system
  React.useEffect(() => {
    const initializeAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    if (visible) {
      initializeAudio();
      loadAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [visible, song]);

  // Load audio for current song
  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      // Cleanup previous sound
      if (sound.current) {
        await sound.current.unloadAsync();
        sound.current = null;
      }

      // For demo purposes, using a sample audio URL
      // Replace this with your actual audio URL from the song object
      const audioUri = song.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { 
          shouldPlay: false,
          isLooping: repeatMode === 2,
          volume: 1.0,
        }
      );

      sound.current = newSound;

      // Set up playback status updates
      sound.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

      // Get duration
      const status = await sound.current.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(Math.floor(status.durationMillis / 1000));
      }

    } catch (error) {
      console.error('Failed to load audio:', error);
      Alert.alert('Error', 'Failed to load audio file');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle playback status updates
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setCurrentTime(Math.floor(status.positionMillis / 1000));
      setIsPlaying(status.isPlaying);
      
      // Handle song end
      if (status.didJustFinish && !status.isLooping) {
        handleSongEnd();
      }
    }
  };

  // Cleanup audio resources
  const cleanupAudio = async () => {
    try {
      if (sound.current) {
        await sound.current.unloadAsync();
        sound.current = null;
      }
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
        positionUpdateInterval.current = null;
      }
    } catch (error) {
      console.error('Error cleaning up audio:', error);
    }
  };

  // Handle song end
  const handleSongEnd = () => {
    if (repeatMode === 2) {
      // Repeat one - restart current song
      seekToPosition(0);
      playAudio();
    } else if (repeatMode === 1) {
      // Repeat all - go to next song
      handleNext();
    } else {
      // No repeat - stop playback
      setIsPlaying(false);
      stopAlbumRotation();
      stopPulse();
    }
  };

  // Initialize animations
  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
      
      // Start album rotation if playing
      if (isPlaying) {
        startAlbumRotation();
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
      stopAlbumRotation();
    }
  }, [visible]);

  // Audio playback functions
  const playAudio = async () => {
    try {
      if (sound.current) {
        await sound.current.playAsync();
        startAlbumRotation();
        startPulse();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const pauseAudio = async () => {
    try {
      if (sound.current) {
        await sound.current.pauseAsync();
        stopAlbumRotation();
        stopPulse();
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const seekToPosition = async (position: number) => {
    try {
      if (sound.current) {
        await sound.current.setPositionAsync(position * 1000); // Convert to milliseconds
        setCurrentTime(position);
      }
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };
  // Album rotation animation
  const startAlbumRotation = () => {
    albumRotation.setValue(0);
    Animated.loop(
      Animated.timing(albumRotation, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAlbumRotation = () => {
    albumRotation.stopAnimation();
  };

  // Pulse animation for play button
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Like animation
  const animateLike = () => {
    Animated.sequence([
      Animated.timing(likeAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Format time in mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current song index
  const getCurrentIndex = () => {
    return playlist.findIndex(item => item.id === song.id);
  };

  // Handle next song
  const handleNext = () => {
    const currentIndex = getCurrentIndex();
    let nextIndex;
    
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    onSongChange(playlist[nextIndex]);
    setCurrentTime(0);
  };

  // Handle previous song
  const handlePrevious = () => {
    const currentIndex = getCurrentIndex();
    let prevIndex;
    
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * playlist.length);
    } else {
      prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    }
    
    onSongChange(playlist[prevIndex]);
    setCurrentTime(0);
  };

  // Handle play/pause
  const handlePlayPause = async () => {
    if (isLoading) return;
    
    if (isPlaying) {
      await pauseAudio();
    } else {
      await playAudio();
    }
  };

  // Handle repeat mode
  const handleRepeat = async () => {
    const newRepeatMode = (repeatMode + 1) % 3;
    setRepeatMode(newRepeatMode);
    
    // Update sound looping if loaded
    if (sound.current) {
      try {
        await sound.current.setIsLoopingAsync(newRepeatMode === 2);
      } catch (error) {
        console.error('Error setting loop mode:', error);
      }
    }
  };

  // Handle shuffle
  const handleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  // Handle like
  const handleLike = () => {
    setIsLiked(!isLiked);
    animateLike();
    // TODO: Save like status to backend
  };

  // Progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Pan responder for progress bar
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt) => {
      const progressBarWidth = width - 48;
      const touchX = evt.nativeEvent.locationX;
      const percentage = Math.max(0, Math.min(100, (touchX / progressBarWidth) * 100));
      const newTime = Math.floor((percentage / 100) * duration);
      seekToPosition(newTime);
    },
  });

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 1: return "repeat";
      case 2: return "repeat-outline";
      default: return "repeat-outline";
    }
  };

  // Album rotation interpolation
  const albumRotate = albumRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.View 
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#0A0A0A', '#1A0A1A', '#0A0A0A']}
          style={styles.backgroundGradient}
        >
          {/* Background Image with Blur */}
          <View style={styles.backgroundImageContainer}>
            <Image source={{ uri: song.image }} style={styles.backgroundImage} blurRadius={50} />
            <LinearGradient
              colors={['rgba(10, 10, 10, 0.7)', 'rgba(26, 10, 26, 0.8)', 'rgba(10, 10, 10, 0.9)']}
              style={styles.backgroundOverlay}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <View style={styles.headerButtonContainer}>
                <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>NOW PLAYING</Text>
              <Text style={styles.headerSubtitle}>From Recently Played</Text>
            </View>
            
            <TouchableOpacity style={styles.headerButton}>
              <View style={styles.headerButtonContainer}>
                <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Album Art */}
          <View style={styles.albumContainer}>
            <View style={styles.albumArtContainer}>
              <Animated.View
                style={[
                  styles.albumImageContainer,
                  {
                    transform: [{ rotate: albumRotate }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7', '#9333EA']}
                  style={styles.albumBorder}
                >
                  <Image source={{ uri: song.image }} style={styles.albumImage} />
                </LinearGradient>
              </Animated.View>
              
              {/* Vinyl effect */}
              <View style={styles.vinylCenter}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.vinylCenterGradient}
                >
                  <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Song Info */}
          <View style={styles.songInfoContainer}>
            <View style={styles.songTitleContainer}>
              <View style={styles.songTextContainer}>
                <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
              </View>
              <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
                <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
                  <LinearGradient
                    colors={isLiked ? ['#8B5CF6', '#A855F7'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.likeButtonGradient}
                  >
                    <Ionicons 
                      name={isLiked ? "heart" : "heart-outline"} 
                      size={24} 
                      color={isLiked ? "#FFFFFF" : "#8B5CF6"} 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
            
            <View style={styles.songMetadata}>
              <Text style={styles.songAlbum}>{song.album}</Text>
              <View style={styles.songStats}>
                <Ionicons name="play" size={12} color="#8B5CF6" />
                <Text style={styles.songPlays}>{song.plays} plays</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar} {...panResponder.panHandlers}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.progressTrack}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                />
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={[styles.progressThumb, { left: `${progressPercentage}%` }]}
                />
              </LinearGradient>
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity onPress={handleShuffle} style={styles.controlButton}>
              <View style={[
                styles.controlButtonContainer,
                isShuffled && styles.controlButtonActive
              ]}>
                <Ionicons 
                  name="shuffle-outline" 
                  size={20} 
                  color={isShuffled ? "#FFFFFF" : "#B3B3B3"} 
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
              <View style={styles.controlButtonContainer}>
                <Ionicons name="play-skip-back" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity onPress={handlePlayPause} style={styles.playButtonContainer} disabled={isLoading}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={[styles.playButton, isLoading && styles.playButtonDisabled]}
                >
                  {isLoading ? (
                    <Animated.View
                      style={{
                        transform: [{
                          rotate: albumRotation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          })
                        }]
                      }}
                    >
                      <Ionicons name="refresh" size={32} color="#FFFFFF" />
                    </Animated.View>
                  ) : (
                    <Ionicons 
                      name={isPlaying ? "pause" : "play"} 
                      size={32} 
                      color="#FFFFFF"
                      style={!isPlaying && styles.playIconOffset}
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
              <View style={styles.controlButtonContainer}>
                <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRepeat} style={styles.controlButton}>
              <View style={[
                styles.controlButtonContainer,
                repeatMode > 0 && styles.controlButtonActive
              ]}>
                <Ionicons 
                  name={getRepeatIcon()} 
                  size={20} 
                  color={repeatMode > 0 ? "#FFFFFF" : "#B3B3B3"} 
                />
                {repeatMode === 2 && (
                  <View style={styles.repeatIndicator}>
                    <Text style={styles.repeatText}>1</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.bottomButton}>
              <View style={styles.bottomButtonContainer}>
                <Ionicons name="phone-portrait-outline" size={20} color="#B3B3B3" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomButton}>
              <View style={styles.bottomButtonContainer}>
                <Ionicons name="share-outline" size={20} color="#B3B3B3" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomButton}>
              <View style={styles.bottomButtonContainer}>
                <Ionicons name="list-outline" size={20} color="#B3B3B3" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Safe area bottom spacing */}
          <View style={styles.safeAreaBottom} />
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
    paddingTop: 50,
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 1,
  },
  headerButton: {
    width: 48,
    height: 48,
  },
  headerButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B3B3B3',
    fontWeight: '500',
  },
  albumContainer: {
    alignItems: 'center',
    marginVertical: 40,
    zIndex: 1,
  },
  albumArtContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumImageContainer: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  albumBorder: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumImage: {
    width: width * 0.8 - 16,
    height: width * 0.8 - 16,
    borderRadius: (width * 0.8 - 16) / 2,
  },
  vinylCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylCenterGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  songInfoContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
    zIndex: 1,
  },
  songTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  songTextContainer: {
    flex: 1,
  },
  songTitle: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  songArtist: {
    fontSize: 20,
    color: '#B3B3B3',
    fontWeight: '600',
  },
  likeButton: {
    marginLeft: 16,
  },
  likeButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  songMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  songAlbum: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  songStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songPlays: {
    fontSize: 14,
    color: '#8B5CF6',
    marginLeft: 4,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 30,
    zIndex: 1,
  },
  progressBar: {
    height: 40,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  progressThumb: {
    position: 'absolute',
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    transform: [{ translateX: -11 }],
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#B3B3B3',
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 30,
    zIndex: 1,
  },
  controlButton: {
    padding: 8,
  },
  controlButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  repeatIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  playButtonContainer: {
    marginHorizontal: 16,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  playButtonDisabled: {
    opacity: 0.7,
  },
  playIconOffset: {
    marginLeft: 4,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 40,
    zIndex: 1,
  },
  bottomButton: {
    padding: 8,
  },
  bottomButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeAreaBottom: {
    height: 0, // Removed extra spacing since we increased paddingBottom
    backgroundColor: 'transparent',
  },
});

export default MusicPlayerCard;