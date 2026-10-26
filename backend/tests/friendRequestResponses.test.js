import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  acceptFriendRequest,
  declineFriendRequest,
} from "../src/controllers/friendController.js";
import Friend from "../src/models/Friend.js";
import FriendRequest from "../src/models/FriendRequest.js";
import User from "../src/models/User.js";
import friendRouter from "../src/routes/friendRoute.js";

const senderId = "64b000000000000000000003";
const recipientId = "64b000000000000000000001";
const requestId = "64b000000000000000000010";
const objectId = (id) => new mongoose.Types.ObjectId(id);
const pending = {
  _id: objectId(requestId),
  from: objectId(senderId),
  to: objectId(recipientId),
};
const profile = {
  _id: objectId(senderId),
  username: "linh",
  displayName: "Linh Nguyễn",
  avatarUrl: "https://example.com/avatar.png",
  email: "private@example.com",
  hashedPassword: "private-hash",
};

function request(id = requestId, userId = recipientId) {
  return { params: { requestId: id }, user: { _id: objectId(userId) } };
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
    sendStatus(code) {
      this.code = code;
      return this;
    },
  };
}
function database(
  t,
  { record = pending, sender = profile, deletedCount = 1 } = {}
) {
  const calls = {};
  t.mock.method(FriendRequest, "findById", async () => record);
  t.mock.method(User, "findById", (id) => {
    calls.profileId = id;
    return {
      select(fields) {
        calls.fields = fields;
        return this;
      },
      lean() {
        return Promise.resolve(sender);
      },
    };
  });
  t.mock.method(Friend, "updateOne", async () => ({
    acknowledged: true,
    matchedCount: 1,
  }));
  t.mock.method(FriendRequest, "deleteOne", async () => ({ deletedCount }));
  return calls;
}
function noWrites() {
  assert.equal(Friend.updateOne.mock.callCount(), 0);
  assert.equal(FriendRequest.deleteOne.mock.callCount(), 0);
}

test("accept and decline routes are wired to the receiver actions", () => {
  for (const [path, handler] of [
    ["/requests/:requestId/accept", acceptFriendRequest],
    ["/requests/:requestId/decline", declineFriendRequest],
  ]) {
    const layer = friendRouter.stack.find(
      (item) => item.route?.path === path && item.route.methods.post
    );
    assert.ok(layer);
    assert.equal(layer.route.stack[0].handle, handler);
  }
});

test("malformed request IDs return 400 before database access for both actions", async (t) => {
  database(t);
  for (const handler of [acceptFriendRequest, declineFriendRequest]) {
    for (const id of [null, [], {}, "bad", "z".repeat(24), "a".repeat(12)]) {
      const res = response();
      await handler(request(id), res);
      assert.equal(res.code, 400);
    }
  }
  assert.equal(FriendRequest.findById.mock.callCount(), 0);
  noWrites();
});

test("missing requests return 404 without mutations", async (t) => {
  database(t, { record: null });
  for (const handler of [acceptFriendRequest, declineFriendRequest]) {
    const res = response();
    await handler(request(), res);
    assert.equal(res.code, 404);
  }
  noWrites();
});

test("the sender or another user cannot accept or decline a received request", async (t) => {
  database(t);
  for (const handler of [acceptFriendRequest, declineFriendRequest]) {
    for (const userId of [senderId, "64b000000000000000000004"]) {
      const res = response();
      await handler(request(requestId, userId), res);
      assert.equal(res.code, 403);
    }
  }
  assert.equal(User.findById.mock.callCount(), 0);
  noWrites();
});

