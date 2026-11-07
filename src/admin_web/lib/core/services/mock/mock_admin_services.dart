import 'dart:async';

import '../../models/admin_models.dart';
import '../interfaces/admin_services.dart';

/// Bản giả cho widget/unit test và chạy thử không cần Firebase (`--dart-define=MOCK=true`).
class MockAdminAuthService implements IAdminAuthService {
  MockAdminAuthService({AdminIdentity? initial, this.nextLogin}) : _current = initial;

  AdminIdentity? _current;
  AdminIdentity? nextLogin;
  final StreamController<AdminIdentity?> _ctrl = StreamController<AdminIdentity?>.broadcast();

  @override
  Stream<AdminIdentity?> identityChanges() async* {
    yield _current;
    yield* _ctrl.stream;
  }

  @override
  Future<void> signInWithGoogle() async {
    _current =
        nextLogin ??
        const AdminIdentity(uid: 'admin-1', email: 'admin@example.com', displayName: 'Admin', role: UserRole.admin);
    _ctrl.add(_current);
  }

  @override
  Future<void> signOut() async {
    _current = null;
    _ctrl.add(null);
  }
}

class MockUserAdminService implements IUserAdminService {
  MockUserAdminService([List<AdminUser>? users]) : _users = users ?? [];

  final List<AdminUser> _users;
  final List<String> calls = [];
  final StreamController<List<AdminUser>> _ctrl = StreamController<List<AdminUser>>.broadcast();

  @override
  Stream<List<AdminUser>> watchUsers() async* {
    yield List.of(_users);
    yield* _ctrl.stream;
  }

  @override
  Future<List<DeviceInfo>> devicesOf(String uid) async => [
    const DeviceInfo(id: 'd1', platform: 'android', model: 'Redmi 7', osVersion: 'Android 10', appVersion: '1.0.0+1'),
  ];

  AdminUser _copy(AdminUser u, {UserRole? role, bool? disabled}) => AdminUser(
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: role ?? u.role,
    disabled: disabled ?? u.disabled,
    isAnonymous: u.isAnonymous,
    deviceCount: u.deviceCount,
    createdAt: u.createdAt,
    lastSeenAt: u.lastSeenAt,
  );

  @override
  Future<void> setRole(String uid, UserRole role) async {
    calls.add('role:$uid:${roleCode(role)}');
    final i = _users.indexWhere((u) => u.uid == uid);
    if (i >= 0) _users[i] = _copy(_users[i], role: role);
    _ctrl.add(List.of(_users));
  }

  @override
  Future<void> setDisabled(String uid, bool disabled) async {
    calls.add('disabled:$uid:$disabled');
    final i = _users.indexWhere((u) => u.uid == uid);
    if (i >= 0) _users[i] = _copy(_users[i], disabled: disabled);
    _ctrl.add(List.of(_users));
  }
}

class MockIncidentService implements IIncidentService {
  MockIncidentService({List<Incident>? incidents, this.summary = const StatsSummary(), this.days = const []})
    : _items = incidents ?? [];

  final List<Incident> _items;
  StatsSummary summary;
  List<DayStats> days;
  final List<String> updates = [];
  Object? failNextUpdate;
  final StreamController<List<Incident>> _ctrl = StreamController<List<Incident>>.broadcast();

  /// Test: giả lập sự cố mới tới real-time.
  void push(Incident i) {
    _items.insert(0, i);
    _ctrl.add(List.of(_items));
  }

  @override
  Stream<List<Incident>> watchIncidents(IncidentFilter filter, {int limit = 50}) async* {
    List<Incident> apply(List<Incident> all) => all
        .where((i) => filter.statuses.isEmpty || filter.statuses.contains(i.status))
        .where((i) => filter.kind == null || i.kind == filter.kind)
        .take(limit)
        .toList();
    yield apply(_items);
    yield* _ctrl.stream.map(apply);
  }

  @override
  Stream<List<Incident>> watchByUser(String uid, {int limit = 20}) =>
      Stream.value(_items.where((i) => i.uid == uid).take(limit).toList());

  /// Test: phát sự cố tới luồng cảnh báo.
  final StreamController<List<Incident>> recent = StreamController<List<Incident>>.broadcast();

  @override
  Stream<List<Incident>> watchSince(DateTime since, {int limit = 10}) => recent.stream;

  @override
  Stream<StatsSummary> watchSummary() => Stream.value(summary);

  @override
  Stream<List<DayStats>> watchDays(int n) => Stream.value(days);

  @override
  Future<void> updateStatus(String id, IncidentStatus status, {String? note}) async {
    final f = failNextUpdate;
    if (f != null) {
      failNextUpdate = null;
      throw f;
    }
    updates.add('$id:${status.name}:${note ?? ''}');
  }
}

class MockNotificationAdminService implements INotificationAdminService {
  final List<NotificationRequest> sent = [];
  Object? failNext;

  @override
  Future<SendResult> send(NotificationRequest request) async {
    final f = failNext;
    if (f != null) {
      failNext = null;
      throw f;
    }
    sent.add(request);
    return const SendResult(successCount: 1, failureCount: 0);
  }

  @override
  Stream<List<SentNotification>> watchHistory({int limit = 50}) => Stream.value(const []);
}

class MockRecipeAdminService implements IRecipeAdminService {
  MockRecipeAdminService([List<RecipeItem>? recipes]) : _items = recipes ?? [];

  final List<RecipeItem> _items;
  final List<String> calls = [];
  final StreamController<List<RecipeItem>> _ctrl = StreamController<List<RecipeItem>>.broadcast();

  @override
  Stream<List<RecipeItem>> watchRecipes() async* {
    yield List.of(_items);
    yield* _ctrl.stream;
  }

  @override
  Future<void> save(RecipeItem recipe, {required bool isNew}) async {
    calls.add('save:${recipe.code}:$isNew');
    if (isNew && _items.any((r) => r.code == recipe.code)) {
      throw AdminFailure('Mã ${recipe.code} đã tồn tại.', code: 'already-exists');
    }
    _items.removeWhere((r) => r.code == recipe.code);
    _items.add(recipe);
    _ctrl.add(List.of(_items));
  }

  @override
  Future<void> setPublished(String code, bool published) async {
    calls.add('publish:$code:$published');
    final i = _items.indexWhere((r) => r.code == code);
    if (i >= 0) _items[i] = _items[i].copyWith(published: published);
    _ctrl.add(List.of(_items));
  }

  @override
  Future<int> seedSamples() async {
    calls.add('seed');
    return 6;
  }
}
