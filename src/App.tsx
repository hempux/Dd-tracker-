import React, { useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Platform,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { HomeScreen } from './screens/HomeScreen';
import { Colors } from './theme';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Could show an in-app banner here
      }
    );

    // Listen for notification responses (user tapped a notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // Could navigate to the item here
      }
    );

    // Hide splash screen after a short delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 300);

    return () => {
      clearTimeout(timer);
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <HomeScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
