import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useTracksStore } from "../../persistence/stores/tracksStore";
import { useAuthStore } from "../../persistence/stores/authStore";

const DatabaseTest: React.FC = () => {
  const { tracks, loading, error, loadTracks, clearError } = useTracksStore();

  const { user, profile } = useAuthStore();

  useEffect(() => {
    console.log("🧪 DatabaseTest component mounted");
    // Automatically load tracks when component mounts
    loadTracks(true);
  }, []);

  const handleLoadTracks = () => {
    console.log("🔄 Manual track loading triggered");
    loadTracks(true);
  };

  const handleRefreshTracks = () => {
    console.log("🔍 Refreshing tracks from database");
    loadTracks(true);
  };

  const renderTrackItem = ({ item }: { item: any }) => (
    <View style={styles.trackItem}>
      <Text style={styles.trackTitle}>{item.title}</Text>
      <Text style={styles.trackArtist}>
        Artist:{" "}
        {item.users?.artist_name || item.users?.display_name || "Unknown"}
      </Text>
      <Text style={styles.trackGenre}>
        Genre: {item.genre || "Not specified"}
      </Text>
      <Text style={styles.trackAlbum}>
        Album: {item.album || "Not specified"}
      </Text>
      <Text style={styles.trackPlays}>Plays: {item.play_count || 0}</Text>
      <Text style={styles.trackDate}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Database Test</Text>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userText}>
          User: {user?.email || "Not logged in"}
        </Text>
        <Text style={styles.userText}>
          Profile:{" "}
          {profile?.artist_name || profile?.display_name || "No profile"}
        </Text>
        <Text style={styles.userText}>
          Is Artist: {profile?.is_artist ? "Yes" : "No"}
        </Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleLoadTracks}>
          <Text style={styles.buttonText}>Load Tracks (Service)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleRefreshTracks}>
          <Text style={styles.buttonText}>Refresh Tracks</Text>
        </TouchableOpacity>

        {error && (
          <TouchableOpacity style={styles.errorButton} onPress={clearError}>
            <Text style={styles.buttonText}>Clear Error</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {/* Tracks Count */}
      <Text style={styles.tracksCount}>Tracks Found: {tracks.length}</Text>

      {/* Tracks List */}
      {tracks.length > 0 ? (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={renderTrackItem}
          scrollEnabled={false}
          style={styles.tracksList}
        />
      ) : (
        !loading && (
          <Text style={styles.noTracksText}>
            No tracks found. Try loading tracks or check database connection.
          </Text>
        )
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  userInfo: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 5,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1DB954",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  errorButton: {
    backgroundColor: "#E22134",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 10,
  },
  errorContainer: {
    backgroundColor: "#E22134",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  tracksCount: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  tracksList: {
    marginBottom: 20,
  },
  trackItem: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#1DB954",
  },
  trackTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  trackArtist: {
    color: "#B3B3B3",
    fontSize: 14,
    marginBottom: 3,
  },
  trackGenre: {
    color: "#B3B3B3",
    fontSize: 12,
    marginBottom: 3,
  },
  trackAlbum: {
    color: "#B3B3B3",
    fontSize: 12,
    marginBottom: 3,
  },
  trackPlays: {
    color: "#1DB954",
    fontSize: 12,
    marginBottom: 3,
  },
  trackDate: {
    color: "#666666",
    fontSize: 10,
  },
  noTracksText: {
    color: "#B3B3B3",
    fontSize: 16,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
});

export default DatabaseTest;
