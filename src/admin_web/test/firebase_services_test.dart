// Test các service Firebase thật của web Admin trên Firestore/Auth giả (fake_cloud_firestore, firebase_auth_mocks).
// Cloud Functions được thay bằng CallableFn giả để kiểm tra đúng tên hàm + payload.
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:firebase_auth_mocks/firebase_auth_mocks.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:recipehub_admin/core/models/admin_models.dart';
import 'package:recipehub_admin/core/services/firebase/firebase_admin_services.dart';

class _Calls {
  final List<(String, Map<String, dynamic>?)> log = [];
  Map<String, dynamic> reply = {};
  Object? error;

  Future<Map<String, dynamic>> call(String name, [Map<String, dynamic>? data]) async {
    log.add((name, data));
    final e = error;
    if (e != null) throw e;
    return reply;
  }
}

Timestamp _ts(DateTime d) => Timestamp.fromDate(d);

void main() {
  group('FirebaseIncidentService', () {
    late FakeFirebaseFirestore db;
    late MockFirebaseAuth auth;
    late FirebaseIncidentService svc;

    setUp(() async {
      db = FakeFirebaseFirestore();
      auth = MockFirebaseAuth(signedIn: true, mockUser: MockUser(uid: 'admin-1', email: 'admin@example.com'));
      svc = FirebaseIncidentService(db: db, auth: auth);
      final now = DateTime.now();
      await db.collection('incidents').doc('i1').set({
        'kind': 'fatal', 'status': 'open', 'message': 'boom', 'uid': 'u1', 'email': 'b@x.com',
        'deviceModel': 'Redmi 7', 'osVersion': 'Android 10', 'appVersion': '1.0.0', 'buildNumber': '1',
        'reportedAt': _ts(now), 'occurredAt': _ts(now), 'stackTop': '#0 main', 'source': 'demo_button',
      });
      await db.collection('incidents').doc('i2').set({
        'kind': 'non_fatal', 'status': 'resolved', 'message': 'warn', 'uid': 'u1',
        'reportedAt': _ts(now.subtract(const Duration(minutes: 1))), 'handledBy': 'a@x.com', 'note': 'ok',
      });
      await db.collection('incidents').doc('i3').set({
        'kind': 'crashlytics_issue', 'status': 'open', 'message': 'old', 'uid': null,
        'reportedAt': _ts(now.subtract(const Duration(days: 40))), 'crashlyticsIssueId': 'abc',
      });
    });

    test('S-01 lọc theo trạng thái / loại / khoảng ngày, mới nhất trước', () async {
      final open7 = await svc.watchIncidents(const IncidentFilter()).first;
      expect(open7.map((i) => i.id), ['i1']);
      final all = await svc.watchIncidents(const IncidentFilter(statuses: {}, days: 0)).first;
      expect(all.map((i) => i.id), ['i1', 'i2', 'i3']);
      final nonFatal = await svc
          .watchIncidents(const IncidentFilter(statuses: {}, kind: IncidentKind.nonFatal, days: 0))
          .first;
      expect(nonFatal.single.id, 'i2');
      final i1 = all.first;
      expect(i1.kind, IncidentKind.fatal);
      expect(i1.device, 'Redmi 7 · Android 10');
      expect(i1.who, 'b@x.com');
      expect(all.last.crashlyticsIssueId, 'abc');
      expect(all.last.who, 'Chưa đăng nhập');
    });

    test('S-02 đổi trạng thái ghi người xử lý = email admin, ghi chú rỗng → null', () async {
      await svc.updateStatus('i1', IncidentStatus.resolved, note: '  đã sửa ');
      var d = (await db.doc('incidents/i1').get()).data()!;
      expect(d['status'], 'resolved');
      expect(d['note'], 'đã sửa');
      expect(d['handledBy'], 'admin@example.com');
      expect(d['handledAt'], isNotNull);
      await svc.updateStatus('i1', IncidentStatus.open, note: '   ');
      d = (await db.doc('incidents/i1').get()).data()!;
      expect(d['note'], isNull);
    });

    test('S-03 sự cố theo người dùng + summary + bù ngày thiếu', () async {
      expect((await svc.watchByUser('u1').first).map((i) => i.id), ['i1', 'i2']);
      await db.doc('stats/summary').set({'openIncidents': 2, 'totalUsers': 3, 'notificationsSent': 4});
      final s = await svc.watchSummary().first;
      expect(s.openIncidents, 2);
      expect(s.totalUsers, 3);
      expect(s.notificationsSent, 4);
      final today = FirebaseIncidentService.dayKey(FirebaseIncidentService.vnNow());
      await db.doc('stats/incidents/days/$today').set({
        'total': 2, 'fatal': 1, 'nonFatal': 1, 'byVersion': {'1_0_0': 2}, 'byModel': {'Redmi 7': 2},
      });
      final days = await svc.watchDays(7).first;
      expect(days, hasLength(7));
      expect(days.last.day, today);
      expect(days.last.total, 2);
      expect(days.last.byModel['Redmi 7'], 2);
      expect(days.first.total, 0);
    });

    test('S-04 summary chưa có tài liệu → toàn 0', () async {
      final s = await svc.watchSummary().first;
      expect(s.isEmpty, isTrue);
    });
  });

  group('FirebaseUserAdminService', () {
    test('S-05 danh sách user mới nhất trước, thiết bị, gọi đúng callable', () async {
      final db = FakeFirebaseFirestore();
      final calls = _Calls();
      final svc = FirebaseUserAdminService(db: db, call: calls.call);
      await db.doc('users/a').set({'email': 'a@x.com', 'role': 'admin', 'disabled': false, 'createdAt': _ts(DateTime(2026, 1, 1))});
      await db.doc('users/b').set({
        'email': null, 'isAnonymous': true, 'role': 'viewer', 'disabled': true, 'deviceCount': 2,
        'createdAt': _ts(DateTime(2026, 2, 1)), 'lastSeenAt': _ts(DateTime(2026, 2, 2)),
      });
      await db.doc('users/b/devices/d1').set({'platform': 'android', 'model': 'Redmi 7', 'updatedAt': _ts(DateTime(2026, 2, 2))});
      final users = await svc.watchUsers().first;
      expect(users.map((u) => u.uid), ['b', 'a']);
      expect(users.first.label, 'Khách (ẩn danh)');
      expect(users.first.disabled, isTrue);
      expect(users.first.deviceCount, 2);
      expect(users.last.role, UserRole.admin);
      final devices = await svc.devicesOf('b');
      expect(devices.single.model, 'Redmi 7');
      await svc.setRole('b', UserRole.admin);
      await svc.setDisabled('b', false);
      expect(calls.log.map((c) => c.$1), ['setUserRole', 'setUserDisabled']);
      expect(calls.log.first.$2, {'uid': 'b', 'role': 'admin'});
      expect(calls.log.last.$2, {'uid': 'b', 'disabled': false});
    });

    test('S-06 lỗi Function đổi thành AdminFailure tiếng Việt', () async {
      final calls = _Calls()..error = FirebaseFunctionsException(code: 'failed-precondition', message: 'Không thể tự khóa tài khoản của mình.');
      final svc = FirebaseUserAdminService(db: FakeFirebaseFirestore(), call: calls.call);
      await expectLater(
        svc.setDisabled('me', true),
        throwsA(isA<AdminFailure>().having((f) => f.message, 'message', contains('tự khóa'))),
      );
    });
  });

  group('mapFirebaseError', () {
    test('S-07 các mã lỗi chính', () {
      expect(mapFirebaseError(FirebaseFunctionsException(code: 'permission-denied', message: '')).message, contains('Admin'));
      expect(mapFirebaseError(FirebaseFunctionsException(code: 'unauthenticated', message: 'x')).message, contains('Đăng nhập lại'));
      expect(mapFirebaseError(FirebaseFunctionsException(code: 'unavailable', message: 'x')).message, contains('mạng'));
      expect(mapFirebaseError(FirebaseFunctionsException(code: 'internal', message: '')).message, isNotEmpty);
      expect(mapFirebaseError(FirebaseException(plugin: 'firestore', code: 'permission-denied')).message, contains('rules'));
      expect(mapFirebaseError(FirebaseException(plugin: 'firestore', code: 'unavailable')).message, contains('Firestore'));
      expect(mapFirebaseError(FirebaseException(plugin: 'firestore', code: 'aborted', message: 'm')).message, 'm');
      const f = AdminFailure('giữ nguyên');
      expect(mapFirebaseError(f), same(f));
      expect(mapFirebaseError(StateError('x')).message, contains('x'));
    });
  });

  group('FirebaseNotificationAdminService', () {
    test('S-08 gửi đúng payload, đọc kết quả; lịch sử ánh xạ món', () async {
      final db = FakeFirebaseFirestore();
      final calls = _Calls()..reply = {'successCount': 2, 'failureCount': 1};
      final svc = FirebaseNotificationAdminService(db: db, call: calls.call);
      final r = await svc.send(const NotificationRequest(title: 'T', body: 'B', toAll: false, targetUid: 'u1', recipeCode: 'CF-MUOI'));
      expect(r.successCount, 2);
      expect(r.failureCount, 1);
      expect(calls.log.single.$1, 'sendNotification');
      expect(calls.log.single.$2!['data'], {'type': 'recipe', 'targetId': 'CF-MUOI'});
      await db.collection('notifications').add({
        'title': 'A', 'body': 'b', 'target': 'all', 'data': {'type': 'recipe', 'targetId': 'TS-MATCHA'},
        'sentBy': 'a@x.com', 'sentAt': _ts(DateTime(2026, 11, 5)), 'successCount': 1, 'failureCount': 0,
      });
      await db.collection('notifications').add({
        'title': 'B', 'body': 'b', 'target': 'user', 'targetUid': 'u1', 'data': {'type': 'none'},
        'sentAt': _ts(DateTime(2026, 11, 6)), 'error': 'dead token',
      });
      final h = await svc.watchHistory().first;
      expect(h.map((n) => n.title), ['B', 'A']);
      expect(h.last.recipeCode, 'TS-MATCHA');
      expect(h.first.recipeCode, isNull);
      expect(h.first.error, 'dead token');
    });

    test('S-09 lỗi gửi → AdminFailure', () async {
      final calls = _Calls()..error = FirebaseFunctionsException(code: 'failed-precondition', message: 'Người nhận chưa có thiết bị');
      final svc = FirebaseNotificationAdminService(db: FakeFirebaseFirestore(), call: calls.call);
      await expectLater(
        svc.send(const NotificationRequest(title: 'T', body: 'B', toAll: true)),
        throwsA(isA<AdminFailure>()),
      );
    });
  });

  group('FirebaseRecipeAdminService', () {
    const recipe = RecipeItem(
      code: 'TS-NEW',
      name: ' Trà Sữa Mới ',
      published: true,
      description: 'Mô tả',
      ingredients: [RecipeIngredient(name: 'Trà', quantity: 100, unit: 'ml', stage: '', warning: 'Nóng')],
      steps: [RecipeStep(title: 'Ủ', description: 'Ủ trà', durationSeconds: 60, temperatureCelsius: 90)],
    );

    test('S-10 thêm mới v1, sửa tăng phiên bản, ẩn/ban hành, từ khóa, người sửa', () async {
      final db = FakeFirebaseFirestore();
      final auth = MockFirebaseAuth(signedIn: true, mockUser: MockUser(uid: 'a', email: 'admin@example.com'));
      final svc = FirebaseRecipeAdminService(db: db, auth: auth, call: _Calls().call);
      await svc.save(recipe, isNew: true);
      var d = (await db.doc('recipes/TS-NEW').get()).data()!;
      expect(d['versionNumber'], 1);
      expect(d['status'], 'published');
      expect(d['name'], 'Trà Sữa Mới');
      expect(d['updatedBy'], 'admin@example.com');
      expect(d['searchKeywords'], containsAll(['tra', 'sua', 'moi', 'ts', 'new']));
      expect((d['ingredients'] as List).single, {'name': 'Trà', 'quantity': 100.0, 'unit': 'ml', 'warning': 'Nóng'});
      final listed = (await svc.watchRecipes().first).single;
      expect(listed.versionNumber, 1);
      expect(listed.steps.single.temperatureCelsius, 90);
      await svc.save(listed, isNew: false);
      d = (await db.doc('recipes/TS-NEW').get()).data()!;
      expect(d['versionNumber'], 2);
      await svc.setPublished('TS-NEW', false);
      expect((await db.doc('recipes/TS-NEW').get()).data()!['status'], 'hidden');
    });

    test('S-11 nạp món mẫu trả về số món đã tạo', () async {
      final calls = _Calls()..reply = {'created': 6, 'skipped': 0};
      final svc = FirebaseRecipeAdminService(db: FakeFirebaseFirestore(), auth: MockFirebaseAuth(), call: calls.call);
      expect(await svc.seedSamples(), 6);
      expect(calls.log.single.$1, 'seedRecipes');
    });

    test('S-12 fromMap chịu được dữ liệu thiếu', () {
      final r = FirebaseRecipeAdminService.fromMap('X', {'status': 'hidden'});
      expect(r.code, 'X');
      expect(r.name, 'X');
      expect(r.published, isFalse);
      expect(r.versionNumber, 1);
      expect(r.ingredients, isEmpty);
    });
  });

  group('FirebaseAdminAuthService', () {
    test('S-13 đăng nhập: gọi ensureProfile, vai trò từ claim; đăng xuất → null', () async {
      final calls = _Calls()..reply = {'role': 'admin', 'refreshToken': false};
      final auth = MockFirebaseAuth(
        signedIn: true,
        mockUser: MockUser(uid: 'a', email: 'admin@example.com', displayName: 'A', customClaim: {'role': 'admin'}),
      );
      final svc = FirebaseAdminAuthService(auth: auth, call: calls.call);
      final events = <AdminIdentity?>[];
      final sub = svc.identityChanges().listen(events.add);
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(events.first?.isAdmin, isTrue);
      expect(events.first?.email, 'admin@example.com');
      expect(calls.log.first.$1, 'ensureProfile');
      await svc.signOut();
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(events.last, isNull);
      await sub.cancel();
    });

    test('S-14 ensureProfile lỗi vẫn đọc claim hiện có (viewer)', () async {
      final calls = _Calls()..error = Exception('offline');
      final auth = MockFirebaseAuth(signedIn: true, mockUser: MockUser(uid: 'v', email: 'v@x.com'));
      final svc = FirebaseAdminAuthService(auth: auth, call: calls.call);
      final id = await svc.identityChanges().first;
      expect(id?.role, UserRole.viewer);
    });
  });
}
