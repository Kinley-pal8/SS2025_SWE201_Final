import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// Import your screens
import Splash from "./components/Splash";
import SignUpOrLogIn from "./components/SignUpOrLogIn";
import Auth from "./components/Auth";
import Home from "./components/Home";
import Account from "./components/Account";

// Define the navigation stack's param list
export type RootStackParamList = {
  Splash: undefined;
  SignUpOrLogIn: undefined;
  Auth: {
    method: "email" | "phone";
    userType: "artist" | "listener";
    action: "signin" | "signup";
  };
  Home: { session: any };
  Account: { session: any };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
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
            animationEnabled: false,
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