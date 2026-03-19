const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    mainApplication.$['android:usesCleartextTraffic'] = 'true';
    mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return config;
  });
};
