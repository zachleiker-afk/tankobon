import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './src/services/notifications';

const navigationRef = React.createRef();

const RootNavigator = () => {
  const { userToken, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!userToken) return;

    // Listen for notifications received while app is in foreground
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('[App] Notification received:', notification);
    });

    // Handle user tapping on a notification
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.malId && data?.type === 'new_chapters') {
        // Navigate to manga detail screen using the external MAL ID
        navigationRef.current?.navigate('MangaDetail', { malId: data.malId });
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userToken]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {userToken ? <AppNavigator /> : <AuthNavigator />}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
