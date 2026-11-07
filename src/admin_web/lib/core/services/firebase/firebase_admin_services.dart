import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../config/web_firebase_options.dart';
import '../../models/admin_models.dart';
import '../interfaces/admin_services.dart';

DateTime? _ts(Object? v) => v is Timestamp ? v.toDate() : null;
int _int(Object? v) => v is num ? v.toInt() : 0;

/// Lỗi Firebase → thông điệp tiếng Việt (Functions đã trả message tiếng Việt).
AdminFailure mapFirebaseError(Object e) {
  if (e is FirebaseFunctionsException) {
    final msg = (e.message == null || e.message!.trim().isEmpty) ? null : e.message;
    switch (e.code) {
      case 'permission-denied':
        return AdminFailure(msg ?? 'Chỉ Admin được thực hiện thao tác này.', code: e.code);
      case 'unauthenticated':
        return AdminFailure('Phiên đăng nhập đã hết. Đăng nhập lại.', code: e.code);
      case 'unavailable':
      case 'deadline-exceeded':
        return AdminFailure('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', code: e.code);
      default:
        return AdminFailure(msg ?? 'Thao tác thất bại (${e.code}).', code: e.code);
    }
  }
  if (e is FirebaseException) {
    if (e.code == 'permission-denied') {
      return AdminFailure(
        'Bị từ chối bởi Firestore rules (dữ liệu không hợp lệ hoặc quyền Admin đã bị thu hồi).',
        code: e.code,
      );
    }
    if (e.code == 'unavailable') return AdminFailure('Mất kết nối Firestore.', code: e.code);
    return AdminFailure(e.message ?? 'Lỗi Firebase (${e.code}).', code: e.code);
  }
  if (e is AdminFailure) return e;
  return AdminFailure(e.toString());
}

FirebaseFunctions _functions() => FirebaseFunctions.instanceFor(region: WebFirebaseConfig.functionsRegion);

/// Gọi một callable Cloud Function. Tách ra để test thay bằng bản giả (Functions không chạy trong unit test).
typedef CallableFn = Future<Map<String, dynamic>> Function(String name, [Map<String, dynamic>? data]);

Future<Map<String, dynamic>> defaultCallable(String name, [Map<String, dynamic>? data]) async {
  final res = await _functions().httpsCallable(name).call<Object?>(data);
  final d = res.data;
  return d is Map ? Map<String, dynamic>.from(d) : <String, dynamic>{};
}

class FirebaseAdminAuthService implements IAdminAuthService {
  FirebaseAdminAuthService({FirebaseAuth? auth, CallableFn? call})
    : _auth = auth ?? FirebaseAuth.instance,
      _call = call ?? defaultCallable;

  final FirebaseAuth _auth;
  final CallableFn _call;

  @override
  // idTokenChanges: phát lại khi token được làm mới (claim đổi) → Admin bị hạ quyền rời khung quản trị.
  Stream<AdminIdentity?> identityChanges() => _auth.idTokenChanges().asyncMap((user) async {
    if (user == null) return null;
    var refresh = false;
    try {
      // Tạo hồ sơ / đồng bộ claim (Admin đầu tiên được cấp qua ADMIN_EMAILS).
      final res = await _call('ensureProfile');
      refresh = res['refreshToken'] == true;
    } catch (_) {
      // Vẫn đọc claim đang có nếu Function không gọi được.
    }
    final token = await user.getIdTokenResult(refresh);
    return AdminIdentity(
      uid: user.uid,
      email: user.email ?? user.uid,
      displayName: user.displayName,
      role: roleFrom(token.claims?['role']),
    );
  });

  @override
  Future<void> signInWithGoogle() async {
    try {
      await _auth.signInWithPopup(GoogleAuthProvider()..setCustomParameters({'prompt': 'select_account'}));
    } on FirebaseAuthException catch (e) {
      if (e.code == 'popup-closed-by-user' || e.code == 'cancelled-popup-request') {
        throw const AdminFailure('Bạn đã đóng cửa sổ đăng nhập.', code: 'cancelled');
      }
      if (e.code == 'user-disabled') throw const AdminFailure('Tài khoản đã bị khóa.', code: 'user-disabled');
      if (e.code == 'unauthorized-domain') {
        throw const AdminFailure('Domain chưa được thêm vào Authorized domains của Firebase Auth.', code: 'domain');
      }
      throw AdminFailure(e.message ?? 'Đăng nhập thất bại (${e.code}).', code: e.code);
    }
  }

