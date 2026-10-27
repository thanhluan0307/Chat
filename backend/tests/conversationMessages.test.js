import assert from "node:assert/strict";
import test from "node:test";
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";
import { getMessages } from "../src/controllers/conversationController.js";
import { sendDirectMessage } from "../src/controllers/messageController.js";
import { io } from "../src/socket/index.js";

const me = "64b000000000000000000001";
const friend = "64b000000000000000000002";
const stranger = "64b000000000000000000003";
const roomId = "64b000000000000000000010";
function response() {
  return {
    code: 200,
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
function room(members = [me, friend], type = "direct") {
  return {
    _id: roomId,
    type,
    participants: members.map((userId) => ({ userId })),
    unreadCounts: new Map(),
    set(values) {
      Object.assign(this, values);
    },
    async save() {},
  };
}
function history(query = {}, userId = me) {
  return { params: { conversationId: roomId }, query, user: { _id: userId } };
}
function send(body = {}) {
  return {
    body: {
      recipientId: friend,
      conversationId: roomId,
      content: "  Xin chào!  ",
      ...body,
    },
    user: { _id: me },
  };
}

test("history rejects a non-member before reading any messages", async (t) => {
  t.mock.method(Conversation, "findById", async () => room());
  t.mock.method(Message, "find", () => {
    throw Error("Must not read private messages");
  });
  const res = response();
  await getMessages(history({}, stranger), res);
  assert.equal(res.code, 403);
  assert.equal(Message.find.mock.callCount(), 0);
});

test("history returns 404 for a missing room", async (t) => {
  t.mock.method(Conversation, "findById", async () => null);
  const res = response();
  await getMessages(history(), res);
  assert.equal(res.code, 404);
});

test("history validates the room, page size and cursor before querying MongoDB", async (t) => {
  t.mock.method(Conversation, "findById", async () => {
    throw Error("Must not query");
  });
  const requests = [
    { ...history(), params: { conversationId: "invalid" } },
    history({ limit: "0" }),
    history({ limit: "101" }),
    history({ limit: "1.5" }),
    history({ cursor: "invalid" }),
    history({ cursor: { bad: "value" } }),
  ];
  for (const req of requests) {
    const res = response();
    await getMessages(req, res);
    assert.equal(res.code, 400);
  }
  assert.equal(Conversation.findById.mock.callCount(), 0);
});

test("members receive their room's recent messages in chronological order", async (t) => {
  t.mock.method(Conversation, "findById", async () => room());
  let filter, sort, limit;
  const rows = [3, 2, 1].map((n) => ({
    _id: `message-${n}`,
    createdAt: new Date(`2026-10-27T10:00:0${n}.000Z`),
  }));
  t.mock.method(Message, "find", (value) => {
    filter = value;
    return {
      sort(value) {
        sort = value;
        return {
          async limit(value) {
            limit = value;
            return [...rows];
          },
        };
      },
    };
  });
  const res = response();
  await getMessages(history({ limit: "2" }), res);
  assert.equal(res.code, 200);
  assert.deepEqual(filter, { conversationId: roomId });
  assert.deepEqual(sort, { createdAt: -1 });
  assert.equal(limit, 3);
  assert.deepEqual(
    res.body.messages.map((row) => row._id),
    ["message-2", "message-3"]
  );
  assert.equal(res.body.nextCursor, rows[1].createdAt.toISOString());
});

test("sending rejects an existing room for a different sender, recipient or group type", async (t) => {
  let current;
  t.mock.method(Conversation, "findById", async () => current);
  t.mock.method(Message, "create", async () => {
    throw Error("Must not send");
  });
  for (const invalidRoom of [
    room([stranger, friend]),
    room([me, stranger]),
    room([me, friend], "group"),
    room([me, friend, stranger]),
  ]) {
    current = invalidRoom;
    const res = response();
    await sendDirectMessage(send(), res);
    assert.equal(res.code, 403);
  }
  assert.equal(Message.create.mock.callCount(), 0);
});

test("a missing supplied room never silently creates a replacement", async (t) => {
  t.mock.method(Conversation, "findById", async () => null);
  t.mock.method(Conversation, "create", async () => {
    throw Error("Must not replace a room");
  });
  const res = response();
  await sendDirectMessage(send(), res);
  assert.equal(res.code, 404);
  assert.equal(Conversation.create.mock.callCount(), 0);
});

test("sending validates text and room ID before database writes", async (t) => {
  t.mock.method(Conversation, "findById", async () => {
    throw Error("Must not query");
  });
  for (const body of [
    { content: "  " },
    { content: {} },
    { content: "x".repeat(4001) },
    { conversationId: "bad-id" },
  ]) {
    const res = response();
    await sendDirectMessage(send(body), res);
    assert.equal(res.code, 400);
  }
  assert.equal(Conversation.findById.mock.callCount(), 0);
});

test("sending to an authorized room stores trimmed text and derives sender from JWT", async (t) => {
  const conversation = room();
  t.mock.method(Conversation, "findById", async () => conversation);
  t.mock.method(Message, "create", async (values) => ({
    ...values,
    _id: "message-1",
    createdAt: new Date(),
  }));
  t.mock.method(io, "to", () => ({ emit() {} }));
  const res = response();
  await sendDirectMessage(send({ senderId: stranger }), res);
  assert.equal(res.code, 201);
  assert.deepEqual(Message.create.mock.calls[0].arguments[0], {
    conversationId: roomId,
    senderId: me,
    content: "Xin chào!",
  });
  assert.equal(res.body.message.senderId, me);
  assert.equal(conversation.unreadCounts.get(friend), 1);
  assert.equal(conversation.unreadCounts.get(me), 0);
});

/** Kiểm tra phòng mới thông báo cả hai phía, còn mở lại phòng cũ không phát nhầm sự kiện tạo phòng. */
test("creating a direct room notifies both users only after saving; opening it again emits nothing", async (t) => {
  const { createConversation } = await import(
    "../src/controllers/conversationController.js"
  );
  let existing = null;
  t.mock.method(Conversation, "findOne", async () => existing);
  t.mock.method(Conversation.prototype, "save", async function save() {
    return this;
  });
  t.mock.method(Conversation.prototype, "populate", async function populate() {
    return this;
  });
  const emissions = [];
  t.mock.method(io, "to", (rooms) => ({
    emit(name, payload) {
      emissions.push({ rooms, name, payload });
    },
  }));
  const req = {
    user: { _id: me },
    body: { type: "direct", memberIds: [friend] },
  };
  const first = response();
  await createConversation(req, first);
  assert.equal(first.code, 201);
  assert.equal(Conversation.prototype.save.mock.callCount(), 1);
  assert.deepEqual(emissions, [
    {
      rooms: [`user:${me}`, `user:${friend}`],
      name: "conversation-created",
      payload: { conversationId: first.body.conversation._id.toString() },
    },
  ]);
  existing = new Conversation({
    ...first.body.conversation,
    participants: [{ userId: me }, { userId: friend }],
  });
  const second = response();
  await createConversation(req, second);
  assert.equal(second.code, 201);
  assert.equal(
    second.body.conversation._id.toString(),
    first.body.conversation._id.toString()
  );
  assert.equal(Conversation.prototype.save.mock.callCount(), 1);
  assert.equal(emissions.length, 1);
});
