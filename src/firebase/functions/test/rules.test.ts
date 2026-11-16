import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, collection, addDoc, getDocs, query, where } from "firebase/firestore";

const PROJECT = "demo-recipehub";
let env: RulesTestEnvironment;

const viewer = () => env.authenticatedContext("viewer1", { role: "viewer", email: "v@example.com" }).firestore();
const other = () => env.authenticatedContext("viewer2", { role: "viewer", email: "v2@example.com" }).firestore();
const admin = () => env.authenticatedContext("admin1", { role: "admin", email: "a@example.com" }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const guest = () => env.authenticatedContext("guest1", { firebase: { sign_in_provider: "anonymous" } }).firestore();
// Token cũ vẫn mang claim admin nhưng Admin khác đã hạ quyền trong Firestore.
const demoted = () => env.authenticatedContext("demoted", { role: "admin", email: "d@example.com" }).firestore();
const locked = () => env.authenticatedContext("locked", { role: "viewer", email: "l@example.com" }).firestore();

function incident(uid: string | null, extra: Record<string, unknown> = {}) {
  return {
    uid,
    email: uid ? "v@example.com" : null,
    kind: "fatal",
    source: "demo_button",
    errorType: "StateError",
    message: "demo crash",
    stackTop: "#0 main",
    screen: "/account",
    appVersion: "1.0.0",
    buildNumber: "1",
    deviceModel: "Redmi 7",
    osVersion: "Android 10",
    occurredAt: serverTimestamp(),
    reportedAt: serverTimestamp(),
    status: "open",
    ...extra,
  };
}

describe("firestore.rules", () => {
  before(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT,
      firestore: { rules: readFileSync(resolve(process.cwd(), "../firestore.rules"), "utf8") },
    });
  });
  after(async () => env.cleanup());
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "users/viewer1"), { email: "v@example.com", role: "viewer", disabled: false });
      await setDoc(doc(db, "users/viewer2"), { email: "v2@example.com", role: "viewer", disabled: false });
      await setDoc(doc(db, "users/admin1"), { email: "a@example.com", role: "admin", disabled: false });
      await setDoc(doc(db, "users/demoted"), { email: "d@example.com", role: "viewer", disabled: false });
      await setDoc(doc(db, "users/locked"), { email: "l@example.com", role: "viewer", disabled: true });
      await setDoc(doc(db, "incidents/i1"), { ...incident("viewer1"), reportedAt: new Date(), occurredAt: new Date() });
      await setDoc(doc(db, "recipes/CF-MUOI"), { code: "CF-MUOI", name: "Cà Phê Muối", status: "published" });
      await setDoc(doc(db, "recipes/TS-HIDE"), { code: "TS-HIDE", name: "Ẩn", status: "hidden" });
      await setDoc(doc(db, "stats/summary"), { openIncidents: 1 });
    });
  });

  it("R01 viewer đọc hồ sơ của mình", () => assertSucceeds(getDoc(doc(viewer(), "users/viewer1"))));
  it("R02 viewer không đọc hồ sơ người khác", () => assertFails(getDoc(doc(viewer(), "users/viewer2"))));
  it("R03 viewer không tự đổi role", () => assertFails(updateDoc(doc(viewer(), "users/viewer1"), { role: "admin" })));
  it("R04 viewer cập nhật lastSeenAt", () =>
    assertSucceeds(updateDoc(doc(viewer(), "users/viewer1"), { lastSeenAt: serverTimestamp() })));
  it("R05 viewer đăng ký thiết bị của mình", () =>
    assertSucceeds(
      setDoc(doc(viewer(), "users/viewer1/devices/d1"), {
        token: "tok", platform: "android", model: "Redmi 7", osVersion: "Android 10", appVersion: "1.0.0",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }),
    ));
  it("R06 viewer không ghi thiết bị người khác", () =>
    assertFails(setDoc(doc(viewer(), "users/viewer2/devices/d1"), { token: "tok", platform: "android" })));
  it("R07 viewer tạo sự cố của mình", () => assertSucceeds(addDoc(collection(viewer(), "incidents"), incident("viewer1"))));
  it("R08 khách (anonymous) tạo sự cố không uid; chưa đăng nhập thì bị chặn (chống spam)", async () => {
    await assertSucceeds(addDoc(collection(guest(), "incidents"), incident(null)));
    await assertFails(addDoc(collection(anon(), "incidents"), incident(null)));
  });
  it("R09 không tạo sự cố đứng tên người khác", () =>
    assertFails(addDoc(collection(viewer(), "incidents"), incident("viewer2"))));
  it("R10 không tạo sự cố status=resolved", () =>
    assertFails(addDoc(collection(viewer(), "incidents"), incident("viewer1", { status: "resolved" }))));
  it("R11 không tạo sự cố có field lạ", () =>
    assertFails(addDoc(collection(viewer(), "incidents"), incident("viewer1", { hacked: true }))));
  it("R12 viewer không đọc sự cố", () => assertFails(getDoc(doc(viewer(), "incidents/i1"))));
  it("R13 admin đọc và xử lý sự cố", async () => {
    await assertSucceeds(getDoc(doc(admin(), "incidents/i1")));
    await assertSucceeds(
      updateDoc(doc(admin(), "incidents/i1"), {
        status: "resolved", note: "đã kiểm tra", handledBy: "a@example.com", handledAt: serverTimestamp(),
      }),
    );
  });
  it("R14 admin không sửa nội dung sự cố", () =>
    assertFails(updateDoc(doc(admin(), "incidents/i1"), { message: "sửa" })));
  it("R15 không ai ghi stats/notifications", async () => {
    await assertFails(setDoc(doc(admin(), "stats/summary"), { openIncidents: 0 }));
    await assertFails(setDoc(doc(admin(), "notifications/n1"), { title: "x" }));
    await assertSucceeds(getDoc(doc(admin(), "stats/summary")));
    await assertFails(getDoc(doc(viewer(), "stats/summary")));
  });
  it("R16 viewer chỉ đọc món published", async () => {
    await assertSucceeds(getDoc(doc(viewer(), "recipes/CF-MUOI")));
    await assertFails(getDoc(doc(viewer(), "recipes/TS-HIDE")));
    await assertSucceeds(getDocs(query(collection(viewer(), "recipes"), where("status", "==", "published"))));
    await assertFails(getDocs(collection(viewer(), "recipes")));
  });
  it("R17 chỉ admin ghi món, không xóa", async () => {
    const r = { code: "TT-NEW", name: "Trà mới", status: "hidden", updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(viewer(), "recipes/TT-NEW"), r));
    await assertSucceeds(setDoc(doc(admin(), "recipes/TT-NEW"), r));
    await assertFails(deleteDoc(doc(admin(), "recipes/CF-MUOI")));
  });
  it("R18 người chưa đăng nhập không đọc món", () => assertFails(getDoc(doc(anon(), "recipes/CF-MUOI"))));
  it("R19 Admin bị hạ quyền (claim cũ còn admin) không đọc được sự cố / không ghi món", async () => {
    await assertFails(getDoc(doc(demoted(), "incidents/i1")));
    await assertFails(
      setDoc(doc(demoted(), "recipes/X-1"), { code: "X-1", name: "x", status: "hidden", updatedAt: serverTimestamp() }),
    );
  });
  it("R20 tài khoản bị khóa không ghi được thiết bị / sự cố", async () => {
    await assertFails(
      setDoc(doc(locked(), "users/locked/devices/d1"), { token: "t", platform: "android", updatedAt: serverTimestamp() }),
    );
    await assertFails(addDoc(collection(locked(), "incidents"), { ...incident("locked"), email: "l@example.com" }));
  });
  it("R21 không giả email người khác trong sự cố", async () => {
    await assertFails(addDoc(collection(viewer(), "incidents"), incident("viewer1", { email: "boss@example.com" })));
  });
  it("R22 token thiết bị rỗng / thiếu updatedAt bị từ chối", async () => {
    await assertFails(setDoc(doc(viewer(), "users/viewer1/devices/d2"), { token: "", platform: "android", updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(viewer(), "users/viewer1/devices/d3"), { token: "t", platform: "android" }));
  });
  it("R23 occurredAt phải là timestamp; tên món rỗng bị từ chối", async () => {
    await assertFails(addDoc(collection(viewer(), "incidents"), incident("viewer1", { occurredAt: "hôm qua" })));
    await assertFails(
      setDoc(doc(admin(), "recipes/TT-EMPTY"), { code: "TT-EMPTY", name: "", status: "hidden", updatedAt: serverTimestamp() }),
    );
  });
  void other;
});
