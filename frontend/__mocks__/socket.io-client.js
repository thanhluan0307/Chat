/* eslint-env jest */

/** Giả lập Socket.IO để UI test điều khiển sự kiện mà không mở kết nối mạng. */
const io = jest.fn(function createSocketMock() {
  const handlers = Object.create(null);
  return {
    id: 'socket-test-id',
    on: jest.fn(function on(event, callback) {
      handlers[event] = callback;
      return this;
    }),
    connect: jest.fn(function connect() {
      return this;
    }),
    disconnect: jest.fn(function disconnect() {
      return this;
    }),
    removeAllListeners: jest.fn(function removeAllListeners() {
      Object.keys(handlers).forEach(event => delete handlers[event]);
      return this;
    }),
    receive: function receive(event, value) {
      handlers[event]?.(value);
    },
  };
});
module.exports = { io };
