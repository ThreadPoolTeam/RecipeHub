// Test handler của Functions trên Emulator (Auth + Firestore). FCM không có emulator → dùng MessagingPort giả.
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || "demo-recipehub";

import { expect } from "chai";
import type { BatchResponse } from "firebase-admin/messaging";
import { Timestamp } from "firebase-admin/firestore";
import { auth, db, MessagingPort, setMessagingForTest } from "../src/lib/admin";
import { initialRole, provisionUser } from "../src/users/provision";
import { ensureProfileHandler } from "../src/users/ensureProfile";
import { setUserRoleHandler } from "../src/users/setUserRole";
import { setUserDisabledHandler } from "../src/users/setUserDisabled";
import { deprovisionUser } from "../src/users/onUserCreated";
import { syncDevice } from "../src/users/onDeviceWritten";
import { backfillAll } from "../src/users/backfillUsers";
import { MULTICAST_LIMIT, sendNotificationHandler } from "../src/notifications/sendNotification";
import { isDeadTokenError } from "../src/notifications/tokenCleanup";
import { countDeleted, countNewIncident, countStatusChange, modelKey, openDelta, versionKey } from "../src/incidents/stats";
import { recordCrashlyticsIssue } from "../src/incidents/onCrashlyticsNewFatal";
import { seedRecipesHandler } from "../src/recipes/seedRecipes";
import { dayKey, mapKey } from "../src/lib/stats";
import { assertAdmin } from "../src/lib/guards";
import { requireUid } from "../src/lib/validate";

const ADMINS = "boss@example.com, second@example.com";
const caller = { uid: "boss", email: "boss@example.com" };

async function clearAll() {
  for (const c of ["users", "incidents", "notifications", "stats", "recipes"]) {
    await db.recursiveDelete(db.collection(c));
  }
  const list = await auth.listUsers();
  if (list.users.length > 0) await auth.deleteUsers(list.users.map((u) => u.uid));
}

async function expectHttpsError(p: Promise<unknown>, code: string) {
  try {
    await p;
  } catch (e) {
    expect((e as { code?: string }).code).to.equal(code);
    return;
  }
  expect.fail(`expected ${code}`);
}

function fakeMessaging(over: Partial<MessagingPort> = {}): MessagingPort {
  return {
    sendToTopic: async () => "id",
    sendToTokens: async (tokens) =>
      ({ successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })) }) as unknown as BatchResponse,
    unsubscribe: async () => undefined,
    ...over,
  };
}

async function makeUser(uid: string, email: string | null, verified = true) {
  await auth.createUser({ uid, ...(email ? { email, emailVerified: verified } : {}) });
  return provisionUser({ uid, email, emailVerified: verified, isAnonymous: email == null }, ADMINS);
}

const summary = async () => (await db.doc("stats/summary").get()).data() ?? {};

