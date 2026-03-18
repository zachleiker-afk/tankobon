import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api'; // Android emulator -> host machine
  }
  // iOS simulator, web, or physical device on same network
  return 'http://localhost:3000/api';
};

export const API_URL = getBaseUrl();
