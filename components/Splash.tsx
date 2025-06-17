import React, { useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import * as Animatable from "react-native-animatable";
import { useNavigation } from "@react-navigation/native";

export default function Splash() {
  const navigation = useNavigation();

  useEffect(() => {
    // wait 3 secs then go to signup screen
    setTimeout(() => {
      navigation.replace("SignUpOrLogIn");
    }, 3000);
  }, []);

  return (
    <View style={styles.container}>
      {/* fade in the logo */}
      <Animatable.Image
        animation="fadeIn"
        duration={1500}
        source={require("../assets/logo.png")}
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  logo: {
    width: 100,
    height: 100,
  },
});