import assert from "node:assert/strict";
import test from "node:test";
import { getUsers } from "../src/controllers/userController.js";
import User from "../src/models/User.js";
import Friend from "../src/models/Friend.js";
import FriendRequest from "../src/models/FriendRequest.js";
import userRouter from "../src/routes/userRoute.js";

const publicUser = {
  _id: "other-user",
  displayName: "Linh Nguyễn",
  username: "linh",
  avatarUrl: null,
};
function request(query = {}) {
  return { query, user: { _id: "current-user" } };
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
  users = [publicUser],
  total = users.length,
  { friends = [], requests = [] } = {}
) {
  const calls = {};
  const relationQuery = (name, rows) => (filter) => {
    calls[name] = { filter };
    return {
      select(fields) {
        calls[name].fields = fields;
        return this;
      },
      lean() {
        return Promise.resolve(rows);
      },
    };
  };
  t.mock.method(Friend, "find", relationQuery("friends", friends));
  t.mock.method(FriendRequest, "find", relationQuery("requests", requests));
  const query = {
    select(value) {
      calls.select = value;
      return this;
    },
    sort(value) {
      calls.sort = value;
      return this;
    },
    skip(value) {
      calls.skip = value;
      return this;
    },
    limit(value) {
      calls.limit = value;
      return this;
    },
    lean() {
      return Promise.resolve(users);
    },
  };
  t.mock.method(User, "find", (filter) => {
    calls.filter = filter;
    return query;
  });
  t.mock.method(User, "countDocuments", (filter) => {
    calls.countFilter = filter;
    return Promise.resolve(total);
  });
  return calls;
}

test("GET root is wired to the paginated directory controller", () => {
  const layer = userRouter.stack.find(
    (item) => item.route?.path === "/" && item.route.methods.get
  );
  assert.ok(layer);
  assert.equal(layer.route.stack[0].handle, getUsers);
});

