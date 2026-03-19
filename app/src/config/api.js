// Production server on AWS
// Once tankobon.is-a.dev is active, use: 'http://tankobon.is-a.dev:3000/api'
const PRODUCTION_URL = 'http://52.14.24.27:3000/api';

// Local development server
// import { Platform } from 'react-native';
// const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';

// Toggle between production and local:
export const API_URL = PRODUCTION_URL;
