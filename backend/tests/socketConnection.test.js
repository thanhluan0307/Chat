import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import jwt from "jsonwebtoken";
import { io as createClient } from "socket.io-client";
import { setupSocket } from "../src/socket/setupSocket.js";
import User from "../src/models/User.js";

/** Chờ một sự kiện socket, báo lỗi nếu hết thời gian chờ. */
function waitForEvent(socket, event) {
  return new Promise(function wait(resolve, reject) {
    const timer = setTimeout(function timeout() {
      reject(Error(`Không nhận ${event}`));
    }, 3000);
    socket.once(event, function received(data) {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Kiểm tra kết nối thật với JWT hợp lệ, từ chối token sai/hết hạn
 * và xác nhận backend nhận sự kiện ngắt kết nối; DB được mock.
 */
test("Socket.IO connection verifies JWT, accepts the session and rejects unauthorized clients", async function run(t) {
  const oldSecret = process.env.ACCESS_TOKEN_SECRET;
  process.env.ACCESS_TOKEN_SECRET = "socket-connection-test-secret";
  const user = {
    _id: "64b000000000000000000001",
    username: "test",
    displayName: "Test User",
  };
  let fields;
  t.mock.method(User, "findById", function find() {
    return {
      select: async function select(value) {
        fields = value;
        return user;
      },
    };
  });
  const info = t.mock.method(console, "info", function log() {});
  const server = createServer();
  const socketServer = setupSocket(server);
  const clients = [];
  t.after(async function cleanup() {
    clients.forEach(function close(client) {
      client.disconnect();
    });
    await new Promise(function closeServer(resolve) {
      socketServer.close(resolve);
    });
    if (oldSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = oldSecret;
  });
  await new Promise(function listen(resolve) {
    server.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  function clientFor(token) {
    const client = createClient(url, {
      autoConnect: false,
      reconnection: false,
      transports: ["websocket"],
      auth: { token },
    });
    clients.push(client);
    return client;
  }
  const token = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "5m" }
  );
  const client = clientFor(token);
  const connected = waitForEvent(client, "connect");
  client.connect();
  await connected;
  assert.equal(client.connected, true);
  assert.equal(fields, "_id username displayName avatarUrl");
  assert.ok(
    info.mock.calls.some(function matched(call) {
      return call.arguments[1] === client.id;
    })
  );
  const invalidTokens = [
    undefined,
    "invalid-token",
    jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: -1,
    }),
  ];
  for (const invalidToken of invalidTokens) {
    const rejected = clientFor(invalidToken);
    const failure = waitForEvent(rejected, "connect_error");
    rejected.connect();
    assert.equal((await failure).data.code, "UNAUTHORIZED");
    assert.equal(rejected.connected, false);
  }
  const serverSocket = socketServer.sockets.sockets.get(client.id);
  const disconnected = waitForEvent(serverSocket, "disconnect");
  client.disconnect();
  await disconnected;
});