test("defaults exclude the current user and select only public directory fields", async (t) => {
  const calls = database(t);
  const res = response();
  await getUsers(request(), res);
  assert.equal(res.code, 200);
  assert.deepEqual(calls.filter, { _id: { $ne: "current-user" } });
  assert.deepEqual(calls.countFilter, calls.filter);
  assert.equal(calls.select, "_id displayName username avatarUrl");
  assert.deepEqual(calls.sort, { _id: -1 });
  assert.equal(calls.skip, 0);
  assert.equal(calls.limit, 20);
  assert.deepEqual(res.body, {
    users: [{ ...publicUser, friendshipStatus: "none" }],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

test("page and limit determine offset and navigation metadata", async (t) => {
  const calls = database(t, [publicUser], 5);
  const res = response();
  await getUsers(request({ page: "2", limit: "2" }), res);
  assert.equal(calls.skip, 2);
  assert.equal(calls.limit, 2);
  assert.deepEqual(res.body.pagination, {
    page: 2,
    limit: 2,
    total: 5,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
  });
});

test("an empty directory returns an empty successful page", async (t) => {
  database(t, [], 0);
  const res = response();
  await getUsers(request(), res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, {
    users: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

test("a page beyond the result set is empty and never claims another page", async (t) => {
  database(t, [], 3);
  const res = response();
  await getUsers(request({ page: "9", limit: "2" }), res);
  assert.deepEqual(res.body.users, []);
  assert.deepEqual(res.body.pagination, {
    page: 9,
    limit: 2,
    total: 3,
    totalPages: 2,
    hasNextPage: false,
    hasPreviousPage: true,
  });
});

test("invalid, repeated, oversized and unsafe pagination values are rejected before querying", async (t) => {
  database(t);
  const invalid = [
    { page: "0" },
    { page: "-1" },
    { page: "1.2" },
    { page: "1e2" },
    { page: "" },
    { page: ["1", "2"] },
    { page: { $gt: "" } },
    { limit: "0" },
    { limit: "101" },
    { limit: ["20"] },
    { page: "9007199254740992" },
    { page: "9007199254740991", limit: "100" },
  ];
  for (const query of invalid) {
    const res = response();
    await getUsers(request(query), res);
    assert.equal(res.code, 400, JSON.stringify(query));
  }
  assert.equal(User.find.mock.callCount(), 0);
  assert.equal(User.countDocuments.mock.callCount(), 0);
});

test("the supported maximum limit is accepted", async (t) => {
  const calls = database(t);
  const res = response();
  await getUsers(request({ limit: "100" }), res);
  assert.equal(res.code, 200);
  assert.equal(calls.limit, 100);
});

test("database failures return a generic error", async (t) => {
  database(t);
  t.mock.method(console, "error", () => {});
  t.mock.method(User, "countDocuments", async () => {
    throw new Error("private database details");
  });
  const res = response();
  await getUsers(request(), res);
  assert.equal(res.code, 500);
  assert.deepEqual(res.body, { message: "Lỗi hệ thống" });
});

test("search filters names and usernames before both pagination and count", async (t) => {
  const calls = database(t, [publicUser], 3);
  const res = response();
  await getUsers(request({ search: "  LINH  ", page: "2", limit: "2" }), res);
  assert.equal(res.code, 200);
  assert.deepEqual(calls.filter, {
    _id: { $ne: "current-user" },
    $or: [
      { displayName: { $regex: "LINH", $options: "i" } },
      { username: { $regex: "LINH", $options: "i" } },
    ],
  });
  assert.deepEqual(calls.countFilter, calls.filter);
  assert.equal(calls.skip, 2);
  assert.equal(res.body.pagination.total, 3);
});

test("search escapes regex metacharacters and whitespace means no filter", async (t) => {
  const calls = database(t);
  await getUsers(request({ search: "a.*[b]" }), response());
  const pattern = calls.filter.$or[0].displayName.$regex;
  assert.equal(new RegExp(pattern, "i").test("A.*[B]"), true);
  assert.equal(new RegExp(pattern, "i").test("aaaaab"), false);
  await getUsers(request({ search: "   " }), response());
  assert.deepEqual(calls.filter, { _id: { $ne: "current-user" } });
});

test("non-string and oversized searches are rejected without querying", async (t) => {
  database(t);
  for (const search of [["linh"], { $ne: "" }, "a".repeat(101)]) {
    const res = response();
    await getUsers(request({ search }), res);
    assert.equal(res.code, 400);
  }
  assert.equal(User.find.mock.callCount(), 0);
});

test("directory includes relationship state scoped to the current page in two queries", async (t) => {
  const users = [
    "friend-a",
    "friend-b",
    "outgoing",
    "incoming",
    "stranger",
  ].map((_id) => ({ ...publicUser, _id }));
  const ids = users.map((user) => user._id);
  const calls = database(t, users, 50, {
    friends: [
      { userA: "current-user", userB: "friend-a" },
      { userA: "friend-b", userB: "current-user" },
    ],
    requests: [
      { from: "current-user", to: "outgoing" },
      { from: "incoming", to: "current-user" },
    ],
  });
  const res = response();
  await getUsers(request({ page: "2" }), res);
  assert.equal(res.code, 200);
  assert.deepEqual(
    res.body.users.map((user) => user.friendshipStatus),
    ["friends", "friends", "sent", "received", "none"]
  );
  assert.deepEqual(calls.friends.filter, {
    $or: [
      { userA: "current-user", userB: { $in: ids } },
      { userB: "current-user", userA: { $in: ids } },
    ],
  });
  assert.deepEqual(calls.requests.filter, {
    $or: [
      { from: "current-user", to: { $in: ids } },
      { to: "current-user", from: { $in: ids } },
    ],
  });
  assert.equal(calls.friends.fields, "userA userB");
  assert.equal(calls.requests.fields, "from to");
  assert.equal(Friend.find.mock.callCount(), 1);
  assert.equal(FriendRequest.find.mock.callCount(), 1);
  assert.equal(res.body.pagination.total, 50);
  assert.equal(res.body.pagination.page, 2);
});

test("friendship takes precedence over stale pending requests and incoming takes precedence over legacy opposite requests", async (t) => {
  const users = ["friend", "pending"].map((_id) => ({ ...publicUser, _id }));
  database(t, users, 2, {
    friends: [{ userA: "current-user", userB: "friend" }],
    requests: [
      { from: "friend", to: "current-user" },
      { from: "pending", to: "current-user" },
      { from: "current-user", to: "pending" },
    ],
  });
  const res = response();
  await getUsers(request(), res);
  assert.deepEqual(
    res.body.users.map((user) => user.friendshipStatus),
    ["friends", "received"]
  );
});

test("an empty directory page does not query relationship collections", async (t) => {
  database(t, [], 0);
  await getUsers(request(), response());
  assert.equal(Friend.find.mock.callCount(), 0);
  assert.equal(FriendRequest.find.mock.callCount(), 0);
});

test("relationship lookup failure returns an error rather than enabling incorrect friend buttons", async (t) => {
  database(t);
  t.mock.method(console, "error", () => {});
  t.mock.method(Friend, "find", () => {
    throw new Error("private details");
  });
  const res = response();
  await getUsers(request(), res);
  assert.equal(res.code, 500);
  assert.deepEqual(res.body, { message: "Lỗi hệ thống" });
});
