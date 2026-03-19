import React, { createContext, useState, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken, unregisterPushToken } from '../services/notifications';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const pushTokenRef = useRef(null);

  // Check if user was previously logged in (app restart)
  React.useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token && userData) {
          setUserToken(token);
          setUser(JSON.parse(userData));

          // Re-register push token on app restart if logged in
          const pushToken = await registerPushToken(token);
          pushTokenRef.current = pushToken;
        }
      } catch (e) {
        console.error('Error reading token:', e);
      }
      setIsLoading(false);
    };
    checkToken();
  }, []);

  const signIn = async (token, userData) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUserToken(token);
      setUser(userData);

      // Register push token after sign in
      const pushToken = await registerPushToken(token);
      pushTokenRef.current = pushToken;
    } catch (e) {
      console.error('Error saving token:', e);
    }
  };

  const signOut = async () => {
    try {
      // Unregister push token before signing out
      if (pushTokenRef.current && userToken) {
        await unregisterPushToken(userToken, pushTokenRef.current);
        pushTokenRef.current = null;
      }

      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setUserToken(null);
      setUser(null);
    } catch (e) {
      console.error('Error removing token:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ userToken, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
