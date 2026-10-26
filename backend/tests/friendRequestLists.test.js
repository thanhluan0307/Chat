import assert from "node:assert/strict";
import test from "node:test";
import { getFriendRequests } from "../src/controllers/friendController.js";
import FriendRequest from "../src/models/FriendRequest.js";
import friendRouter from "../src/routes/friendRoute.js";

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
function database(t, { sent = [], received = [] } = {}) {
  const calls = [];
  t.mock.method(FriendRequest, "find", (filter) => {
    const call = { filter };
    calls.push(call);
    return {
      select(fields) {
        call.fields = fields;
        return this;
      },
      populate(path, fields) {
        call.populate = { path, fields };
        return this;
      },
      sort(order) {
        call.sort = order;
        return this;
      },
      lean() {
        return Promise.resolve(filter.from ? sent : received);
      },
    };
  });
  return calls;
}

test("GET /requests is wired to the list controller", () => {
  const layer = friendRouter.stack.find(
    (item) => item.route?.path === "/requests" && item.route.methods.get
  );
  assert.ok(layer);
  assert.equal(layer.route.stack[0].handle, getFriendRequests);
});

test("sent and received lists are scoped to the current user, sorted newest first and populate only public profiles", async (t) => {
  const sent = [
    {
      _id: "outgoing",
      from: "current-user",
      to: { _id: "other-user", username: "linh", displayName: "Linh" },
    },
  ];
  const received = [
    {
      _id: "incoming",
      from: { _id: "other-user", username: "minh", displayName: "Minh" },
      to: "current-user",
    },
  ];
  const calls = database(t, { sent, received });
  const res = response();
  await getFriendRequests({ user: { _id: "current-user" } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { sent, received });
  assert.deepEqual(
    calls.map((call) => call.filter),
    [{ from: "current-user" }, { to: "current-user" }]
  );
  assert.deepEqual(
    calls.map((call) => call.populate.path),
    ["to", "from"]
  );
  for (const call of calls) {
    assert.deepEqual(call.sort, { createdAt: -1, _id: -1 });
    assert.equal(call.fields, "_id from to message createdAt updatedAt");
    assert.equal(call.populate.fields, "_id username displayName avatarUrl");
  }
});

test("no requests returns two empty lists", async (t) => {
  database(t);
  const res = response();
  await getFriendRequests({ user: { _id: "current-user" } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { sent: [], received: [] });
});

test("database errors return a generic failure", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(FriendRequest, "find", () => {
    throw new Error("private database details");
  });
  const res = response();
  await getFriendRequests({ user: { _id: "current-user" } }, res);
  assert.equal(res.code, 500);
  assert.deepEqual(res.body, { message: "Lỗi hệ thống" });
});
