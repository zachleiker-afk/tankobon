import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user was previously logged in (app restart)
  React.useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token && userData) {
          setUserToken(token);
          setUser(JSON.parse(userData));
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
    } catch (e) {
      console.error('Error saving token:', e);
    }
  };

  const signOut = async () => {
    try {
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
