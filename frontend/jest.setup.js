/* eslint-env jest */

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Use the library's in-memory implementation; all session logic remains real.
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(
    require('react-native-mmkv/lib/createMMKV/createMockMMKV').createMockMMKV,
  ),
}));
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(async () => ({
    username: 'ChatApp',
    password: '00000000000000000000000000000000',
  })),
  setGenericPassword: jest.fn(async () => ({ service: 'test' })),
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly' },
}));
jest.mock('react-native-get-random-values', () => {});
global.crypto = require('crypto').webcrypto;
beforeEach(async () => {
  await require('./src/storage/sessionStorage').clearSession();
});

/** Mock transport cho các test kiểm tra vòng đời kết nối frontend. */
jest.mock('socket.io-client');
