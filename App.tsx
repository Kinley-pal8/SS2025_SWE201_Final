import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

// Import your screens (keep your existing paths)
import Splash from "./src/presentation/components/Splash";
import SignUpOrLogIn from "./src/presentation/components/SignUpOrLogIn";
import Auth from "./src/presentation/components/Auth";
import Home from "./src/presentation/components/Home";
import Account from "./src/presentation/components/Account";

// Import the Zustand stores
import { useAuthStore } from "./src/persistence/stores/authStore";
import { useTracksStore } from "./src/persistence/stores/tracksStore";

// Define the navigation stack's param list
export type RootStackParamList = {
  Splash: undefined;
  SignUpOrLogIn: undefined;
  Auth: {
    method: "email" | "phone";
    userType: "artist" | "listener";
    action: "signin" | "signup";
  };
  Home: undefined;
  Account: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Get store functions
  const {
    initialize,
    user,
    loading: authLoading,
    error: authError,
  } = useAuthStore();
  const loadTracks = useTracksStore((state) => state.loadTracks);

  // Initialize stores on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 Initializing app...");

        // Add delay to ensure AsyncStorage is ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Initialize authentication with listener setup
        await initialize();

        // Load initial tracks with error handling
        try {
          await loadTracks(true);
        } catch (tracksError) {
          console.warn("Tracks loading failed:", tracksError);
          // Continue with app initialization even if tracks fail
        }

        console.log("✅ App initialized successfully");
        setIsAppReady(true);
      } catch (error) {
        console.error("❌ App initialization error:", error);
        setInitError(
          error instanceof Error ? error.message : "Failed to initialize app"
        );
        // Still mark app as ready to prevent infinite loading
        setIsAppReady(true);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen while initializing
  if (!isAppReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Initializing...</Text>
        {initError && <Text style={styles.errorText}>{initError}</Text>}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false, // Hide headers for all screens
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        {/* Splash Screen */}
        <Stack.Screen
          name="Splash"
          component={Splash}
          options={{
            gestureEnabled: false,
          }}
        />

        {/* Sign Up or Log In Screen */}
        <Stack.Screen
          name="SignUpOrLogIn"
          component={SignUpOrLogIn}
          options={{
            title: "Get Started",
          }}
        />

        {/* Auth Screen (Email/Phone + User Type) */}
        <Stack.Screen
          name="Auth"
          component={Auth}
          options={{
            title: "Authentication",
          }}
        />

        {/* Home Screen */}
        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            title: "Home",
            gestureEnabled: false, // Prevent swipe back from home
          }}
        />

        {/* Account/Settings Screen */}
        <Stack.Screen
          name="Account"
          component={Account}
          options={{
            title: "Account",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0A", // Match your app's background
    paddingHorizontal: 20,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
  },
});
