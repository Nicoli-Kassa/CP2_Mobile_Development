import { existsSync } from 'fs';
import path from 'path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Estende o `app.json` apontando o `google-services.json` (FCM no Android)
 * somente quando o arquivo existe — sem ele o prebuild falharia.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile = './google-services.json';
  const hasGoogleServices = existsSync(path.join(__dirname, googleServicesFile));

  return {
    ...config,
    name: config.name ?? 'CP2 Chat',
    slug: config.slug ?? 'cp2-chat-firebase',
    android: {
      ...config.android,
      ...(hasGoogleServices ? { googleServicesFile } : {}),
    },
  };
};
