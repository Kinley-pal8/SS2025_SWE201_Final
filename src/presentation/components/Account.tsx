import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Alert,
  Image,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { Input } from "@rneui/themed";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";

// Import the Zustand stores (updated paths based on your structure)
import { useAuthStore } from "../../persistence/stores/authStore";
import { useTracksStore } from "../../persistence/stores/tracksStore";
import { supabase } from "../../services/api/supabaseClient";

// Import the navigation types
import type { RootStackParamList } from "../../../App";

const { width, height } = Dimensions.get("window");

type AccountScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Account"
>;

export default function Account() {
  const navigation = useNavigation<AccountScreenNavigationProp>();

  // Get data from stores instead of route params
  const {
    user,
    profile,
    updateProfile,
    signOut,
    loading: authLoading,
    loadProfile,
  } = useAuthStore();

  const { myTracks, loadMyTracks } = useTracksStore();

  // Helper function to check if user is an artist
  const isUserArtist = () => {
    return profile?.is_artist === true || 
           user?.user_metadata?.is_artist === true || 
           profile?.user_type === 'artist' || 
           user?.user_metadata?.user_type === 'artist';
  };

  // Local state for form inputs
  const [displayName, setDisplayName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email change states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const modalBackdropAnim = useRef(new Animated.Value(0)).current;

  // Debug logging
  useEffect(() => {
    console.log("🔍 ACCOUNT DEBUG - Raw user object:", user);
    console.log("🔍 ACCOUNT DEBUG - User metadata:", user?.user_metadata);
    console.log("🔍 ACCOUNT DEBUG - Raw profile object:", profile);
    
    // Check all possible ways the app might determine artist status
    console.log("🎤 ARTIST STATUS CHECKS:");
    console.log("  - profile?.is_artist:", profile?.is_artist);
    console.log("  - profile?.user_type:", profile?.user_type);
    console.log("  - user?.user_metadata?.is_artist:", user?.user_metadata?.is_artist);
    console.log("  - user?.user_metadata?.user_type:", user?.user_metadata?.user_type);
    console.log("  - isUserArtist():", isUserArtist());
  }, [user, profile]);

  // Initialize form with profile data (use user metadata as fallback)
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setArtistName(profile.artist_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
    } else if (user?.user_metadata) {
      // Fallback to user metadata if profile is null
      setDisplayName(user.user_metadata.display_name || "");
      setArtistName(user.user_metadata.artist_name || "");
      setBio(user.user_metadata.bio || "");
      setLocation(user.user_metadata.location || "");
    }
  }, [profile, user]);

  // Load user's tracks if they're an artist
  useEffect(() => {
    if (user && isUserArtist()) {
      loadMyTracks(user.id);
    }
  }, [user, profile]);

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Modal animations
  useEffect(() => {
    if (showPasswordModal || showEmailModal) {
      Animated.parallel([
        Animated.timing(modalBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalBackdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalSlideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showPasswordModal, showEmailModal]);

  // Update profile using store
  const handleUpdateProfile = async () => {
    setLoading(true);

    const updates = {
      display_name: displayName.trim(),
      bio: bio.trim(),
      location: location.trim(),
    };

    // Add artist name if user is an artist
    if (isUserArtist()) {
      updates.artist_name = artistName.trim();
    }

    const success = await updateProfile(updates);

    if (success) {
      Alert.alert("Success", "Profile updated successfully!");
    } else {
      Alert.alert("Error", "Failed to update profile");
    }

    setLoading(false);
  };

  // Change password function
  const changePassword = async () => {
    try {
      if (newPassword !== confirmPassword) {
        Alert.alert("Error", "New passwords don't match!");
        return;
      }

      if (newPassword.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters!");
        return;
      }

      setPasswordLoading(true);

      // Use imported supabase for auth operations
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Password updated successfully!");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Change email function
  const changeEmail = async () => {
    try {
      if (!newEmail || !newEmail.includes("@")) {
        Alert.alert("Error", "Please enter a valid email address!");
        return;
      }

      setEmailLoading(true);

      // Use imported supabase for auth operations
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Success",
        "Email update initiated! Please check your new email for confirmation."
      );
      setShowEmailModal(false);
      setNewEmail("");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setEmailLoading(false);
    }
  };

  // Force reload profile function
  const handleReloadProfile = async () => {
    console.log("🔄 Force reloading profile...");
    try {
      // Force reload the auth user
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      console.log("Fresh user from auth:", freshUser);
      
      // Force reload profile from auth store
      if (loadProfile) {
        await loadProfile();
      }
      console.log("✅ Profile reloaded");
      Alert.alert("Success", "Profile reloaded!");
    } catch (error) {
      console.error("Error reloading profile:", error);
      Alert.alert("Error", "Failed to reload profile");
    }
  };

  // Sign out using store
  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          navigation.reset({
            index: 0,
            routes: [{ name: "SignUpOrLogIn" }],
          });
        },
      },
    ]);
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

  const ProfileSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const InfoCard = ({
    label,
    value,
    onPress,
    showEdit = false,
    icon,
  }: {
    label: string;
    value: string;
    onPress?: () => void;
    showEdit?: boolean;
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <TouchableOpacity
      style={styles.infoCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.02)"]}
        style={styles.infoCardGradient}
      >
        <View style={styles.infoCardIcon}>
          <Ionicons name={icon} size={20} color="#8B5CF6" />
        </View>
        <View style={styles.infoCardContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value || "Not set"}</Text>
        </View>
        {showEdit && (
          <View style={styles.editIconContainer}>
            <Ionicons name="create-outline" size={18} color="#8B5CF6" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // Redirect to auth if no user - use useEffect to avoid setState during render
  useEffect(() => {
    if (!user) {
      navigation.replace("SignUpOrLogIn");
    }
  }, [user, navigation]);

  // Show loading or return null if no user
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
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <View style={styles.backButtonContainer}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            style={[
              styles.scrollView,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={["#8B5CF6", "#A855F7"]}
                  style={styles.avatarGradient}
                >
                  <Image
                    source={
                      profile?.avatar_url
                        ? { uri: profile.avatar_url }
                        : require("../../../assets/logo.png")
                    }
                    style={styles.avatar}
                  />
                </LinearGradient>
                <TouchableOpacity style={styles.editAvatarButton}>
                  <LinearGradient
                    colors={["#8B5CF6", "#A855F7"]}
                    style={styles.editAvatarGradient}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={styles.welcomeText}>
                {profile?.display_name || 
                 profile?.artist_name || 
                 user?.user_metadata?.display_name ||
                 user?.user_metadata?.artist_name ||
                 "Music Lover"}
              </Text>
              <Text style={styles.memberSince}>
                Member since{" "}
                {new Date(user?.created_at || "").toLocaleDateString()}
              </Text>
              {isUserArtist() && (
                <View style={styles.artistBadge}>
                  <Text style={styles.artistBadgeText}>🎤 Artist</Text>
                </View>
              )}
            </View>

            {/* Account Information */}
            <ProfileSection title="Account Information">
              <InfoCard
                label="Email Address"
                value={user?.email || ""}
                onPress={() => setShowEmailModal(true)}
                showEdit={true}
                icon="mail-outline"
              />
              <InfoCard
                label="Password"
                value="••••••••••••"
                onPress={() => setShowPasswordModal(true)}
                showEdit={true}
                icon="lock-closed-outline"
              />
              <InfoCard
                label="Account Type"
                value={isUserArtist() ? "Artist" : "Listener"}
                icon="person-outline"
              />
            </ProfileSection>

            {/* Profile Information */}
            <ProfileSection title="Profile Information">
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#8B5CF6"
                    style={styles.inputIcon}
                  />
                  <Input
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your display name"
                    placeholderTextColor="#666"
                    inputStyle={styles.textInput}
                    containerStyle={styles.rneInputContainer}
                    inputContainerStyle={styles.rneInputInnerContainer}
                  />
                </View>
              </View>

              {isUserArtist() && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Artist Name</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="musical-notes-outline"
                      size={20}
                      color="#8B5CF6"
                      style={styles.inputIcon}
                    />
                    <Input
                      value={artistName}
                      onChangeText={setArtistName}
                      placeholder="Your artist name"
                      placeholderTextColor="#666"
                      inputStyle={styles.textInput}
                      containerStyle={styles.rneInputContainer}
                      inputContainerStyle={styles.rneInputInnerContainer}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Bio</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#8B5CF6"
                    style={styles.inputIcon}
                  />
                  <Input
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor="#666"
                    inputStyle={styles.textInput}
                    containerStyle={styles.rneInputContainer}
                    inputContainerStyle={styles.rneInputInnerContainer}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Location</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color="#8B5CF6"
                    style={styles.inputIcon}
                  />
                  <Input
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Your location"
                    placeholderTextColor="#666"
                    inputStyle={styles.textInput}
                    containerStyle={styles.rneInputContainer}
                    inputContainerStyle={styles.rneInputInnerContainer}
                  />
                </View>
              </View>
            </ProfileSection>

            {/* Artist Stats Section */}
            {isUserArtist() && (
              <ProfileSection title="Your Music">
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {myTracks?.length || 0}
                    </Text>
                    <Text style={styles.statLabel}>Tracks</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {myTracks?.reduce(
                        (total, track) => total + (track.play_count || 0),
                        0
                      ) || 0}
                    </Text>
                    <Text style={styles.statLabel}>Total Plays</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {new Set(myTracks?.map((track) => track.genre)).size || 0}
                    </Text>
                    <Text style={styles.statLabel}>Genres</Text>
                  </View>
                </View>
              </ProfileSection>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {/* Debug: Force reload profile button */}
              <TouchableOpacity
                onPress={handleReloadProfile}
                style={styles.debugButtonContainer}
              >
                <View style={styles.debugButton}>
                  <Ionicons name="refresh-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.debugButtonText}>
                    🔄 Reload Profile (Debug)
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Update profile button */}
              <TouchableOpacity
                onPress={handleUpdateProfile}
                disabled={loading || authLoading}
                style={styles.primaryButtonContainer}
              >
                <LinearGradient
                  colors={["#8B5CF6", "#A855F7"]}
                  style={styles.primaryButton}
                >
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {loading || authLoading ? "Updating..." : "Update Profile"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign out button */}
              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.secondaryButtonContainer}
              >
                <View style={styles.secondaryButton}>
                  <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                  <Text style={styles.secondaryButtonText}>Sign Out</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacing} />
          </Animated.ScrollView>

          {/* Email Change Modal */}
          <Modal
            visible={showEmailModal}
            transparent={true}
            animationType="none"
            onRequestClose={() => setShowEmailModal(false)}
          >
            <Animated.View
              style={[styles.modalOverlay, { opacity: modalBackdropAnim }]}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => setShowEmailModal(false)}
                activeOpacity={1}
              />
              <Animated.View
                style={[
                  styles.modalContainer,
                  { transform: [{ translateY: modalSlideAnim }] },
                ]}
              >
                <LinearGradient
                  colors={["#1A0A1A", "#0A0A0A"]}
                  style={styles.modalGradient}
                >
                  <View style={styles.modalHeader}>
                    <Ionicons name="mail-outline" size={24} color="#8B5CF6" />
                    <Text style={styles.modalTitle}>Change Email</Text>
                  </View>
                  <Text style={styles.modalSubtitle}>
                    Current: {user?.email}
                  </Text>

                  <View style={styles.modalInputContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#8B5CF6"
                      style={styles.inputIcon}
                    />
                    <Input
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder="Enter new email address"
                      placeholderTextColor="#666"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      inputStyle={styles.modalInput}
                      containerStyle={styles.rneInputContainer}
                      inputContainerStyle={styles.rneInputInnerContainer}
                    />
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      onPress={() => setShowEmailModal(false)}
                      style={styles.modalCancelButton}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={changeEmail}
                      disabled={emailLoading}
                      style={styles.modalConfirmButton}
                    >
                      <LinearGradient
                        colors={["#8B5CF6", "#A855F7"]}
                        style={styles.modalConfirmGradient}
                      >
                        <Text style={styles.modalConfirmText}>
                          {emailLoading ? "Updating..." : "Update Email"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </Animated.View>
            </Animated.View>
          </Modal>

          {/* Password Change Modal */}
          <Modal
            visible={showPasswordModal}
            transparent={true}
            animationType="none"
            onRequestClose={() => setShowPasswordModal(false)}
          >
            <Animated.View
              style={[styles.modalOverlay, { opacity: modalBackdropAnim }]}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => setShowPasswordModal(false)}
                activeOpacity={1}
              />
              <Animated.View
                style={[
                  styles.modalContainer,
                  { transform: [{ translateY: modalSlideAnim }] },
                ]}
              >
                <LinearGradient
                  colors={["#1A0A1A", "#0A0A0A"]}
                  style={styles.modalGradient}
                >
                  <View style={styles.modalHeader}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={24}
                      color="#8B5CF6"
                    />
                    <Text style={styles.modalTitle}>Change Password</Text>
                  </View>

                  <View style={styles.modalInputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#8B5CF6"
                      style={styles.inputIcon}
                    />
                    <Input
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#666"
                      secureTextEntry
                      inputStyle={styles.modalInput}
                      containerStyle={styles.rneInputContainer}
                      inputContainerStyle={styles.rneInputInnerContainer}
                    />
                  </View>

                  <View style={styles.modalInputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#8B5CF6"
                      style={styles.inputIcon}
                    />
                    <Input
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#666"
                      secureTextEntry
                      inputStyle={styles.modalInput}
                      containerStyle={styles.rneInputContainer}
                      inputContainerStyle={styles.rneInputInnerContainer}
                    />
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      onPress={() => setShowPasswordModal(false)}
                      style={styles.modalCancelButton}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={changePassword}
                      disabled={passwordLoading}
                      style={styles.modalConfirmButton}
                    >
                      <LinearGradient
                        colors={["#8B5CF6", "#A855F7"]}
                        style={styles.modalConfirmGradient}
                      >
                        <Text style={styles.modalConfirmText}>
                          {passwordLoading ? "Updating..." : "Update Password"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </Animated.View>
            </Animated.View>
          </Modal>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },
  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#0A0A0A",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 4,
    right: 4,
  },
  editAvatarGradient: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  memberSince: {
    fontSize: 14,
    color: "#B3B3B3",
    textAlign: "center",
    fontWeight: "500",
  },
  artistBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  artistBadgeText: {
    color: "#8B5CF6",
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  infoCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  infoCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#B3B3B3",
    marginBottom: 4,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  editIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 8,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  rneInputContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  rneInputInnerContainer: {
    borderBottomWidth: 0,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8B5CF6",
  },
  statLabel: {
    fontSize: 14,
    color: "#B3B3B3",
    marginTop: 4,
    fontWeight: "500",
  },
  actionButtons: {
    paddingHorizontal: 20,
    gap: 16,
  },
  debugButtonContainer: {
    borderRadius: 28,
  },
  debugButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  primaryButtonContainer: {
    borderRadius: 28,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  secondaryButtonContainer: {
    borderRadius: 28,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#B3B3B3",
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "500",
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalInput: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: "#B3B3B3",
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 20,
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomSpacing: {
    height: 40,
  },
});