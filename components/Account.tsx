import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
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
  StatusBar
} from "react-native";
import { Input } from "@rneui/themed";
import { Session } from "@supabase/supabase-js";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get('window');

export default function Account({ route }: { route: any }) {
  const navigation = useNavigation();
  const params = route?.params as { session?: Session } | undefined;
  const session = params?.session;

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
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

  useEffect(() => {
    if (session) getProfile();
    
    // Initialize animations
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
  }, [session]);

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

  async function getProfile() {
    try {
      setLoading(true);
      if (!session?.user) throw new Error("No user on the session!");

      const { data, error, status } = await supabase
        .from("profiles")
        .select(`username, website, avatar_url, full_name, phone`)
        .eq("id", session?.user.id)
        .single();
      
      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username || "");
        setWebsite(data.website || "");
        setAvatarUrl(data.avatar_url || "");
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({
    username,
    website,
    avatar_url,
    full_name,
    phone,
  }: {
    username: string;
    website: string;
    avatar_url: string;
    full_name: string;
    phone: string;
  }) {
    try {
      setLoading(true);
      if (!session?.user) throw new Error("No user on the session!");

      const updates = {
        id: session?.user.id,
        username,
        website,
        avatar_url,
        full_name,
        phone,
        updated_at: new Date(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) {
        throw error;
      }
      
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
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

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Password updated successfully!");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  async function changeEmail() {
    try {
      if (!newEmail || !newEmail.includes('@')) {
        Alert.alert("Error", "Please enter a valid email address!");
        return;
      }

      setEmailLoading(true);

      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Email update initiated! Please check your new email for confirmation.");
      setShowEmailModal(false);
      setNewEmail("");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setEmailLoading(false);
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignUpOrLogIn' }],
              });
            } catch (error) {
              Alert.alert("Error", "Failed to sign out");
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
      navigation.navigate('Home', { session });
    }
  };

  const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
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
    icon
  }: { 
    label: string; 
    value: string; 
    onPress?: () => void; 
    showEdit?: boolean;
    icon: string;
  }) => (
    <TouchableOpacity 
      style={styles.infoCard} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
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

  if (!session) {
    return (
      <LinearGradient
        colors={['#0A0A0A', '#1A0A1A', '#0A0A0A']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No session found</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <LinearGradient
        colors={['#0A0A0A', '#1A0A1A', '#0A0A0A']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
            >
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
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.avatarGradient}
                >
                  <Image
                    source={avatarUrl ? { uri: avatarUrl } : require("../assets/logo.png")}
                    style={styles.avatar}
                  />
                </LinearGradient>
                <TouchableOpacity style={styles.editAvatarButton}>
                  <LinearGradient
                    colors={['#8B5CF6', '#A855F7']}
                    style={styles.editAvatarGradient}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={styles.welcomeText}>
                {username || fullName || "Music Lover"}
              </Text>
              <Text style={styles.memberSince}>
                Member since {new Date(session?.user?.created_at || "").toLocaleDateString()}
              </Text>
            </View>

            {/* Account Information */}
            <ProfileSection title="Account Information">
              <InfoCard 
                label="Email Address" 
                value={session?.user?.email || ""} 
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
                value={session?.user?.user_metadata?.is_artist ? "Artist" : "Listener"}
                icon="person-outline"
              />
            </ProfileSection>

            {/* Profile Information */}
            <ProfileSection title="Profile Information">
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <Input
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#666"
                    inputStyle={styles.textInput}
                    containerStyle={styles.rneInputContainer}
                    inputContainerStyle={styles.rneInputInnerContainer}
                  />
                </View>
              </View>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="at-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <Input
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    placeholderTextColor="#666"
                    inputStyle={styles.textInput}
                    containerStyle={styles.rneInputContainer}
                    inputContainerStyle={styles.rneInputInnerContainer}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#666"
                    inputStyle={styles.textInput}
                    containerStyle={styles.rneInputContainer}
                    inputContainerStyle={styles.rneInputInnerContainer}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Website</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="link-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <Input
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://yourwebsite.com"
                    placeholderTextColor="#666"
                    inputStyle={styles.textInput}
                    containerStyle={styles.rneInputContainer}
                    inputContainerStyle={styles.rneInputInnerContainer}
                    keyboardType="url"
                  />
                </View>
              </View>
            </ProfileSection>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() =>
                  updateProfile({ 
                    username, 
                    website, 
                    avatar_url: avatarUrl,
                    full_name: fullName,
                    phone 
                  })
                }
                disabled={loading}
                style={styles.primaryButtonContainer}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.primaryButton}
                >
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {loading ? "Updating..." : "Update Profile"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

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
              style={[
                styles.modalOverlay,
                { opacity: modalBackdropAnim }
              ]}
            >
              <TouchableOpacity 
                style={StyleSheet.absoluteFill} 
                onPress={() => setShowEmailModal(false)}
                activeOpacity={1}
              />
              <Animated.View 
                style={[
                  styles.modalContainer,
                  { transform: [{ translateY: modalSlideAnim }] }
                ]}
              >
                <LinearGradient
                  colors={['#1A0A1A', '#0A0A0A']}
                  style={styles.modalGradient}
                >
                  <View style={styles.modalHeader}>
                    <Ionicons name="mail-outline" size={24} color="#8B5CF6" />
                    <Text style={styles.modalTitle}>Change Email</Text>
                  </View>
                  <Text style={styles.modalSubtitle}>
                    Current: {session?.user?.email}
                  </Text>
                  
                  <View style={styles.modalInputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
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
                        colors={['#8B5CF6', '#A855F7']}
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
              style={[
                styles.modalOverlay,
                { opacity: modalBackdropAnim }
              ]}
            >
              <TouchableOpacity 
                style={StyleSheet.absoluteFill} 
                onPress={() => setShowPasswordModal(false)}
                activeOpacity={1}
              />
              <Animated.View 
                style={[
                  styles.modalContainer,
                  { transform: [{ translateY: modalSlideAnim }] }
                ]}
              >
                <LinearGradient
                  colors={['#1A0A1A', '#0A0A0A']}
                  style={styles.modalGradient}
                >
                  <View style={styles.modalHeader}>
                    <Ionicons name="lock-closed-outline" size={24} color="#8B5CF6" />
                    <Text style={styles.modalTitle}>Change Password</Text>
                  </View>
                  
                  <View style={styles.modalInputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
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
                    <Ionicons name="lock-closed-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
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
                        colors={['#8B5CF6', '#A855F7']}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '500',
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
    overflow: 'hidden',
  },
  infoCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#B3B3B3",
    marginBottom: 4,
    fontWeight: '500',
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: '500',
  },
  rneInputContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  rneInputInnerContainer: {
    borderBottomWidth: 0,
  },
  actionButtons: {
    paddingHorizontal: 20,
    gap: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
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
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '500',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalInput: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: "#B3B3B3",
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 20,
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
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