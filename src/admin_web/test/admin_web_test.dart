// Kiểm thử web Admin (plan 261105-admin-web-firebase, phase 07–09): guard, ViewModel, form.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:recipehub_admin/app.dart';
import 'package:recipehub_admin/core/di/app_services.dart';
import 'package:recipehub_admin/core/models/admin_models.dart';
import 'package:recipehub_admin/core/services/mock/mock_admin_services.dart';
import 'package:recipehub_admin/core/viewmodels/dashboard_viewmodel.dart';
import 'package:recipehub_admin/core/viewmodels/incidents_viewmodel.dart';
import 'package:recipehub_admin/core/viewmodels/notifications_viewmodel.dart';
import 'package:recipehub_admin/core/viewmodels/recipes_viewmodel.dart';
import 'package:recipehub_admin/core/viewmodels/users_viewmodel.dart';
import 'package:recipehub_admin/core/viewmodels/view_state.dart';

const _admin = AdminIdentity(uid: 'admin-1', email: 'admin@example.com', role: UserRole.admin);
const _viewer = AdminIdentity(uid: 'v-1', email: 'barista@example.com', role: UserRole.viewer);

Incident _incident(String id, {IncidentStatus status = IncidentStatus.open, IncidentKind kind = IncidentKind.fatal}) =>
    Incident(
      id: id,
      kind: kind,
      status: status,
      message: 'demo crash $id',
      uid: 'v-1',
      email: 'barista@example.com',
      deviceModel: 'Redmi 7',
      osVersion: 'Android 10',
      appVersion: '1.0.0',
      reportedAt: DateTime(2026, 11, 5, 10),
    );

RecipeItem _recipe(String code, {bool published = true}) => RecipeItem(
      code: code,
      name: 'Món $code',
      published: published,
      ingredients: const [RecipeIngredient(name: 'Espresso', quantity: 40, unit: 'ml')],
      steps: const [RecipeStep(title: 'Chiết xuất', description: '2 shot')],
    );

