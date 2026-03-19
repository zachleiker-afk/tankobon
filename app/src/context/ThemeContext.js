import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme/colors';

const THEME_STORAGE_KEY = '@app_theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // dark mode is default
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved !== null) {
          setIsDark(saved === 'dark');
        }
        // If nothing saved, keep default (dark)
      } catch (e) {
        console.error('Error loading theme:', e);
      }
      setIsThemeLoaded(true);
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newValue = !isDark;
    setIsDark(newValue);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newValue ? 'dark' : 'light');
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, isThemeLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
