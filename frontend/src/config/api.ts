/** Cấu hình URL REST và Socket.IO theo môi trường; production cần URL HTTPS backend. */
import { Platform, TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

interface SourceCodeModule extends TurboModule {
  getConstants: () => { scriptURL?: string };
}
const sourceCode = __DEV__
  ? TurboModuleRegistry.get<SourceCodeModule>('SourceCode')
  : null;
const metroHost = sourceCode
  ?.getConstants()
  .scriptURL?.match(/^https?:\/\/(\[[^\]]+\]|[^/:]+)/)?.[1];
const isLoopback =
  !metroHost || ['localhost', '127.0.0.1', '[::1]'].includes(metroHost);
const developmentHost = isLoopback
  ? Platform.OS === 'android'
    ? '10.0.2.2'
    : 'localhost'
  : metroHost;

export const API_BASE_URL = __DEV__ ? `http://${developmentHost}:5001/api` : '';

export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');