test("accept upserts one canonical friendship, removes the receiver's request and returns only public profile fields", async (t) => {
  const calls = database(t);
  const res = response();
  await acceptFriendRequest(request(), res);
  assert.equal(res.code, 200);
  assert.equal(calls.profileId.toString(), senderId);
  assert.equal(calls.fields, "_id username displayName avatarUrl");
  assert.deepEqual(Friend.updateOne.mock.calls[0].arguments, [
    { userA: recipientId, userB: senderId },
    { $setOnInsert: { userA: recipientId, userB: senderId } },
    { upsert: true },
  ]);
  assert.deepEqual(FriendRequest.deleteOne.mock.calls[0].arguments[0], {
    _id: pending._id,
    to: objectId(recipientId),
  });
  assert.deepEqual(res.body.newFriend, {
    _id: profile._id,
    username: "linh",
    displayName: "Linh Nguyễn",
    avatarUrl: profile.avatarUrl,
  });
  assert.equal(res.body.newFriend.email, undefined);
  assert.equal(res.body.newFriend.hashedPassword, undefined);
});

test("a concurrent duplicate friendship is treated as already created and still clears the pending request", async (t) => {
  database(t);
  t.mock.method(Friend, "updateOne", async () => {
    throw Object.assign(new Error("duplicate pair"), { code: 11000 });
  });
  const res = response();
  await acceptFriendRequest(request(), res);
  assert.equal(res.code, 200);
  assert.equal(FriendRequest.deleteOne.mock.callCount(), 1);
});

test("a deleted sender cannot be accepted but the recipient can still decline the stale invitation", async (t) => {
  database(t, { sender: null });
  const res = response();
  await acceptFriendRequest(request(), res);
  assert.equal(res.code, 404);
  noWrites();
  const declined = response();
  await declineFriendRequest(request(), declined);
  assert.equal(declined.code, 204);
  assert.equal(Friend.updateOne.mock.callCount(), 0);
});

test("failed friendship writes keep the invitation so acceptance can be retried", async (t) => {
  database(t);
  t.mock.method(console, "error", () => {});
  t.mock.method(Friend, "updateOne", async () => {
    throw new Error("private details");
  });
  const res = response();
  await acceptFriendRequest(request(), res);
  assert.equal(res.code, 500);
  assert.deepEqual(res.body, { message: "Lỗi hệ thống" });
  assert.equal(FriendRequest.deleteOne.mock.callCount(), 0);
});

test("accept can recover if removing the request fails after the friendship was saved", async (t) => {
  database(t);
  t.mock.method(console, "error", () => {});
  let attempts = 0;
  t.mock.method(FriendRequest, "deleteOne", async () => {
    if (++attempts === 1) throw new Error("temporary failure");
    return { deletedCount: 1 };
  });
  const first = response();
  await acceptFriendRequest(request(), first);
  assert.equal(first.code, 500);
  const retry = response();
  await acceptFriendRequest(request(), retry);
  assert.equal(retry.code, 200);
  assert.equal(Friend.updateOne.mock.callCount(), 2);
  assert.ok(
    Friend.updateOne.mock.calls.every((call) => call.arguments[2].upsert)
  );
});

test("decline deletes only the received invitation and creates no friendship", async (t) => {
  database(t);
  const res = response();
  await declineFriendRequest(request(), res);
  assert.equal(res.code, 204);
  assert.equal(Friend.updateOne.mock.callCount(), 0);
  assert.equal(User.findById.mock.callCount(), 0);
  assert.deepEqual(FriendRequest.deleteOne.mock.calls[0].arguments[0], {
    _id: pending._id,
    to: objectId(recipientId),
  });
});

test("a request removed by another action cannot falsely report a successful decline", async (t) => {
  database(t, { deletedCount: 0 });
  const res = response();
  await declineFriendRequest(request(), res);
  assert.equal(res.code, 404);
});

test("legacy self invitations cannot create self friendships", async (t) => {
  database(t, { record: { ...pending, from: objectId(recipientId) } });
  const res = response();
  await acceptFriendRequest(request(), res);
  assert.equal(res.code, 400);
  noWrites();
});

test("lookup failures return a generic error for either action", async (t) => {
  database(t);
  t.mock.method(console, "error", () => {});
  t.mock.method(FriendRequest, "findById", async () => {
    throw new Error("private database details");
  });
  for (const handler of [acceptFriendRequest, declineFriendRequest]) {
    const res = response();
    await handler(request(), res);
    assert.equal(res.code, 500);
    assert.deepEqual(res.body, { message: "Lỗi hệ thống" });
  }
});