describe("functions handlers", function () {
  this.timeout(30000);
  beforeEach(clearAll);
  afterEach(() => setMessagingForTest(null));

  it("F01 email đã xác minh thuộc ADMIN_EMAILS → admin, khác → viewer; bộ đếm đúng", async () => {
    expect(await makeUser("boss", "BOSS@example.com")).to.equal("admin");
    expect(await makeUser("bob", "bob@example.com")).to.equal("viewer");
    expect((await auth.getUser("boss")).customClaims?.role).to.equal("admin");
    const s = await summary();
    expect(s.totalUsers).to.equal(2);
    expect(s.adminUsers).to.equal(1);
  });

  it("F02 email admin CHƯA xác minh → viewer (chặn đăng ký giả email admin)", async () => {
    expect(initialRole({ uid: "x", email: "boss@example.com", emailVerified: false, isAnonymous: false }, ADMINS)).to.equal(
      "viewer",
    );
    expect(await makeUser("fake", "boss@example.com", false)).to.equal("viewer");
  });

  it("F03 provision chạy lại không đếm trùng; cập nhật email khi khách liên kết Google", async () => {
    await makeUser("g1", null);
    await provisionUser({ uid: "g1", email: null, isAnonymous: true }, ADMINS);
    expect((await summary()).totalUsers).to.equal(1);
    await provisionUser({ uid: "g1", email: "g1@example.com", emailVerified: true, isAnonymous: false }, ADMINS);
    const d = (await db.doc("users/g1").get()).data();
    expect(d?.email).to.equal("g1@example.com");
    expect(d?.isAnonymous).to.equal(false);
    expect(d?.role).to.equal("viewer");
  });

  it("F04 ensureProfile: user cũ được tạo hồ sơ, giữ claim khác, báo cần làm mới token", async () => {
    await auth.createUser({ uid: "boss", email: "boss@example.com", emailVerified: true });
    await auth.setCustomUserClaims("boss", { store: "Q1" });
    const r = await ensureProfileHandler("boss", undefined, ADMINS);
    expect(r).to.deep.equal({ role: "admin", disabled: false, refreshToken: true });
    expect((await auth.getUser("boss")).customClaims).to.deep.equal({ store: "Q1", role: "admin" });
    expect((await ensureProfileHandler("boss", "admin", ADMINS)).refreshToken).to.equal(false);
  });

  it("F05 backfill lấy trạng thái khóa từ Auth", async () => {
    await auth.createUser({ uid: "z", email: "z@example.com", emailVerified: true, disabled: true });
    expect((await backfillAll(ADMINS)).scanned).to.equal(1);
    expect((await db.doc("users/z").get()).get("disabled")).to.equal(true);
    expect((await summary()).disabledUsers).to.equal(1);
  });

  it("F06 setUserRole: đổi role, giữ claim khác, chặn tự hạ quyền, input sai, uid có '/'", async () => {
    await makeUser("boss", "boss@example.com");
    await makeUser("bob", "bob@example.com");
    await auth.setCustomUserClaims("bob", { role: "viewer", store: "Q1" });
    await setUserRoleHandler("boss", { uid: "bob", role: "admin" });
    expect((await auth.getUser("bob")).customClaims).to.deep.equal({ role: "admin", store: "Q1" });
    expect((await summary()).adminUsers).to.equal(2);
    await setUserRoleHandler("boss", { uid: "bob", role: "admin" });
    expect((await summary()).adminUsers).to.equal(2, "đặt lại cùng vai trò không đếm thêm");
    await expectHttpsError(setUserRoleHandler("boss", { uid: "boss", role: "viewer" }), "failed-precondition");
    await expectHttpsError(setUserRoleHandler("boss", { uid: "bob", role: "root" }), "invalid-argument");
    await expectHttpsError(setUserRoleHandler("boss", { uid: "nobody", role: "viewer" }), "not-found");
    await expectHttpsError(setUserRoleHandler("boss", { uid: "bob/devices/d1", role: "viewer" }), "invalid-argument");
    await makeUser("g", null);
    await expectHttpsError(setUserRoleHandler("boss", { uid: "g", role: "admin" }), "failed-precondition");
  });

  it("F07 hai Admin đổi vai trò cùng lúc → adminUsers chỉ +1", async () => {
    await makeUser("boss", "boss@example.com");
    await makeUser("bob", "bob@example.com");
    await Promise.all([
      setUserRoleHandler("boss", { uid: "bob", role: "admin" }),
      setUserRoleHandler("boss", { uid: "bob", role: "admin" }),
    ]);
    expect((await summary()).adminUsers).to.equal(2);
  });

  it("F08 setUserDisabled: khóa Auth + Firestore, hủy topic, chặn tự khóa, bấm đúp không đếm 2 lần", async () => {
    const unsubscribed: string[] = [];
    setMessagingForTest(fakeMessaging({ unsubscribe: async (t) => void unsubscribed.push(...t) }));
    await makeUser("boss", "boss@example.com");
    await makeUser("bob", "bob@example.com");
    await db.doc("users/bob/devices/d1").set({ token: "tok-bob", platform: "android" });
    await Promise.all([
      setUserDisabledHandler("boss", { uid: "bob", disabled: true }),
      setUserDisabledHandler("boss", { uid: "bob", disabled: true }),
    ]);
    expect((await auth.getUser("bob")).disabled).to.equal(true);
    expect((await summary()).disabledUsers).to.equal(1);
    expect(unsubscribed).to.include("tok-bob");
    await setUserDisabledHandler("boss", { uid: "bob", disabled: false });
    expect((await summary()).disabledUsers).to.equal(0);
    await expectHttpsError(setUserDisabledHandler("boss", { uid: "boss", disabled: true }), "failed-precondition");
    await expectHttpsError(setUserDisabledHandler("boss", { uid: "ghost", disabled: true }), "not-found");
  });

  it("F09 assertAdmin: claim admin nhưng Firestore đã hạ quyền / khóa → từ chối", async () => {
    await makeUser("boss", "boss@example.com");
    const req = (uid: string, role: string) => ({ auth: { uid, token: { role, email: `${uid}@x.com` } } }) as never;
    expect((await assertAdmin(req("boss", "admin"))).uid).to.equal("boss");
    await db.doc("users/boss").update({ role: "viewer" });
    await expectHttpsError(assertAdmin(req("boss", "admin")), "permission-denied");
    await db.doc("users/boss").update({ role: "admin", disabled: true });
    await expectHttpsError(assertAdmin(req("boss", "admin")), "permission-denied");
    await expectHttpsError(assertAdmin(req("boss", "viewer")), "permission-denied");
    await expectHttpsError(assertAdmin({ auth: undefined } as never), "unauthenticated");
  });

  it("F10 gửi 1 user: token chết bị xóa, invalid-argument KHÔNG xóa, ghi lịch sử", async () => {
    setMessagingForTest(
      fakeMessaging({
        sendToTokens: async (tokens) =>
          ({
            successCount: 1,
            failureCount: tokens.length - 1,
            responses: tokens.map((t) =>
              t === "tok-dead"
                ? { success: false, error: { code: "messaging/registration-token-not-registered", message: "dead" } }
                : t === "tok-bad"
                  ? { success: false, error: { code: "messaging/invalid-argument", message: "bad" } }
                  : { success: true },
            ),
          }) as unknown as BatchResponse,
      }),
    );
    await db.doc("users/bob").set({ email: "bob@example.com" });
    for (const id of ["good", "dead", "bad"]) await db.doc(`users/bob/devices/${id}`).set({ token: `tok-${id}` });
    const r = await sendNotificationHandler(caller, {
      title: "Món mới", body: "Thử", target: "user", targetUid: "bob", data: { type: "recipe", targetId: "CF-MUOI" },
    });
    expect(r.successCount).to.equal(1);
    expect((await db.doc("users/bob/devices/dead").get()).exists).to.equal(false);
    expect((await db.doc("users/bob/devices/bad").get()).exists).to.equal(true);
    const hist = (await db.doc(`notifications/${r.id}`).get()).data();
    expect(hist?.data).to.deep.equal({ type: "recipe", targetId: "CF-MUOI" });
    expect((await summary()).notificationsSent).to.equal(1);
  });

  it("F11 hơn 500 thiết bị → chia lô", async () => {
    const batches: number[] = [];
    setMessagingForTest(
      fakeMessaging({
        sendToTokens: async (tokens) => {
          batches.push(tokens.length);
          return { successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })) } as unknown as BatchResponse;
        },
      }),
    );
    await db.doc("users/many").set({ email: "m@example.com" });
    const w = db.bulkWriter();
    for (let i = 0; i < MULTICAST_LIMIT + 3; i++) void w.set(db.doc(`users/many/devices/d${i}`), { token: `t${i}` });
    await w.close();
    const r = await sendNotificationHandler(caller, { title: "a", body: "b", target: "user", targetUid: "many" });
    expect(batches).to.deep.equal([500, 3]);
    expect(r.successCount).to.equal(503);
  });

  it("F12 topic all + validate + không thiết bị + gửi thất bại không tính 'đã gửi'", async () => {
    const topics: string[] = [];
    setMessagingForTest(fakeMessaging({ sendToTopic: async (t) => (topics.push(t), "id") }));
    expect((await sendNotificationHandler(caller, { title: "Chào", body: "Ca sáng", target: "all" })).target).to.equal("all");
    expect(topics).to.deep.equal(["all_staff"]);
    await expectHttpsError(sendNotificationHandler(caller, { title: "", body: "x", target: "all" }), "invalid-argument");
    await expectHttpsError(sendNotificationHandler(caller, { title: "x".repeat(66), body: "x", target: "all" }), "invalid-argument");
    await expectHttpsError(sendNotificationHandler(caller, { title: "x", body: "y", target: "all", data: { type: "recipe" } }), "invalid-argument");
    await db.doc("users/lonely").set({ email: "l@example.com" });
    await expectHttpsError(sendNotificationHandler(caller, { title: "x", body: "y", target: "user", targetUid: "lonely" }), "failed-precondition");
    await expectHttpsError(sendNotificationHandler(caller, { title: "x", body: "y", target: "user", targetUid: "ghost" }), "not-found");
    setMessagingForTest(fakeMessaging({ sendToTopic: async () => Promise.reject(new Error("fcm down")) }));
    await expectHttpsError(sendNotificationHandler(caller, { title: "x", body: "y", target: "all" }), "internal");
    const s = await summary();
    expect(s.notificationsSent).to.equal(1);
    expect(s.notificationsFailed).to.equal(1);
  });

  it("F13 thống kê sự cố: theo ngày, gom phiên bản/model lạ, KHÔNG đếm trùng khi trigger giao lại", async () => {
    const at = Timestamp.fromDate(new Date("2026-11-05T03:00:00Z"));
    const base = { status: "open", appVersion: "1.0.0+1", deviceModel: "Redmi 7", reportedAt: at };
    expect(await countNewIncident({ ...base, kind: "fatal" }, "ev-1")).to.equal("2026-11-05");
    expect(await countNewIncident({ ...base, kind: "fatal" }, "ev-1")).to.equal(null);
    await countNewIncident({ ...base, kind: "non_fatal", appVersion: "<script>", deviceModel: "x".repeat(80) }, "ev-2");
    const day = (await db.doc("stats/incidents/days/2026-11-05").get()).data();
    expect(day?.total).to.equal(2);
    expect(day?.fatal).to.equal(1);
    expect(day?.byVersion["1,0,0+1"]).to.equal(1);
    expect(day?.byVersion.other).to.equal(1);
    expect(day?.byModel.other).to.equal(1);
    expect((await summary()).openIncidents).to.equal(2);
    expect(await countStatusChange("open", "resolved", "ev-3")).to.equal(true);
    expect(await countStatusChange("open", "resolved", "ev-3")).to.equal(false);
    expect(await countStatusChange("acknowledged", "resolved", "ev-4")).to.equal(false);
    await countDeleted({ status: "open" }, "ev-5");
    const s = await summary();
    expect(s.openIncidents).to.equal(0);
    expect(s.totalIncidents).to.equal(1);
    expect(openDelta("resolved", "open")).to.equal(1);
  });

  it("F14 Crashlytics issue: id cố định, alert giao lại không tạo bản trùng", async () => {
    expect(await recordCrashlyticsIssue({ id: "abc", title: "Boom", subtitle: "at x", appVersion: "1.0.0" }, "app")).to.equal(true);
    expect(await recordCrashlyticsIssue({ id: "abc", title: "Boom" }, "app")).to.equal(false);
    const d = (await db.doc("incidents/crashlytics_abc").get()).data();
    expect(d?.kind).to.equal("crashlytics_issue");
    expect(d?.message).to.equal("at x");
  });

  it("F15 token dùng chung 2 người → chỉ giữ bản của người mới; đếm thiết bị", async () => {
    await db.doc("users/a").set({ email: "a@x.com", deviceCount: 0 });
    await db.doc("users/b").set({ email: "b@x.com", deviceCount: 0 });
    await db.doc("users/a/devices/d1").set({ token: "shared" });
    await db.doc("users/b/devices/d1").set({ token: "shared" });
    await syncDevice("b", "d1", "shared");
    expect((await db.doc("users/a/devices/d1").get()).exists).to.equal(false);
    expect((await db.doc("users/b/devices/d1").get()).exists).to.equal(true);
    expect((await db.doc("users/b").get()).get("deviceCount")).to.equal(1);
  });

  it("F16 xóa user: xóa hồ sơ + thiết bị, giao lại không trừ 2 lần", async () => {
    await makeUser("bob", "bob@example.com");
    await db.doc("users/bob/devices/d1").set({ token: "t" });
    expect(await deprovisionUser("bob")).to.equal(true);
    expect(await deprovisionUser("bob")).to.equal(false);
    expect((await summary()).totalUsers).to.equal(0);
    expect((await db.doc("users/bob/devices/d1").get()).exists).to.equal(false);
  });

  it("F17 tiện ích: dayKey giờ VN, mapKey, versionKey, modelKey, requireUid, mã token chết", () => {
    expect(dayKey(new Date("2026-11-04T18:30:00Z"))).to.equal("2026-11-05");
    expect(mapKey("a.b/c")).to.equal("a,b_c");
    expect(mapKey("")).to.equal("unknown");
    expect(versionKey("2.1.0")).to.equal("2,1,0");
    expect(versionKey("v2")).to.equal("other");
    expect(modelKey("")).to.equal("unknown");
    expect(modelKey("SM-A515F")).to.equal("SM-A515F");
    expect(() => requireUid({ u: "a/b" }, "u", "uid")).to.throw();
    expect(isDeadTokenError("messaging/invalid-argument")).to.equal(false);
    expect(isDeadTokenError(undefined)).to.equal(false);
  });

  it("F18 seedRecipes nạp 6 món, gọi lại không ghi đè", async () => {
    expect(await seedRecipesHandler(caller)).to.deep.equal({ created: 6, skipped: 0 });
    expect(await seedRecipesHandler(caller)).to.deep.equal({ created: 0, skipped: 6 });
    expect((await db.doc("recipes/CF-MUOI").get()).get("status")).to.equal("published");
  });
});
