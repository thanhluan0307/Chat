import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import jwt from "jsonwebtoken";
import { io as createClient } from "socket.io-client";
import { setupSocket } from "../src/socket/setupSocket.js";
import { userRoom } from "../src/socket/rooms.js";
import { io } from "../src/socket/index.js";
import User from "../src/models/User.js";
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";
import { sendDirectMessage } from "../src/controllers/messageController.js";
import { emitNewMessage } from "../src/utils/messageHelper.js";

const sender = "64b000000000000000000001";
const recipient = "64b000000000000000000002";
const outsider = "64b000000000000000000003";
const conversationId = "64b000000000000000000010";

/** Chờ sự kiện của kết nối thật, có timeout để test không bị treo khi sai luồng. */
function event(socket, name) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error(`Timeout ${name}`)), 3000);
    socket.once(name, (value) => {
      clearTimeout(timeout);
      resolve(value);
    });
  });
}

/** Kiểm tra lưu tin rồi phát qua kết nối thật, nhiều thiết bị, cách ly người ngoài và reconnect; DB được mock. */
test("saved direct messages reach all participant devices once, stay private and recover the user room after reconnect", async (t) => {
  const oldSecret = process.env.ACCESS_TOKEN_SECRET;
  process.env.ACCESS_TOKEN_SECRET = "test-realtime-secret";
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", () => {});
  t.mock.method(User, "findById", (id) => ({
    async select() {
      return { _id: id };
    },
  }));
  const server = createServer();
  const socketServer = setupSocket(server);
  const clients = [];
  t.after(async () => {
    clients.forEach((client) => client.disconnect());
    await new Promise((resolve) => socketServer.close(resolve));
    if (oldSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
    else process.env.ACCESS_TOKEN_SECRET = oldSecret;
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  async function connect(userId) {
    const client = createClient(url, {
      autoConnect: false,
      reconnection: false,
      transports: ["websocket"],
      auth: {
        token: jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "5m",
        }),
      },
    });
    clients.push(client);
    const connected = event(client, "connect");
    client.connect();
    await connected;
    return client;
  }
  const senderPhone = await connect(sender);
  const senderTablet = await connect(sender);
  const recipientPhone = await connect(recipient);
  const outsiderPhone = await connect(outsider);
  const outsiderSocket = socketServer.sockets.sockets.get(outsiderPhone.id);
  outsiderSocket.on("test-sync", (acknowledge) => acknowledge());
  outsiderPhone.emit("join-room", userRoom(recipient));
  outsiderPhone.emit("new-message", { message: { content: "forged" } });
  await outsiderPhone.timeout(3000).emitWithAck("test-sync");
  assert.equal(outsiderSocket.rooms.has(userRoom(recipient)), false);
  assert.equal(outsiderSocket.rooms.has(userRoom(outsider)), true);

  const received = clients.map(() => []);
  clients.forEach((client, index) =>
    client.on("new-message", (payload) => received[index].push(payload))
  );
  async function flush() {
    const arrived = clients.map((client) => event(client, "test-flush"));
    socketServer.emit("test-flush");
    await Promise.all(arrived);
  }
  const conversation = {
    _id: conversationId,
    type: "direct",
    participants: [{ userId: sender }, { userId: recipient }],
    unreadCounts: new Map(),
    set(values) {
      Object.assign(this, values);
    },
    async save() {},
  };
  t.mock.method(Conversation, "findById", async () => conversation);
  t.mock.method(Message, "create", async (values) => ({
    ...values,
    _id: "message-1",
    createdAt: new Date("2026-10-27T10:00:00Z"),
  }));
  t.mock.method(io, "to", (rooms) => socketServer.to(rooms));
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
  await sendDirectMessage(
    {
      user: { _id: sender },
      body: {
        conversationId,
        recipientId: recipient,
        content: "  Chào realtime!  ",
      },
    },
    res
  );
  await flush();
  assert.equal(res.code, 201);
  assert.deepEqual(
    received.map((messages) => messages.length),
    [1, 1, 1, 0]
  );
  assert.deepEqual(received[2][0].message, {
    _id: "message-1",
    conversationId,
    senderId: sender,
    content: "Chào realtime!",
    createdAt: "2026-10-27T10:00:00.000Z",
  });
  assert.deepEqual(received[2][0].unreadCounts, {
    [sender]: 0,
    [recipient]: 1,
  });

  const disconnected = event(
    socketServer.sockets.sockets.get(recipientPhone.id),
    "disconnect"
  );
  recipientPhone.disconnect();
  await disconnected;
  const reconnected = event(recipientPhone, "connect");
  recipientPhone.connect();
  await reconnected;
  assert.equal(
    socketServer.sockets.sockets
      .get(recipientPhone.id)
      .rooms.has(userRoom(recipient)),
    true
  );
  emitNewMessage(socketServer, conversation, {
    ...res.body.message,
    _id: "message-2",
  });
  await flush();
  assert.deepEqual(
    received.map((messages) => messages.length),
    [2, 2, 2, 0]
  );

  conversation.save = async () => {
    throw Error("Database failed");
  };
  await sendDirectMessage(
    {
      user: { _id: sender },
      body: {
        conversationId,
        recipientId: recipient,
        content: "Chưa cập nhật được phòng",
      },
    },
    res
  );
  await flush();
  assert.equal(res.code, 500);
  assert.deepEqual(
    received.map((messages) => messages.length),
    [2, 2, 2, 0]
  );
});
