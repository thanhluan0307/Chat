import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { signIn, signOut, refreshToken } from "../src/controllers/authController.js";
import User from "../src/models/User.js";
import Session from "../src/models/Session.js";

function response() {
  return {
    code: 200, body: undefined, cookies: [],
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    sendStatus(code) { this.code = code; return this; },
    cookie(...args) { this.cookies.push(args); return this; },
    clearCookie(...args) { this.cleared = args; return this; },
  };
}
function loginMocks(t) {
  t.mock.method(User, "findOne", async () => ({ _id: "user-1", displayName: "Test", hashedPassword: "test-hash" }));
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(jwt, "sign", () => "test-access");
  t.mock.method(Session, "create", async () => ({}));
}

test("mobile sign-in explicitly returns refresh credentials without a browser cookie", async (t) => {
  loginMocks(t);
  const res = response();
  await signIn({ body: { username: "test", password: "fake-password", client: "mobile" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.accessToken, "test-access");
  assert.match(res.body.refreshToken, /^[a-f0-9]{128}$/);
  assert.equal(Session.create.mock.calls[0].arguments[0].refreshToken, res.body.refreshToken);
  assert.equal(res.cookies.length, 0);
});

test("browser sign-in keeps refresh credentials in the HttpOnly cookie only", async (t) => {
  loginMocks(t);
  const res = response();
  await signIn({ body: { username: "test", password: "fake-password" } }, res);
  assert.equal(res.body.refreshToken, undefined);
  assert.equal(res.cookies[0][0], "refreshToken");
  assert.equal(res.cookies[0][2].httpOnly, true);
});

test("mobile refresh uses its body token instead of a stale cookie", async (t) => {
  const lookup = t.mock.method(Session, "findOne", async () => ({ userId: "user-1", expiresAt: new Date(Date.now() + 60000) }));
  t.mock.method(jwt, "sign", () => "new-test-access");
  const res = response();
  await refreshToken({ body: { client: "mobile", refreshToken: "mobile-test-refresh" }, cookies: { refreshToken: "stale-test-cookie" } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(lookup.mock.calls[0].arguments[0], { refreshToken: "mobile-test-refresh" });
  assert.deepEqual(res.body, { accessToken: "new-test-access" });
});

test("invalid or expired refresh credentials cannot produce access tokens", async (t) => {
  t.mock.method(Session, "findOne", async () => ({ expiresAt: new Date(0) }));
  const sign = t.mock.method(jwt, "sign", () => "must-not-be-issued");
  for (const token of [undefined, { $ne: "" }, ["token"], "expired-test-refresh"]) {
    const res = response();
    await refreshToken({ body: { client: "mobile", refreshToken: token } }, res);
    assert.ok([401, 403].includes(res.code));
  }
  assert.equal(sign.mock.callCount(), 0);
  assert.equal(Session.findOne.mock.callCount(), 1);
});

test("mobile sign-out revokes the stored token and browser refresh still accepts cookies", async (t) => {
  const remove = t.mock.method(Session, "deleteOne", async () => ({}));
  const res = response();
  await signOut({ body: { client: "mobile", refreshToken: "mobile-test-refresh" } }, res);
  assert.equal(res.code, 204);
  assert.deepEqual(remove.mock.calls[0].arguments[0], { refreshToken: "mobile-test-refresh" });
  t.mock.method(Session, "findOne", async () => ({ userId: "user-1", expiresAt: new Date(Date.now() + 60000) }));
  t.mock.method(jwt, "sign", () => "browser-test-access");
  const browser = response();
  await refreshToken({ cookies: { refreshToken: "browser-test-refresh" } }, browser);
  assert.equal(browser.code, 200);
});
