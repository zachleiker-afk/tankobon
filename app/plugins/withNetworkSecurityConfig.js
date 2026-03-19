const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withNetworkSecurityConfig(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const resPath = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(resPath, { recursive: true });

      const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">52.14.24.27</domain>
    </domain-config>
</network-security-config>`;

      fs.writeFileSync(path.join(resPath, 'network_security_config.xml'), networkSecurityConfig);
      return config;
    },
  ]);
};