Future<void> _pumpApp(WidgetTester tester, AppServices services, {Size size = const Size(1400, 900)}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(RecipeHubAdminApp(services: services));
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _tick() => Future<void>.delayed(const Duration(milliseconds: 10));

void main() {
  testWidgets('W-01 Chưa đăng nhập → màn đăng nhập Google', (tester) async {
    await _pumpApp(tester, AppServices.mock(auth: MockAdminAuthService()));
    expect(find.byKey(const Key('login_google')), findsOneWidget);
  });

  testWidgets('W-02 Tài khoản viewer → "Không có quyền" + nút đăng xuất', (tester) async {
    await _pumpApp(tester, AppServices.mock(auth: MockAdminAuthService(initial: _viewer)));
    expect(find.byKey(const Key('forbidden_title')), findsOneWidget);
    await tester.tap(find.byKey(const Key('forbidden_logout')));
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(find.byKey(const Key('login_google')), findsOneWidget);
  });

  testWidgets('W-03 Admin đăng nhập → sidebar 5 mục, badge sự cố đang mở', (tester) async {
    final auth = MockAdminAuthService(nextLogin: _admin);
    final incidents = MockIncidentService(
      incidents: [_incident('i1')],
      summary: const StatsSummary(openIncidents: 1, totalIncidents: 1, totalUsers: 2),
    );
    await _pumpApp(tester, AppServices.mock(auth: auth, incidents: incidents));
    await tester.tap(find.byKey(const Key('login_google')));
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    for (final p in ['/', '/incidents', '/notifications', '/users', '/recipes']) {
      expect(find.byKey(Key('nav_$p')), findsOneWidget);
    }
    expect(find.byKey(const Key('nav_incident_badge')), findsOneWidget);
    expect(find.byKey(const Key('stat_open')), findsOneWidget);
  });

  testWidgets('W-04 Màn hẹp (800 px) → drawer thay sidebar', (tester) async {
    await _pumpApp(tester, AppServices.mock(auth: MockAdminAuthService(initial: _admin)), size: const Size(800, 900));
    expect(find.byKey(const Key('nav_/users')), findsNothing);
    final scaffold = tester.state<ScaffoldState>(find.byKey(const Key('admin_scaffold')));
    scaffold.openDrawer();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('nav_/users')), findsOneWidget);
  });

  test('W-05 Sự cố mới (luồng riêng) → cảnh báo + âm báo; sự cố cũ trượt vào danh sách thì KHÔNG', () async {
    final service = MockIncidentService(incidents: [_incident('old')]);
    final alerts = <String>[];
    final vm = IncidentsViewModel(service: service, onNewIncident: (i) => alerts.add(i.id))..start();
    await _tick();
    expect(vm.items, hasLength(1));
    service.push(_incident('older-reopened'));
    await _tick();
    expect(vm.alert, isNull, reason: 'thay đổi trong danh sách theo bộ lọc không phải sự cố mới');
    service.recent.add([_incident('new')]);
    await _tick();
    expect(vm.alert?.id, 'new');
    expect(alerts, ['new']);
    service.recent.add([_incident('new')]);
    await _tick();
    expect(alerts, ['new'], reason: 'cùng sự cố không báo 2 lần');
    vm.select(vm.alert, fromOutside: true);
    expect(vm.alert, isNull, reason: 'chọn đúng sự cố đang cảnh báo thì tắt banner');
    expect(vm.takeOpenDetailRequest(), isTrue);
    expect(vm.takeOpenDetailRequest(), isFalse);
    vm.soundOn = false;
    service.recent.add([_incident('quiet')]);
    await _tick();
    expect(vm.alert?.id, 'quiet');
    expect(alerts, ['new'], reason: 'tắt âm báo thì không phát');
  });

  test('W-06 Đổi trạng thái sự cố: gọi service; lỗi quyền → actionError', () async {
    final service = MockIncidentService(incidents: [_incident('i1')]);
    final vm = IncidentsViewModel(service: service)..start();
    await _tick();
    expect(await vm.updateStatus(vm.items.first, IncidentStatus.resolved, note: 'đã kiểm tra'), isTrue);
    expect(service.updates, ['i1:resolved:đã kiểm tra']);
    service.failNextUpdate = const AdminFailure('Không có quyền (Firestore rules).');
    expect(await vm.updateStatus(vm.items.first, IncidentStatus.dismissed), isFalse);
    expect(vm.actionError, contains('Không có quyền'));
  });

  test('W-07 Form thông báo: kiểm tra độ dài, người nhận, payload đúng định dạng app', () async {
    final service = MockNotificationAdminService();
    final vm = NotificationsViewModel(service: service);
    expect(vm.canSend, isFalse);
    vm.update(title: 'x' * 66, body: 'Nội dung');
    expect(vm.validationError, contains('65'));
    vm.update(title: 'Món mới', toAll: false);
    expect(vm.validationError, 'Chọn người nhận.');
    vm.update(
      target: const AdminUser(uid: 'v-1', email: 'b@x.com', role: UserRole.viewer, disabled: false, isAnonymous: false),
      recipeCode: 'CF-MUOI',
    );
    expect(vm.canSend, isTrue);
    expect(await vm.send(), isTrue);
    expect(service.sent.single.toPayload(), {
      'title': 'Món mới',
      'body': 'Nội dung',
      'target': 'user',
      'targetUid': 'v-1',
      'data': {'type': 'recipe', 'targetId': 'CF-MUOI'},
    });
    expect(vm.title, isEmpty);
    expect(vm.recipeCode, isNull, reason: "deep link không mang sang tin kế tiếp");
    expect(vm.targetUser?.uid, "v-1", reason: "giữ người nhận để gửi tiếp");
    service.failNext = const AdminFailure('Người nhận chưa có thiết bị nào đăng ký nhận thông báo.');
    vm.update(title: 'Lần 2', body: 'x');
    expect(await vm.send(), isFalse);
    expect(vm.error, contains('chưa có thiết bị'));
  });

  test('W-08 Người dùng: không thao tác trên chính mình; lọc + đổi vai trò', () async {
    final service = MockUserAdminService([
      const AdminUser(uid: 'admin-1', email: 'admin@example.com', role: UserRole.admin, disabled: false, isAnonymous: false),
      const AdminUser(uid: 'v-1', email: 'barista@example.com', role: UserRole.viewer, disabled: false, isAnonymous: false),
    ]);
    final vm = UsersViewModel(service: service, selfUid: 'admin-1')..start();
    await _tick();
    final me = vm.all.firstWhere((u) => u.uid == 'admin-1');
    final other = vm.all.firstWhere((u) => u.uid == 'v-1');
    expect(vm.canManage(me), isFalse);
    expect(await vm.setDisabled(me, true), isFalse);
    expect(service.calls, isEmpty);
    expect(await vm.setRole(other, UserRole.admin), isTrue);
    expect(await vm.setDisabled(other, true), isTrue);
    expect(service.calls, ['role:v-1:admin', 'disabled:v-1:true']);
    await _tick();
    vm.setDisabledFilter(true);
    expect(vm.users.map((u) => u.uid), ['v-1']);
    vm.setDisabledFilter(null);
    vm.setQuery('BARISTA');
    expect(vm.users.map((u) => u.uid), ['v-1']);
  });

  test('W-09 Tổng quan: chưa có dữ liệu → empty; có số liệu → ready', () async {
    final empty = DashboardViewModel(incidents: MockIncidentService())..start();
    await _tick();
    expect(empty.state, ViewState.empty);
    final ready = DashboardViewModel(
      incidents: MockIncidentService(
        incidents: [_incident('i1')],
        summary: const StatsSummary(openIncidents: 1, totalIncidents: 1),
        days: const [DayStats(day: '2026-11-05', total: 1, fatal: 1)],
      ),
    )..start();
    await _tick();
    expect(ready.state, ViewState.ready);
    expect(ready.todayIncidents, 1);
  });

  test('W-10 Món: kiểm tra mã, trùng mã, nguyên liệu; từ khóa không dấu', () async {
    final vm = RecipesViewModel(service: MockRecipeAdminService([_recipe('CF-MUOI')]))..start();
    await _tick();
    expect(await vm.save(_recipe('cf-muoi'), isNew: true), contains('Mã món'));
    expect(await vm.save(_recipe('CF-MUOI'), isNew: true), contains('đã tồn tại'));
    const noIng = RecipeItem(
      code: 'TS-NEW',
      name: 'Trà mới',
      published: false,
      steps: [RecipeStep(title: 'Lắc', description: '')],
    );
    expect(await vm.save(noIng, isNew: true), contains('nguyên liệu'));
    expect(await vm.save(_recipe('TS-NEW'), isNew: true), isNull);
    await _tick();
    expect(vm.codes, containsAll(['CF-MUOI', 'TS-NEW']));
    const r = RecipeItem(code: 'CF-MUOI', name: 'Cà Phê Muối Đá', published: true);
    expect(r.searchKeywords(), ['cf', 'da', 'ca', 'muoi', 'phe']..sort());
  });

  test('W-11 Món: ẩn / ban hành và nạp món mẫu', () async {
    final service = MockRecipeAdminService([_recipe('CF-MUOI')]);
    final vm = RecipesViewModel(service: service)..start();
    await _tick();
    expect(await vm.togglePublished(vm.all.single), isTrue);
    await _tick();
    expect(vm.all.single.published, isFalse);
    expect(vm.publishedRecipes, isEmpty);
    expect(await vm.seedSamples(), 6);
    expect(service.calls, ['publish:CF-MUOI:false', 'seed']);
  });
}
