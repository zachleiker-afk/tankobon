export const lightColors = {
  // Backgrounds
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceVariant: '#f0edff',

  // Text
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textOnPrimary: '#ffffff',

  // Accent
  primary: '#6C5CE7',
  primaryLight: '#f0edff',

  // Borders
  border: '#dddddd',
  borderLight: '#eeeeee',

  // Status colors
  statusReading: '#27ae60',
  statusCompleted: '#6C5CE7',
  statusPlanToRead: '#3498db',
  statusOnHold: '#f39c12',
  statusDropped: '#e74c3c',

  // Misc
  error: '#e74c3c',
  shadow: '#000000',
  inputBackground: '#ffffff',
  placeholder: '#999999',
  feedAction: '#555555',
  ratingStarColor: '#f39c12',
};

export const darkColors = {
  // Backgrounds
  background: '#1a1a2e',
  surface: '#16213e',
  surfaceVariant: '#1e2a4a',

  // Text
  textPrimary: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textTertiary: '#707070',
  textOnPrimary: '#ffffff',

  // Accent
  primary: '#6C5CE7',
  primaryLight: '#2a2550',

  // Borders
  border: '#2a3a5c',
  borderLight: '#1e2a4a',

  // Status colors (slightly brightened for dark bg)
  statusReading: '#2ecc71',
  statusCompleted: '#7c6ff7',
  statusPlanToRead: '#5dade2',
  statusOnHold: '#f5b041',
  statusDropped: '#ec7063',

  // Misc
  error: '#ec7063',
  shadow: '#000000',
  inputBackground: '#1e2a4a',
  placeholder: '#606880',
  feedAction: '#b0b0b0',
  ratingStarColor: '#f5b041',
};

export const getStatusColor = (status, colors) => {
  const map = {
    reading: colors.statusReading,
    completed: colors.statusCompleted,
    plan_to_read: colors.statusPlanToRead,
    on_hold: colors.statusOnHold,
    dropped: colors.statusDropped,
  };
  return map[status] || colors.textTertiary;
};
