// Enhanced Auth Component - Biito Brand Style
import React, { useState, useRef } from "react";
import {
  Alert,
  StyleSheet,
  View,
  AppState,
  Image,
  Text,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { supabase } from "../lib/supabase";
import { Input } from "@rneui/themed";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const redirectTo = makeRedirectUri();

// Handle session refresh when app is active
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  const route = useRoute();
  const navigation = useNavigation();

  // Get parameters from navigation (method, userType, action)
  const {
    method = "email",
    userType = "listener",
    action = "signup",
  } = route.params || {};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isSignUp = action === "signup";
  const isArtist = userType === "artist";

  // Animation refs
  const buttonScale = useRef(new Animated.Value(1)).current;
  const resendButtonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Initialize animations
  React.useEffect(() => {
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

  // Button press animation
  const handlePressIn = (scale) => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scale) => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  // Handle redirect for session (for phone auth)
  const createSessionFromUrl = async (url) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);
    const { access_token, refresh_token } = params;
    if (!access_token) return;
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return data.session;
  };

  // Validation function
  const validateForm = () => {
    if (method === "email" && !email) {
      Alert.alert("Error", "Please enter your email address");
      return false;
    }
    if (method === "phone" && !phone) {
      Alert.alert("Error", "Please enter your phone number");
      return false;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return false;
    }
    if (isSignUp && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }
    if (isSignUp && !displayName) {
      Alert.alert("Error", "Please enter your display name");
      return false;
    }
    if (isSignUp && isArtist && !artistName) {
      Alert.alert("Error", "Please enter your artist name");
      return false;
    }
    return true;
  };

  // Sign up with email and password
  async function signUpWithEmail() {
    if (!validateForm()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: displayName,
          user_type: userType,
          artist_name: isArtist ? artistName : null,
          is_artist: isArtist,
        },
      },
    });

    if (error) {
      Alert.alert("Sign Up Error", error.message);
    } else {
      Alert.alert(
        "Success",
        "Please check your inbox (or spam) for email verification!"
      );
      setSignUpSuccess(true);

      // If user is immediately signed in (email confirmation disabled)
      if (data.session) {
        navigation.replace("Home", { session: data.session });
      }
    }
    setLoading(false);
  }

  // Resend confirmation email
  async function resendConfirmationEmail() {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      Alert.alert(error.message);
    } else {
      Alert.alert(
        "Success",
        "Confirmation email resent! Check your inbox or spam."
      );
    }
    setLoading(false);
  }

  // Log in with email and password
  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        Alert.alert(
          "Email Not Confirmed",
          "Please confirm your email before logging in."
        );
      } else {
        Alert.alert("Sign In Error", error.message);
      }
    } else if (data.session) {
      // Successfully signed in
      navigation.replace("Home", { session: data.session });
    }
    setLoading(false);
  }

  // Send OTP for phone
  async function sendOtp() {
    if (!phone) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone,
      options: isSignUp
        ? {
            data: {
              display_name: displayName,
              user_type: userType,
              artist_name: isArtist ? artistName : null,
              is_artist: isArtist,
            },
          }
        : undefined,
    });

    if (error) {
      Alert.alert("OTP Error", error.message);
    } else {
      Alert.alert("Success", "OTP sent to your phone number!");
      setOtpSent(true);
    }
    setLoading(false);
  }

  // Verify the phone OTP
  async function verifyPhoneOtp() {
    if (!otp) {
      Alert.alert("Error", "Please enter the OTP");
      return;
    }

    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.verifyOtp({
      phone: phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      Alert.alert("Verification Error", error.message);
    } else if (session) {
      setPhone("");
      setOtp("");
      setOtpSent(false);
      navigation.replace("Home", { session });
    }
    setLoading(false);
  }

  const getUserTypeIcon = () => {
    return isArtist ? "🎤" : "🎧";
  };

  const getUserTypeLabel = () => {
    return isArtist ? "Artist" : "Listener";
  };

  // UI rendering
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <LinearGradient
        colors={["#0A0A0A", "#1A0A1A", "#0A0A0A"]}
        style={styles.gradientBackground}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.container,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <View style={styles.backButtonContainer}>
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require("../assets/logo.png")}
                  style={styles.logo}
                />
                <Text style={styles.brandName}>Biito</Text>
              </View>

              {/* User Type Badge */}
              <LinearGradient
                colors={["#8B5CF6", "#A855F7", "#9333EA"]}
                style={styles.userTypeBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.userTypeIcon}>{getUserTypeIcon()}</Text>
                <Text style={styles.userTypeText}>{getUserTypeLabel()}</Text>
              </LinearGradient>

              {/* Title */}
              <Text style={styles.title}>
                {isSignUp ? `Join as ${getUserTypeLabel()}` : `Welcome back!`}
              </Text>
              <Text style={styles.subtitle}>
                {method === "email"
                  ? "Enter your email"
                  : "Enter your phone number"}{" "}
                to continue
              </Text>

              {method === "email" && (
                <>
                  {/* Display Name for Sign Up */}
                  {isSignUp && (
                    <View style={[styles.inputWrapper, styles.mt20]}>
                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color="#8B5CF6"
                          style={styles.inputIcon}
                        />
                        <Input
                          onChangeText={(text) => setDisplayName(text)}
                          value={displayName}
                          placeholder="Display Name"
                          placeholderTextColor="#666666"
                          autoCapitalize="words"
                          style={styles.input}
                          containerStyle={styles.rneInputContainer}
                          inputContainerStyle={styles.rneInputInnerContainer}
                        />
                      </View>
                    </View>
                  )}

                  {/* Artist Name for Artist Sign Up */}
                  {isSignUp && isArtist && (
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="musical-notes-outline"
                          size={20}
                          color="#8B5CF6"
                          style={styles.inputIcon}
                        />
                        <Input
                          onChangeText={(text) => setArtistName(text)}
                          value={artistName}
                          placeholder="Artist Name"
                          placeholderTextColor="#666666"
                          autoCapitalize="words"
                          style={styles.input}
                          containerStyle={styles.rneInputContainer}
                          inputContainerStyle={styles.rneInputInnerContainer}
                        />
                      </View>
                      <Text style={styles.inputHint}>
                        This is how your name will appear on your releases
                      </Text>
                    </View>
                  )}

                  {/* Email input */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color="#8B5CF6"
                        style={styles.inputIcon}
                      />
                      <Input
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="Email address"
                        placeholderTextColor="#666666"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                        containerStyle={styles.rneInputContainer}
                        inputContainerStyle={styles.rneInputInnerContainer}
                      />
                    </View>
                  </View>

                  {/* Password input */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#8B5CF6"
                        style={styles.inputIcon}
                      />
                      <Input
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        secureTextEntry={!showPassword}
                        placeholder="Password"
                        placeholderTextColor="#666666"
                        autoCapitalize="none"
                        style={styles.input}
                        containerStyle={styles.rneInputContainer}
                        inputContainerStyle={styles.rneInputInnerContainer}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color="#666666"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password for Sign Up */}
                  {isSignUp && (
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color="#8B5CF6"
                          style={styles.inputIcon}
                        />
                        <Input
                          onChangeText={(text) => setConfirmPassword(text)}
                          value={confirmPassword}
                          secureTextEntry={!showConfirmPassword}
                          placeholder="Confirm Password"
                          placeholderTextColor="#666666"
                          autoCapitalize="none"
                          style={styles.input}
                          containerStyle={styles.rneInputContainer}
                          inputContainerStyle={styles.rneInputInnerContainer}
                        />
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          <Ionicons
                            name={
                              showConfirmPassword
                                ? "eye-off-outline"
                                : "eye-outline"
                            }
                            size={20}
                            color="#666666"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Main Action Button */}
                  <View style={[styles.buttonWrapper, styles.mt30]}>
                    <Animated.View
                      style={{ transform: [{ scale: buttonScale }] }}
                    >
                      <TouchableOpacity
                        onPressIn={() => handlePressIn(buttonScale)}
                        onPressOut={() => handlePressOut(buttonScale)}
                        onPress={() =>
                          isSignUp ? signUpWithEmail() : signInWithEmail()
                        }
                        disabled={loading}
                        activeOpacity={1}
                      >
                        <LinearGradient
                          colors={["#8B5CF6", "#A855F7", "#9333EA"]}
                          style={styles.primaryButton}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.primaryButtonText}>
                            {loading
                              ? "Loading..."
                              : isSignUp
                              ? "Create Account"
                              : "Sign In"}
                          </Text>
                          {!loading && (
                            <Ionicons
                              name="arrow-forward"
                              size={20}
                              color="#FFFFFF"
                              style={styles.buttonIcon}
                            />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>

                  {/* Resend confirmation email (only show after successful signup) */}
                  {signUpSuccess && (
                    <>
                      <View style={styles.messageWrapper}>
                        <Text style={styles.message}>
                          ✉️ Waiting for email confirmation...
                        </Text>
                      </View>
                      <View style={styles.buttonWrapper}>
                        <Animated.View
                          style={{ transform: [{ scale: resendButtonScale }] }}
                        >
                          <TouchableOpacity
                            onPressIn={() => handlePressIn(resendButtonScale)}
                            onPressOut={() => handlePressOut(resendButtonScale)}
                            onPress={() => resendConfirmationEmail()}
                            disabled={loading}
                            activeOpacity={1}
                          >
                            <View style={styles.secondaryButton}>
                              <Text style={styles.secondaryButtonText}>
                                {loading
                                  ? "Loading..."
                                  : "Resend Confirmation Email"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </Animated.View>
                      </View>
                    </>
                  )}
                </>
              )}

              {method === "phone" && (
                <>
                  {/* Display Name for Phone Sign Up */}
                  {isSignUp && !otpSent && (
                    <View style={[styles.inputWrapper, styles.mt20]}>
                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color="#8B5CF6"
                          style={styles.inputIcon}
                        />
                        <Input
                          onChangeText={(text) => setDisplayName(text)}
                          value={displayName}
                          placeholder="Display Name"
                          placeholderTextColor="#666666"
                          autoCapitalize="words"
                          style={styles.input}
                          containerStyle={styles.rneInputContainer}
                          inputContainerStyle={styles.rneInputInnerContainer}
                        />
                      </View>
                    </View>
                  )}

                  {/* Artist Name for Artist Phone Sign Up */}
                  {isSignUp && isArtist && !otpSent && (
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="musical-notes-outline"
                          size={20}
                          color="#8B5CF6"
                          style={styles.inputIcon}
                        />
                        <Input
                          onChangeText={(text) => setArtistName(text)}
                          value={artistName}
                          placeholder="Artist Name"
                          placeholderTextColor="#666666"
                          autoCapitalize="words"
                          style={styles.input}
                          containerStyle={styles.rneInputContainer}
                          inputContainerStyle={styles.rneInputInnerContainer}
                        />
                      </View>
                    </View>
                  )}

                  {!otpSent && (
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="call-outline"
                          size={20}
                          color="#8B5CF6"
                          style={styles.inputIcon}
                        />
                        <Input
                          onChangeText={(text) => setPhone(text)}
                          value={phone}
                          placeholder="+1 234 567 8901"
                          placeholderTextColor="#666666"
                          autoCapitalize="none"
                          keyboardType="phone-pad"
                          style={styles.input}
                          containerStyle={styles.rneInputContainer}
                          inputContainerStyle={styles.rneInputInnerContainer}
                        />
                      </View>
                    </View>
                  )}

                  {otpSent && (
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="keypad-outline"
                          size={20}
                          color="#8B5CF6"
                          style={styles.inputIcon}
                        />
                        <Input
                          onChangeText={(text) => setOtp(text)}
                          value={otp}
                          placeholder="Enter 6-digit OTP"
                          placeholderTextColor="#666666"
                          autoCapitalize="none"
                          keyboardType="numeric"
                          style={styles.input}
                          containerStyle={styles.rneInputContainer}
                          inputContainerStyle={styles.rneInputInnerContainer}
                        />
                      </View>
                    </View>
                  )}

                  <View style={[styles.buttonWrapper, styles.mt30]}>
                    <Animated.View
                      style={{ transform: [{ scale: buttonScale }] }}
                    >
                      <TouchableOpacity
                        onPressIn={() => handlePressIn(buttonScale)}
                        onPressOut={() => handlePressOut(buttonScale)}
                        onPress={() => (otpSent ? verifyPhoneOtp() : sendOtp())}
                        disabled={
                          loading || (!otpSent && !phone) || (otpSent && !otp)
                        }
                        activeOpacity={1}
                      >
                        <LinearGradient
                          colors={["#8B5CF6", "#A855F7", "#9333EA"]}
                          style={styles.primaryButton}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.primaryButtonText}>
                            {loading
                              ? "Loading..."
                              : otpSent
                              ? "Verify OTP"
                              : "Send OTP"}
                          </Text>
                          {!loading && (
                            <Ionicons
                              name="arrow-forward"
                              size={20}
                              color="#FFFFFF"
                              style={styles.buttonIcon}
                            />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </>
              )}

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {isSignUp
                    ? "Already have an account? "
                    : "Don't have an account? "}
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.footerLink}>
                    {isSignUp ? "Sign in" : "Sign up"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Artist Benefits Info */}
              {isSignUp && isArtist && (
                <LinearGradient
                  colors={[
                    "rgba(139, 92, 246, 0.1)",
                    "rgba(168, 85, 247, 0.05)",
                  ]}
                  style={styles.artistInfo}
                >
                  <View style={styles.artistInfoHeader}>
                    <Text style={styles.artistInfoTitle}>
                      🎤 Artist Benefits
                    </Text>
                    <Ionicons name="star" size={16} color="#8B5CF6" />
                  </View>
                  <View style={styles.benefitsList}>
                    <View style={styles.benefitItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.benefitText}>
                        Upload unlimited tracks
                      </Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.benefitText}>
                        Access to analytics dashboard
                      </Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.benefitText}>
                        Monetization opportunities
                      </Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.benefitText}>
                        Direct fan engagement tools
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

// Enhanced Styles with Biito Branding
const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: height,
  },
  container: {
    paddingHorizontal: 24,
    alignItems: "center",
    paddingVertical: 60,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 10,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(10px)",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
    borderRadius: 20,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  userTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 24,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userTypeIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  userTypeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
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
    marginBottom: 32,
    lineHeight: 22,
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 16,
    minHeight: 56,
    backdropFilter: "blur(10px)",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 16,
    flex: 1,
    fontWeight: "500",
  },
  rneInputContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  rneInputInnerContainer: {
    borderBottomWidth: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  inputHint: {
    fontSize: 13,
    color: "#8B5CF6",
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  buttonWrapper: {
    width: "100%",
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  messageWrapper: {
    marginBottom: 20,
  },
  message: {
    color: "#B3B3B3",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  mt20: {
    marginTop: 20,
  },
  mt30: {
    marginTop: 30,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    color: "#B3B3B3",
    fontSize: 15,
    lineHeight: 20,
  },
  footerLink: {
    color: "#8B5CF6",
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  artistInfo: {
    borderRadius: 20,
    padding: 24,
    marginTop: 32,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    width: "100%",
    backdropFilter: "blur(10px)",
  },
  artistInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  artistInfoTitle: {
    fontSize: 18,
    color: "#8B5CF6",
    fontWeight: "700",
    marginRight: 8,
    letterSpacing: 0.5,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  benefitText: {
    fontSize: 15,
    color: "#E5E5E5",
    marginLeft: 12,
    fontWeight: "500",
    lineHeight: 20,
  },
});