  @override
  Future<void> signOut() => _auth.signOut();
}

class FirebaseUserAdminService implements IUserAdminService {
  FirebaseUserAdminService({FirebaseFirestore? db, CallableFn? call})
    : _db = db ?? FirebaseFirestore.instance,
      _call = call ?? defaultCallable;

  final FirebaseFirestore _db;
  final CallableFn _call;

  @override
  Stream<List<AdminUser>> watchUsers() => _db
      .collection('users')
      .orderBy('createdAt', descending: true)
      .limit(500)
      .snapshots()
      .map(
        (s) => s.docs
            .map(
              (d) => AdminUser(
                uid: d.id,
                email: d.data()['email'] as String?,
                displayName: d.data()['displayName'] as String?,
                role: roleFrom(d.data()['role']),
                disabled: d.data()['disabled'] == true,
                isAnonymous: d.data()['isAnonymous'] == true,
                deviceCount: _int(d.data()['deviceCount']),
                createdAt: _ts(d.data()['createdAt']),
                lastSeenAt: _ts(d.data()['lastSeenAt']),
              ),
            )
            .toList(),
      );

  @override
  Future<List<DeviceInfo>> devicesOf(String uid) async {
    try {
      final s = await _db.collection('users/$uid/devices').get();
      return s.docs
          .map(
            (d) => DeviceInfo(
              id: d.id,
              platform: d.data()['platform'] as String? ?? '?',
              model: d.data()['model'] as String?,
              osVersion: d.data()['osVersion'] as String?,
              appVersion: d.data()['appVersion'] as String?,
              updatedAt: _ts(d.data()['updatedAt']),
            ),
          )
          .toList();
    } catch (e) {
      throw mapFirebaseError(e);
    }
  }

  @override
  Future<void> setRole(String uid, UserRole role) async {
    try {
      await _call('setUserRole', {'uid': uid, 'role': roleCode(role)});
    } catch (e) {
      throw mapFirebaseError(e);
    }
  }

  @override
  Future<void> setDisabled(String uid, bool disabled) async {
    try {
      await _call('setUserDisabled', {'uid': uid, 'disabled': disabled});
    } catch (e) {
      throw mapFirebaseError(e);
    }
  }
}

class FirebaseIncidentService implements IIncidentService {
  FirebaseIncidentService({FirebaseFirestore? db, FirebaseAuth? auth})
    : _db = db ?? FirebaseFirestore.instance,
      _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  static Incident fromDoc(DocumentSnapshot<Map<String, dynamic>> d) {
    final m = d.data() ?? const <String, dynamic>{};
    return Incident(
      id: d.id,
      kind: incidentKindFrom(m['kind']),
      status: incidentStatusFrom(m['status']),
      message: m['message'] as String? ?? '',
      uid: m['uid'] as String?,
      email: m['email'] as String?,
      source: m['source'] as String?,
      errorType: m['errorType'] as String?,
      stackTop: m['stackTop'] as String?,
      screen: m['screen'] as String?,
      appVersion: m['appVersion'] as String?,
      buildNumber: m['buildNumber'] as String?,
      deviceModel: m['deviceModel'] as String?,
      osVersion: m['osVersion'] as String?,
      occurredAt: _ts(m['occurredAt']),
      reportedAt: _ts(m['reportedAt']),
      handledBy: m['handledBy'] as String?,
      handledAt: _ts(m['handledAt']),
      note: m['note'] as String?,
      crashlyticsIssueId: m['crashlyticsIssueId'] as String?,
    );
  }

  @override
  Stream<List<Incident>> watchIncidents(IncidentFilter filter, {int limit = 50}) {
    Query<Map<String, dynamic>> q = _db.collection('incidents');
    if (filter.statuses.isNotEmpty && filter.statuses.length < IncidentStatus.values.length) {
      q = q.where('status', whereIn: filter.statuses.map(incidentStatusCode).toList());
    }
    if (filter.kind != null) q = q.where('kind', isEqualTo: incidentKindCode(filter.kind!));
    if (filter.days > 0) {
      q = q.where('reportedAt', isGreaterThanOrEqualTo: Timestamp.fromDate(vnDayStart(filter.days - 1)));
    }
    return q
        .orderBy('reportedAt', descending: true)
        .limit(limit)
        .snapshots(includeMetadataChanges: false)
        .map((s) => s.docs.map(fromDoc).toList());
  }

