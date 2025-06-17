import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Modal, 
  Animated,
  Dimensions,
  StatusBar,
  ScrollView
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get('window');

// Define the navigation stack's param list
type RootStackParamList = {
  Splash: undefined;
  SignUpOrLogIn: undefined;
  Auth: { method: "email" | "phone"; userType: "artist" | "listener"; action: "signin" | "signup" };
  Home: { session: any };
  Account: { session: any };
};

type SignUpOrLogInScreenNavigationProp = StackNavigationProp<RootStackParamList, "SignUpOrLogIn">;

export default function SignUpOrLogIn() {
  const navigation = useNavigation<SignUpOrLogInScreenNavigationProp>();
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<"signin" | "signup">("signup");
  const [selectedMethod, setSelectedMethod] = useState<"email" | "phone">("email");

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const modalBackdropAnim = useRef(new Animated.Value(0)).current;
  const buttonScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  // Initialize animations
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Button press animations
  const handlePressIn = (index: number) => {
    Animated.spring(buttonScales[index], {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (index: number) => {
    Animated.spring(buttonScales[index], {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleActionPress = (method: "email" | "phone", action: "signin" | "signup") => {
    setSelectedMethod(method);
    setCurrentAction(action);
    setShowUserTypeModal(true);
    
    // Animate modal in
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
  };

  const handleUserTypeSelect = (userType: "artist" | "listener") => {
    // Animate modal out
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
    ]).start(() => {
      setShowUserTypeModal(false);
      navigation.navigate("Auth", { 
        method: selectedMethod, 
        userType: userType,
        action: currentAction 
      });
    });
  };

  const closeModal = () => {
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
    ]).start(() => {
      setShowUserTypeModal(false);
    });
  };

  const UserTypeModal = () => (
    <Modal
      visible={showUserTypeModal}
      transparent={true}
      animationType="none"
      onRequestClose={closeModal}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: modalBackdropAnim }
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={closeModal}
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
              <Text style={styles.modalTitle}>
                {currentAction === "signup" ? "Join as" : "Sign in as"}
              </Text>
              <TouchableOpacity 
                onPress={closeModal}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#B3B3B3" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.userTypeContainer}>
                {/* Artist Option */}
                <TouchableOpacity 
                  style={styles.userTypeCard}
                  onPress={() => handleUserTypeSelect("artist")}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                    style={styles.userTypeCardGradient}
                  >
                    <View style={styles.userTypeHeader}>
                      <LinearGradient
                        colors={['#8B5CF6', '#A855F7']}
                        style={styles.userTypeIcon}
                      >
                        <Text style={styles.userTypeEmoji}>🎤</Text>
                      </LinearGradient>
                      <View style={styles.userTypeBadge}>
                        <Text style={styles.userTypeBadgeText}>CREATOR</Text>
                      </View>
                    </View>
                    <Text style={styles.userTypeTitle}>Artist</Text>
                    <Text style={styles.userTypeDescription}>
                      Upload your music, build your fanbase, and connect with listeners worldwide
                    </Text>
                    <View style={styles.userTypeFeatures}>
                      <View style={styles.featureItem}>
                        <Ionicons name="musical-notes" size={16} color="#8B5CF6" />
                        <Text style={styles.featureText}>Upload unlimited tracks</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="analytics" size={16} color="#8B5CF6" />
                        <Text style={styles.featureText}>Advanced analytics dashboard</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="card" size={16} color="#8B5CF6" />
                        <Text style={styles.featureText}>Monetization opportunities</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="people" size={16} color="#8B5CF6" />
                        <Text style={styles.featureText}>Direct fan engagement</Text>
                      </View>
                    </View>
                    <View style={styles.selectButton}>
                      <Text style={styles.selectButtonText}>Choose Artist</Text>
                      <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Listener Option */}
                <TouchableOpacity 
                  style={styles.userTypeCard}
                  onPress={() => handleUserTypeSelect("listener")}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                    style={styles.userTypeCardGradient}
                  >
                    <View style={styles.userTypeHeader}>
                      <LinearGradient
                        colors={['#8B5CF6', '#A855F7']}
                        style={styles.userTypeIcon}
                      >
                        <Text style={styles.userTypeEmoji}>🎧</Text>
                      </LinearGradient>
                      <View style={styles.userTypeBadge}>
                        <Text style={styles.userTypeBadgeText}>MUSIC LOVER</Text>
                      </View>
                    </View>
                    <Text style={styles.userTypeTitle}>Listener</Text>
                    <Text style={styles.userTypeDescription}>
                      Discover amazing music, create playlists, and support your favorite artists
                    </Text>
                    <View style={styles.userTypeFeatures}>
                      <View style={styles.featureItem}>
                        <Ionicons name="play-circle" size={16} color="#8B5CF6" />
                        <Text style={styles.featureText}>Unlimited streaming</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="list" size={16} color="#8B5CF6" />
                        <Text style={styles.featureText}>Custom playlists</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="heart" size={16} color="#8B5CF6" />
                        <Text style={styles.featureText}>Follow favorite artists</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <Ionicons name="compass" size={16} color="#8B5CF6" />
                        <Text style={styles.featureText}>Discover new music</Text>
                      </View>
                    </View>
                    <View style={styles.selectButton}>
                      <Text style={styles.selectButtonText}>Choose Listener</Text>
                      <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.modalFooter}>
                <Ionicons name="information-circle-outline" size={16} color="#666" />
                <Text style={styles.modalNote}>
                  You can always change your account type later in settings
                </Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <LinearGradient
        colors={['#0A0A0A', '#1A0A1A', '#0A0A0A']}
        style={styles.container}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Logo and Brand */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("../assets/logo.png")}
                style={styles.logo}
              />
            </View>
            <Text style={styles.brandName}>Biito</Text>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Start your music journey</Text>
            <Text style={styles.subtitle}>Join millions of music lovers and creators worldwide</Text>
          </View>

          {/* Sign Up Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ New to Biito?</Text>
            
            {/* Continue with Email - Sign Up */}
            <Animated.View style={{ transform: [{ scale: buttonScales[0] }] }}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPressIn={() => handlePressIn(0)}
                onPressOut={() => handlePressOut(0)}
                onPress={() => handleActionPress("email", "signup")}
                activeOpacity={1}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7', '#9333EA']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Sign up with email</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Continue with Phone - Sign Up */}
            <Animated.View style={{ transform: [{ scale: buttonScales[1] }] }}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPressIn={() => handlePressIn(1)}
                onPressOut={() => handlePressOut(1)}
                onPress={() => handleActionPress("phone", "signup")}
                activeOpacity={1}
              >
                <View style={styles.secondaryButtonContent}>
                  <Ionicons name="call-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.secondaryButtonText}>Sign up with phone</Text>
                  <Ionicons name="arrow-forward" size={20} color="#8B5CF6" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <LinearGradient
              colors={['#8B5CF6', '#A855F7']}
              style={styles.dividerDot}
            >
              <Text style={styles.dividerText}>or</Text>
            </LinearGradient>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign In Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Already have an account?</Text>
            
            {/* Continue with Email - Sign In */}
            <Animated.View style={{ transform: [{ scale: buttonScales[2] }] }}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPressIn={() => handlePressIn(2)}
                onPressOut={() => handlePressOut(2)}
                onPress={() => handleActionPress("email", "signin")}
                activeOpacity={1}
              >
                <View style={styles.outlineButtonContent}>
                  <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.outlineButtonText}>Sign in with email</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Continue with Phone - Sign In */}
            <Animated.View style={{ transform: [{ scale: buttonScales[3] }] }}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPressIn={() => handlePressIn(3)}
                onPressOut={() => handlePressOut(3)}
                onPress={() => handleActionPress("phone", "signin")}
                activeOpacity={1}
              >
                <View style={styles.outlineButtonContent}>
                  <Ionicons name="call-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.outlineButtonText}>Sign in with phone</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerContent}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#666" />
              <Text style={styles.footerText}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* User Type Selection Modal */}
        <UserTypeModal />
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#B3B3B3",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  section: {
    width: "100%",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  primaryButton: {
    marginBottom: 16,
    borderRadius: 28,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    minHeight: 56,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: 'center',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginBottom: 16,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8B5CF6",
    flex: 1,
    textAlign: 'center',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  outlineButton: {
    marginBottom: 16,
  },
  outlineButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: 'center',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  dividerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  dividerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  footerText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeContainer: {
    gap: 20,
  },
  userTypeCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  userTypeCardGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
  },
  userTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userTypeEmoji: {
    fontSize: 28,
  },
  userTypeBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  userTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  userTypeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  userTypeDescription: {
    fontSize: 15,
    color: "#B3B3B3",
    marginBottom: 20,
    lineHeight: 22,
  },
  userTypeFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: "#E5E5E5",
    marginLeft: 12,
    fontWeight: '500',
    lineHeight: 20,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
  },
  modalNote: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    lineHeight: 16,
    textAlign: 'center',
  },
});