import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { sendFriendRequest } from "../src/controllers/friendController.js";
import Friend from "../src/models/Friend.js";
import FriendRequest from "../src/models/FriendRequest.js";
import User from "../src/models/User.js";
import friendRouter from "../src/routes/friendRoute.js";

const senderId = "64b000000000000000000001";
const recipientId = "64b000000000000000000002";
const requestId = "64b000000000000000000003";
const now = new Date("2026-10-26T00:00:00.000Z");
const pairKey = `${senderId}:${recipientId}`;

function request(body = { to: recipientId }, sender = senderId) {
  return { body, user: { _id: new mongoose.Types.ObjectId(sender) } };
}
function response() {
  return {
    code: 200,
    body: undefined,
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
function database(
  t,
  { userExists = true, alreadyFriends = null, existingRequest = null } = {}
) {
  t.mock.method(User, "exists", async () =>
    userExists ? { _id: recipientId } : null
  );
  t.mock.method(Friend, "findOne", async () => alreadyFriends);
  t.mock.method(FriendRequest, "findOne", async () => existingRequest);
  t.mock.method(FriendRequest, "create", async (values) => ({
    _id: requestId,
    ...values,
    createdAt: now,
    updatedAt: now,
  }));
}

function noDatabaseCalls() {
  assert.equal(User.exists.mock.callCount(), 0);
  assert.equal(Friend.findOne.mock.callCount(), 0);
  assert.equal(FriendRequest.findOne.mock.callCount(), 0);
  assert.equal(FriendRequest.create.mock.callCount(), 0);
}

test("POST /requests is wired to the send controller", () => {
  const layer = friendRouter.stack.find(
    (item) => item.route?.path === "/requests" && item.route.methods.post
  );
  assert.ok(layer);
  assert.equal(layer.route.stack[0].handle, sendFriendRequest);
});

test("sending uses the authenticated sender, normalizes input and returns only API fields", async (t) => {
  database(t);
  const res = response();
  await sendFriendRequest(
    request({
      to: recipientId.toUpperCase(),
      message: "  Chào bạn!  ",
      from: requestId,
      pairKey: "client-controlled-key",
    }),
    res
  );
  assert.equal(res.code, 201);
  assert.deepEqual(User.exists.mock.calls[0].arguments[0], {
    _id: recipientId,
  });
  assert.deepEqual(Friend.findOne.mock.calls[0].arguments[0], {
    userA: senderId,
    userB: recipientId,
  });
  assert.deepEqual(FriendRequest.findOne.mock.calls[0].arguments[0], {
    $or: [
      { from: senderId, to: recipientId },
      { from: recipientId, to: senderId },
    ],
  });
  assert.deepEqual(FriendRequest.create.mock.calls[0].arguments[0], {
    from: senderId,
    to: recipientId,
    pairKey,
    message: "Chào bạn!",
  });
  assert.deepEqual(res.body, {
    message: "Gửi lời mời kết bạn thành công",
    request: {
      _id: requestId,
      from: senderId,
      to: recipientId,
      message: "Chào bạn!",
      createdAt: now,
      updatedAt: now,
    },
  });
  assert.equal(res.body.request.pairKey, undefined);
});

test("missing or malformed recipient IDs are rejected before any database access", async (t) => {
  database(t);
  const invalidBodies = [
    null,
    {},
    [],
    { to: null },
    { to: 123 },
    { to: [] },
    { to: { $ne: "" } },
    { to: "not-an-id" },
    { to: "a".repeat(12) },
    { to: "z".repeat(24) },
  ];
  for (const body of invalidBodies) {
    const res = response();
    await sendFriendRequest(request(body), res);
    assert.equal(res.code, 400, JSON.stringify(body));
  }
  const req = request();
  delete req.body;
  const res = response();
  await sendFriendRequest(req, res);
  assert.equal(res.code, 400);
  noDatabaseCalls();
});

test("ObjectId versus uppercase string still rejects a self invitation", async (t) => {
  database(t);
  const res = response();
  await sendFriendRequest(request({ to: senderId.toUpperCase() }), res);
  assert.equal(res.code, 400);
  assert.match(res.body.message, /chính mình/);
  noDatabaseCalls();
});

test("invalid and oversized messages are rejected without querying", async (t) => {
  database(t);
  for (const message of [null, 1, false, [], {}, "a".repeat(301)]) {
    const res = response();
    await sendFriendRequest(request({ to: recipientId, message }), res);
    assert.equal(res.code, 400);
  }
  noDatabaseCalls();
});

test("messages are optional, whitespace-only text is omitted and 300 trimmed characters are allowed", async (t) => {
  database(t);
  for (const message of [undefined, "", "   ", `  ${"a".repeat(300)}  `]) {
    const res = response();
    await sendFriendRequest(request({ to: recipientId, message }), res);
    assert.equal(res.code, 201);
    const created = FriendRequest.create.mock.calls.at(-1).arguments[0];
    assert.equal(created.message, message?.trim() || undefined);
    if (!message?.trim())
      assert.equal(Object.hasOwn(created, "message"), false);
  }
});

test("a nonexistent recipient returns 404 and does not create a request", async (t) => {
  database(t, { userExists: false });
  const res = response();
  await sendFriendRequest(request(), res);
  assert.equal(res.code, 404);
  assert.equal(Friend.findOne.mock.callCount(), 0);
  assert.equal(FriendRequest.create.mock.callCount(), 0);
});

test("an existing friendship returns 409 with canonical pair lookup", async (t) => {
  database(t, { alreadyFriends: { _id: "friendship" } });
  const res = response();
  await sendFriendRequest(request({ to: senderId }, recipientId), res);
  assert.equal(res.code, 409);
  assert.deepEqual(Friend.findOne.mock.calls[0].arguments[0], {
    userA: senderId,
    userB: recipientId,
  });
  assert.equal(FriendRequest.create.mock.callCount(), 0);
});

test("an outgoing or incoming pending request returns 409 including legacy records without pairKey", async (t) => {
  for (const existing of [
    { from: senderId, to: recipientId },
    { from: recipientId, to: senderId },
  ]) {
    await t.test(existing.from, async (sub) => {
      database(sub, { existingRequest: existing });
      const res = response();
      await sendFriendRequest(request(), res);
      assert.equal(res.code, 409);
      assert.equal(FriendRequest.create.mock.callCount(), 0);
    });
  }
});

for (const reversed of [false, true]) {
  test(`concurrent ${
    reversed ? "opposite-direction" : "same-direction"
  } sends share one unique pair`, async (t) => {
    database(t);
    const storedPairs = new Set();
    t.mock.method(FriendRequest, "create", async (values) => {
      // Simulate the atomic unique index while both pre-checks return no records.
      if (storedPairs.has(values.pairKey))
        throw Object.assign(new Error("duplicate"), { code: 11000 });
      storedPairs.add(values.pairKey);
      return { _id: requestId, ...values, createdAt: now, updatedAt: now };
    });
    const first = response();
    const second = response();
    await Promise.all([
      sendFriendRequest(request(), first),
      sendFriendRequest(
        reversed ? request({ to: senderId }, recipientId) : request(),
        second
      ),
    ]);
    assert.deepEqual([first.code, second.code].sort(), [201, 409]);
    assert.deepEqual([...storedPairs], [pairKey]);
    assert.equal(FriendRequest.create.mock.callCount(), 2);
  });
}

test("schema derives the same pair key for either direction and defines a unique partial index", async () => {
  for (const [from, to] of [
    [senderId, recipientId],
    [recipientId, senderId],
  ]) {
    const doc = new FriendRequest({
      from,
      to,
      message: "  Hi  ",
      pairKey: "untrusted",
    });
    await doc.validate();
    assert.equal(doc.pairKey, pairKey);
    assert.equal(doc.message, "Hi");
  }
  const index = FriendRequest.schema
    .indexes()
    .find(([fields]) => fields.pairKey === 1);
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, {
    pairKey: { $type: "string" },
  });
  assert.equal(FriendRequest.schema.path("pairKey").options.select, false);
});

test("database failures return a generic 500 without exposing details", async (t) => {
  database(t);
  t.mock.method(console, "error", () => {});
  t.mock.method(FriendRequest, "create", async () => {
    throw new Error("private database details");
  });
  const res = response();
  await sendFriendRequest(request(), res);
  assert.equal(res.code, 500);
  assert.deepEqual(res.body, { message: "Lỗi hệ thống" });
});