  @override
  Stream<List<Incident>> watchByUser(String uid, {int limit = 20}) => _db
      .collection('incidents')
      .where('uid', isEqualTo: uid)
      .orderBy('reportedAt', descending: true)
      .limit(limit)
      .snapshots()
      .map((s) => s.docs.map(fromDoc).toList());

  @override
  Stream<StatsSummary> watchSummary() => _db.doc('stats/summary').snapshots().map((s) {
    final m = s.data() ?? const <String, dynamic>{};
    return StatsSummary(
      openIncidents: _int(m['openIncidents']),
      totalIncidents: _int(m['totalIncidents']),
      totalUsers: _int(m['totalUsers']),
      adminUsers: _int(m['adminUsers']),
      disabledUsers: _int(m['disabledUsers']),
      notificationsSent: _int(m['notificationsSent']),
    );
  });

  static String dayKey(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Ngày theo giờ Việt Nam (UTC+7), khớp Function – không phụ thuộc múi giờ trình duyệt.
  static DateTime vnNow([DateTime? now]) => (now ?? DateTime.now()).toUtc().add(const Duration(hours: 7));

  /// 00:00 giờ VN của [daysAgo] ngày trước, dưới dạng thời điểm UTC.
  static DateTime vnDayStart(int daysAgo, [DateTime? now]) {
    final v = vnNow(now);
    return DateTime.utc(v.year, v.month, v.day).subtract(Duration(days: daysAgo)).subtract(const Duration(hours: 7));
  }

  @override
  Stream<List<Incident>> watchSince(DateTime since, {int limit = 10}) => _db
      .collection('incidents')
      .where('reportedAt', isGreaterThan: Timestamp.fromDate(since))
      .orderBy('reportedAt', descending: true)
      .limit(limit)
      .snapshots()
      .where((s) => !s.metadata.isFromCache)
      .map((s) => s.docs.map(fromDoc).toList());

  @override
  Stream<List<DayStats>> watchDays(int days) {
    final today = vnNow();
    final keys = [
      for (var i = days - 1; i >= 0; i--)
        dayKey(DateTime.utc(today.year, today.month, today.day).subtract(Duration(days: i))),
    ];
    return _db
        .collection('stats/incidents/days')
        .where(FieldPath.documentId, isGreaterThanOrEqualTo: keys.first)
        .snapshots()
        .map((s) {
          final byId = {for (final d in s.docs) d.id: d.data()};
          return keys.map((k) {
            final m = byId[k];
            if (m == null) return DayStats(day: k);
            Map<String, int> asMap(Object? v) =>
                v is Map ? v.map((key, value) => MapEntry(key.toString(), _int(value))) : const {};
            return DayStats(
              day: k,
              total: _int(m['total']),
              fatal: _int(m['fatal']),
              nonFatal: _int(m['nonFatal']),
              crashlytics: _int(m['crashlytics']),
              byVersion: asMap(m['byVersion']),
              byModel: asMap(m['byModel']),
            );
          }).toList();
        });
  }

  @override
  Future<void> updateStatus(String id, IncidentStatus status, {String? note}) async {
    try {
      await _db.doc('incidents/$id').update({
        'status': incidentStatusCode(status),
        'note': (note == null || note.trim().isEmpty) ? null : note.trim(),
        'handledBy': _auth.currentUser?.email,
        'handledAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw mapFirebaseError(e);
    }
  }
}

class FirebaseNotificationAdminService implements INotificationAdminService {
  FirebaseNotificationAdminService({FirebaseFirestore? db, CallableFn? call})
    : _db = db ?? FirebaseFirestore.instance,
      _call = call ?? defaultCallable;

  final FirebaseFirestore _db;
  final CallableFn _call;

  @override
  Future<SendResult> send(NotificationRequest request) async {
    try {
      final res = await _call('sendNotification', request.toPayload());
      return SendResult(successCount: _int(res['successCount']), failureCount: _int(res['failureCount']));
    } catch (e) {
      throw mapFirebaseError(e);
    }
  }

  @override
  Stream<List<SentNotification>> watchHistory({int limit = 50}) => _db
      .collection('notifications')
      .orderBy('sentAt', descending: true)
      .limit(limit)
      .snapshots()
      .map(
        (s) => s.docs.map((d) {
          final m = d.data();
          final data = m['data'] is Map ? Map<String, dynamic>.from(m['data'] as Map) : const <String, dynamic>{};
          return SentNotification(
            id: d.id,
            title: m['title'] as String? ?? '',
            body: m['body'] as String? ?? '',
            target: m['target'] as String? ?? 'all',
            targetUid: m['targetUid'] as String?,
            recipeCode: data['type'] == 'recipe' ? data['targetId'] as String? : null,
            sentBy: m['sentBy'] as String?,
            sentAt: _ts(m['sentAt']),
            successCount: _int(m['successCount']),
            failureCount: _int(m['failureCount']),
            error: m['error'] as String?,
          );
        }).toList(),
      );
}

class FirebaseRecipeAdminService implements IRecipeAdminService {
  FirebaseRecipeAdminService({FirebaseFirestore? db, FirebaseAuth? auth, CallableFn? call})
    : _db = db ?? FirebaseFirestore.instance,
      _auth = auth ?? FirebaseAuth.instance,
      _call = call ?? defaultCallable;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final CallableFn _call;

  static RecipeItem fromMap(String id, Map<String, dynamic> m) => RecipeItem(
    code: m['code'] as String? ?? id,
    name: m['name'] as String? ?? id,
    published: m['status'] == 'published',
    description: m['description'] as String? ?? '',
    versionNumber: _int(m['versionNumber']) == 0 ? 1 : _int(m['versionNumber']),
    ingredients: [
      for (final i in (m['ingredients'] as List<dynamic>? ?? const []).whereType<Map>())
        RecipeIngredient(
          name: i['name']?.toString() ?? '',
          quantity: (i['quantity'] as num?)?.toDouble() ?? 0,
          unit: i['unit']?.toString() ?? '',
          stage: i['stage']?.toString(),
          warning: i['warning']?.toString(),
        ),
    ],
    steps: [
      for (final s in (m['steps'] as List<dynamic>? ?? const []).whereType<Map>())
        RecipeStep(
          title: s['title']?.toString() ?? '',
          description: s['description']?.toString() ?? '',
          durationSeconds: (s['durationSeconds'] as num?)?.toInt(),
          temperatureCelsius: (s['temperatureCelsius'] as num?)?.toDouble(),
          equipment: s['equipment']?.toString(),
          safetyNote: s['safetyNote']?.toString(),
        ),
    ],
    updatedAt: _ts(m['updatedAt']),
    updatedBy: m['updatedBy'] as String?,
  );

  @override
  Stream<List<RecipeItem>> watchRecipes() => _db
      .collection('recipes')
      .orderBy('name')
      .snapshots()
      .map((s) => s.docs.map((d) => fromMap(d.id, d.data())).toList());

  @override
  Future<void> save(RecipeItem r, {required bool isNew}) async {
    final ref = _db.doc('recipes/${r.code}');
    final data = _toFirestore(r, isNew: isNew);
    try {
      if (isNew) {
        // Transaction: không ghi đè món Admin khác vừa tạo cùng mã (danh sách local có thể chưa cập nhật).
        await _db.runTransaction((tx) async {
          if ((await tx.get(ref)).exists) {
            throw AdminFailure('Mã ${r.code} đã tồn tại.', code: 'already-exists');
          }
          tx.set(ref, data);
        });
      } else {
        await ref.set(data);
      }
    } catch (e) {
      throw mapFirebaseError(e);
    }
  }

  Map<String, dynamic> _toFirestore(RecipeItem r, {required bool isNew}) => {
    'code': r.code,
    'name': r.name.trim(),
    'description': r.description.trim(),
    'status': r.published ? 'published' : 'hidden',
    'versionNumber': isNew ? 1 : r.versionNumber + 1,
    'ingredients': r.ingredients.map((i) => i.toMap()).toList(),
    'steps': r.steps.map((s) => s.toMap()).toList(),
    'searchKeywords': r.searchKeywords(),
    'updatedAt': FieldValue.serverTimestamp(),
    'updatedBy': _auth.currentUser?.email,
  };

  @override
  Future<void> setPublished(String code, bool published) async {
    try {
      await _db.doc('recipes/$code').update({
        'status': published ? 'published' : 'hidden',
        'updatedAt': FieldValue.serverTimestamp(),
        'updatedBy': _auth.currentUser?.email,
      });
    } catch (e) {
      throw mapFirebaseError(e);
    }
  }

  @override
  Future<int> seedSamples() async {
    try {
      final res = await _call('seedRecipes');
      return _int(res['created']);
    } catch (e) {
      throw mapFirebaseError(e);
    }
  }
}
