import 'react-native-get-random-values';
import * as Keychain from 'react-native-keychain';
import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { AuthSession } from '../api/auth';

// The native polyfill installs this global at runtime.
declare const crypto: { getRandomValues: (bytes: Uint8Array) => Uint8Array };

const KEY_SERVICE = 'chatapp.session.encryption-key';
const SESSION_KEY = 'session.v1';
let storagePromise: Promise<MMKV> | undefined;

async function openStorage(): Promise<MMKV> {
  const credentials = await Keychain.getGenericPassword({
    service: KEY_SERVICE,
  });
  let encryptionKey: string;
  if (credentials) {
    encryptionKey = credentials.password;
  } else {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    encryptionKey = Array.from(bytes, byte =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    const saved = await Keychain.setGenericPassword('ChatApp', encryptionKey, {
      service: KEY_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    if (!saved) throw new Error('Không thể lưu khóa bảo vệ phiên đăng nhập.');
  }
  return createMMKV({
    id: 'chatapp.session',
    encryptionKey,
    encryptionType: 'AES-256',
  });
}

function getStorage(): Promise<MMKV> {
  if (!storagePromise) {
    storagePromise = openStorage().catch(error => {
      storagePromise = undefined;
      throw error;
    });
  }
  return storagePromise;
}

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<AuthSession>;
  return (
    typeof session.accessToken === 'string' &&
    !!session.accessToken.trim() &&
    typeof session.refreshToken === 'string' &&
    !!session.refreshToken.trim() &&
    !!session.user &&
    ['_id', 'username', 'displayName', 'email'].every(
      field =>
        typeof session.user?.[field as keyof AuthSession['user']] === 'string',
    )
  );
}

// Serialize writes so an outstanding save cannot resurrect a signed-out session.
let pending: Promise<unknown> = Promise.resolve();
function write(operation: (storage: MMKV) => void): Promise<void> {
  const next = pending
    .catch(() => {})
    .then(async () => operation(await getStorage()));
  pending = next;
  return next;
}

export async function readSession(): Promise<AuthSession | null> {
  await pending.catch(() => {});
  const storage = await getStorage();
  const raw = storage.getString(SESSION_KEY);
  if (!raw) return null;
  try {
    const session: unknown = JSON.parse(raw);
    if (isSession(session)) return session;
  } catch {
    /* Discard only malformed session data. */
  }
  storage.remove(SESSION_KEY);
  return null;
}

export function saveSession(session: AuthSession): Promise<void> {
  return write(storage => storage.set(SESSION_KEY, JSON.stringify(session)));
}

export function clearSession(): Promise<void> {
  return write(storage => {
    storage.remove(SESSION_KEY);
  });
}
