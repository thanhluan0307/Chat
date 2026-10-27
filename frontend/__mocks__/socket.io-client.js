/* eslint-env jest */

/** Giả lập nhiều listener và gỡ từng callback như Socket.IO thật, không mở kết nối mạng. */
const io = jest.fn(function createSocketMock() {
  const handlers = new Map();
  return {
    id: 'socket-test-id',
    on: jest.fn(function on(event, callback) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(callback);
      return this;
    }),
    off: jest.fn(function off(event, callback) {
      if (callback) handlers.get(event)?.delete(callback);
      else handlers.delete(event);
      return this;
    }),
    connect: jest.fn(function connect() {
      return this;
    }),
    disconnect: jest.fn(function disconnect() {
      return this;
    }),
    removeAllListeners: jest.fn(function removeAllListeners() {
      handlers.clear();
      return this;
    }),
    receive: function receive(event, value) {
      [...(handlers.get(event) ?? [])].forEach(callback => callback(value));
    },
  };
});
module.exports = { io };
