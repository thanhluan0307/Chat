import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import { io } from 'socket.io-client';
import App from '../App';
import { httpClient } from '../src/api/http';
import { navigationRef } from '../src/navigation/navigationRef';
import { saveSession } from '../src/storage/sessionStorage';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
const ioMock = jest.mocked(io);
const user = {
  _id: '64b000000000000000000001',
  username: 'luan',
  displayName: 'Thanh Luân',
  email: 'luan@example.com',
};
const friend = { _id: '64b000000000000000000002', displayName: 'Linh Nguyễn' };
const room = {
  _id: '64b000000000000000000010',
  type: 'direct',
  participants: [user, friend],
  unreadCounts: {},
};
const historyUrl = `/conversations/${room._id}/messages`;
type MockSocket = {
  receive: (event: string, value?: unknown) => void;
  off: jest.Mock;
};
function socket(): MockSocket {
  return ioMock.mock.results.at(-1)?.value as unknown as MockSocket;
}
function message(
  id: string,
  content: string,
  senderId = friend._id,
  conversationId = room._id,
) {
  return {
    _id: id,
    conversationId,
    senderId,
    content,
    createdAt: '2026-10-27T10:00:00.000Z',
  };
}
async function openChats() {
  await saveSession({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user,
  });
  await render(<App />);
  await screen.findByRole('button', { name: 'Mở trò chuyện với Linh Nguyễn' });
}
async function openRoom() {
  await openChats();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Mở trò chuyện với Linh Nguyễn' }),
  );
}
beforeEach(() => {
  apiMock.reset();
  ioMock.mockClear();
  apiMock.onGet('/users/me').reply(200, { user });
  apiMock.onGet('/conversations').reply(200, { conversations: [room] });
  apiMock.onGet(historyUrl).reply(200, { messages: [] });
});
afterAll(() => apiMock.restore());

test('live messages survive a late history response, ignore other rooms/malformed data and deduplicate HTTP acknowledgements', async () => {
  let finishHistory: (() => void) | undefined;
  apiMock.onGet(historyUrl).reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finishHistory = () => resolve([200, { messages: [] }]);
      }),
  );
  await openRoom();
  await screen.findByLabelText('Đang tải tin nhắn');
  const incoming = message('message-1', 'Tin mới realtime');
  await act(() => {
    socket().receive('new-message', { message: incoming });
    socket().receive('new-message', { message: incoming });
    socket().receive('new-message', {
      message: message('other', 'Tin phòng khác', friend._id, 'other-room'),
    });
    socket().receive('new-message', {
      message: { ...incoming, createdAt: 'invalid' },
    });
    socket().receive('new-message', null);
    finishHistory?.();
  });
  expect(await screen.findAllByText('Tin mới realtime')).toHaveLength(1);
  expect(screen.queryByText('Tin phòng khác')).toBeNull();
  const outgoing = message('message-2', 'Phản hồi realtime', user._id);
  let finishSend: (() => void) | undefined;
  apiMock.onPost('/messages/direct').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finishSend = () => resolve([201, { message: outgoing }]);
      }),
  );
  await fireEvent.changeText(
    screen.getByLabelText('Nội dung tin nhắn'),
    outgoing.content,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  await act(() => socket().receive('new-message', { message: outgoing }));
  expect(await screen.findAllByText(outgoing.content)).toHaveLength(1);
  await act(() => finishSend?.());
  expect(await screen.findAllByText(outgoing.content)).toHaveLength(1);
  expect(screen.getByLabelText('Nội dung tin nhắn')).toHaveProp('value', '');
});

test('reconnecting resynchronizes missed history and leaving a room removes its own listeners', async () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  await openRoom();
  await screen.findByText('Chưa có tin nhắn');
  apiMock
    .onGet(historyUrl)
    .reply(200, { messages: [message('missed', 'Tin lúc mất kết nối')] });
  await act(() => socket().receive('connect'));
  expect(await screen.findByText('Tin lúc mất kết nối')).toBeOnTheScreen();
  expect(
    apiMock.history.get.filter(item => item.url === historyUrl),
  ).toHaveLength(2);
  await act(() => navigationRef.goBack());
  await screen.findByRole('button', { name: 'Mở trò chuyện với Linh Nguyễn' });
  expect(socket().off).toHaveBeenCalledWith(
    'new-message',
    expect.any(Function),
  );
  expect(socket().off).toHaveBeenCalledWith('connect', expect.any(Function));
  const before = apiMock.history.get.filter(
    item => item.url === historyUrl,
  ).length;
  await act(() => socket().receive('connect'));
  expect(
    apiMock.history.get.filter(item => item.url === historyUrl),
  ).toHaveLength(before);
  info.mockRestore();
});

test('the chat list refreshes previews/unread counts, discovers new rooms and preserves live data over an older request', async () => {
  await openChats();
  let finishOld: (() => void) | undefined;
  apiMock.onGet('/conversations').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finishOld = () => resolve([200, { conversations: [room] }]);
      }),
  );
  await act(() =>
    socket().receive('conversation-created', { conversationId: room._id }),
  );
  const incoming = message('message-1', 'Bạn có tin mới');
  const secondRoom = {
    ...room,
    _id: 'second-room',
    type: 'group',
    group: { name: 'Nhóm mới' },
  };
  apiMock
    .onGet('/conversations')
    .reply(200, {
      conversations: [
        {
          ...room,
          lastMessage: { ...incoming, senderId: friend },
          unreadCounts: { [user._id]: 3 },
        },
        secondRoom,
      ],
    });
  await act(() => socket().receive('new-message', { message: incoming }));
  expect(await screen.findByText(incoming.content)).toBeOnTheScreen();
  expect(await screen.findByText('Nhóm mới')).toBeOnTheScreen();
  expect(screen.getByText('3')).toBeOnTheScreen();
  await act(() => finishOld?.());
  expect(screen.getByText(incoming.content)).toBeOnTheScreen();
  expect(screen.getByText('Nhóm mới')).toBeOnTheScreen();
});
