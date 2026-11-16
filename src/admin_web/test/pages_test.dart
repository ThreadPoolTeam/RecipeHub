// Widget test các màn web Admin trên dịch vụ giả: thao tác thật của Admin (gửi, xử lý, khóa, thêm món…).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:recipehub_admin/app.dart';
import 'package:recipehub_admin/core/di/app_services.dart';
import 'package:recipehub_admin/core/models/admin_models.dart';
import 'package:recipehub_admin/core/navigation/router.dart';
import 'package:recipehub_admin/core/services/mock/mock_admin_services.dart';
import 'package:recipehub_admin/core/viewmodels/admin_auth_viewmodel.dart';
import 'package:recipehub_admin/core/viewmodels/dashboard_viewmodel.dart';
import 'package:recipehub_admin/core/viewmodels/incidents_viewmodel.dart';

const _admin = AdminIdentity(uid: 'admin-1', email: 'admin@example.com', role: UserRole.admin);

Incident _incident(String id, {IncidentStatus status = IncidentStatus.open}) => Incident(
      id: id,
      kind: IncidentKind.fatal,
      status: status,
      message: 'demo crash $id',
      errorType: 'StateError',
      uid: 'v-1',
      email: 'barista@example.com',
      deviceModel: 'Redmi 7',
      osVersion: 'Android 10',
      appVersion: '1.0.0',
      stackTop: '#0 main',
      reportedAt: DateTime(2026, 11, 5, 10),
    );

RecipeItem _recipe(String code, {bool published = true}) => RecipeItem(
      code: code,
      name: 'Món $code',
      published: published,
      ingredients: const [RecipeIngredient(name: 'Espresso', quantity: 40, unit: 'ml')],
      steps: const [RecipeStep(title: 'Chiết xuất', description: '2 shot', equipment: 'Máy', safetyNote: 'Nóng')],
    );

class _Env {
  final incidents = MockIncidentService(
    incidents: [_incident('i1')],
    summary: const StatsSummary(openIncidents: 1, totalIncidents: 1, totalUsers: 2),
    days: const [DayStats(day: '2026-11-05', total: 1, fatal: 1, byVersion: {'1,0,0': 1}, byModel: {'Redmi 7': 1})],
  );
  final users = MockUserAdminService([
    const AdminUser(uid: 'admin-1', email: 'admin@example.com', role: UserRole.admin, disabled: false, isAnonymous: false),
    const AdminUser(uid: 'v-1', email: 'barista@example.com', role: UserRole.viewer, disabled: false, isAnonymous: false, deviceCount: 1),
  ]);
  final notifications = MockNotificationAdminService();
  final recipes = MockRecipeAdminService([_recipe('CF-MUOI'), _recipe('TS-HIDE', published: false)]);

  AppServices get services => AppServices.mock(
        auth: MockAdminAuthService(initial: _admin),
        incidents: incidents,
        users: users,
        notifications: notifications,
        recipes: recipes,
      );
}

Future<void> _open(WidgetTester tester, _Env env, {Size size = const Size(1600, 1000)}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(RecipeHubAdminApp(services: env.services));
  await _frames(tester);
}

Future<void> _frames(WidgetTester tester, [int n = 6]) async {
  for (var i = 0; i < n; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _go(WidgetTester tester, String path) async {
  await tester.tap(find.byKey(Key('nav_$path')));
  await _frames(tester);
}

Future<void> _confirm(WidgetTester tester, String label) async {
  await tester.tap(find.widgetWithText(FilledButton, label).last);
  await _frames(tester);
}

void main() {
  testWidgets('PG-01 Sự cố: chọn → ghi chú → Đã xử lý; thống kê; banner sự cố mới → Xem', (tester) async {
    final env = _Env();
    await _open(tester, env);
    await _go(tester, '/incidents');
    await tester.tap(find.byKey(const Key('incident_i1')));
    await _frames(tester);
    expect(find.byKey(const Key('incident_detail')), findsOneWidget);
    await tester.enterText(find.byKey(const Key('incident_note')), 'đã kiểm tra');
    await tester.tap(find.byKey(const Key('action_resolve')));
    await _frames(tester);
    expect(env.incidents.updates, ['i1:resolved:đã kiểm tra']);
    expect(find.text('Đã xử lý'), findsWidgets);

    await tester.tap(find.byKey(const Key('filter_status_resolved')));
    await _frames(tester);
    await tester.tap(find.byKey(const Key('tab_stats')));
    await _frames(tester);
    expect(find.byKey(const Key('stats_tab')), findsOneWidget);
    expect(find.text('1.0.0'), findsOneWidget, reason: 'khóa "1,0,0" hiển thị lại thành 1.0.0');

    env.incidents.recent.add([_incident('new')]);
    await _frames(tester);
    expect(find.byKey(const Key('new_incident_banner')), findsOneWidget);
    await tester.tap(find.text('Xem'));
    await _frames(tester);
    expect(find.byKey(const Key('new_incident_banner')), findsNothing);
  });

  testWidgets('PG-02 Sự cố màn hẹp: chi tiết mở bằng hộp thoại; Xác nhận; lỗi quyền hiện thông báo', (tester) async {
    final env = _Env();
    await _open(tester, env, size: const Size(1000, 900));
    final scaffold = tester.state<ScaffoldState>(find.byKey(const Key('admin_scaffold')));
    scaffold.openDrawer();
    await _frames(tester);
    await _go(tester, '/incidents');
    await tester.tap(find.byKey(const Key('incident_i1')));
    await _frames(tester);
    expect(find.byType(Dialog), findsOneWidget);
    env.incidents.failNextUpdate = const AdminFailure('Bị từ chối bởi Firestore rules.');
    await tester.tap(find.byKey(const Key('action_ack')));
    await _frames(tester);
    expect(find.textContaining('Bị từ chối'), findsWidgets);
    await tester.tap(find.byKey(const Key('action_dismiss')));
    await _frames(tester);
    expect(env.incidents.updates.single, startsWith('i1:dismissed'));
  });

  testWidgets('PG-03 Thông báo: soạn, chọn người nhận + món, gửi, lịch sử', (tester) async {
    final env = _Env();
    await _open(tester, env);
    await _go(tester, '/notifications');
    expect(tester.widget<ButtonStyleButton>(find.byKey(const Key('notif_send'))).onPressed, isNull, reason: 'chưa nhập thì không gửi được');
    await tester.enterText(find.byKey(const Key('notif_title')), 'Món mới');
    await tester.enterText(find.byKey(const Key('notif_body')), 'Thử Cà Phê Muối');
    await _frames(tester, 2);
    await tester.tap(find.text('Một người dùng'));
    await _frames(tester);
    await tester.tap(find.byKey(const ValueKey('notif_target_null')));
    await _frames(tester);
    await tester.tap(find.textContaining('barista@example.com').last);
    await _frames(tester);
    await tester.tap(find.byKey(const ValueKey('notif_recipe_null')));
    await _frames(tester);
    await tester.tap(find.textContaining('CF-MUOI').last);
    await _frames(tester);
    await tester.tap(find.byKey(const Key('notif_send')));
    await _frames(tester);
    await _confirm(tester, 'Gửi');
    final sent = env.notifications.sent.single;
    expect(sent.toAll, isFalse);
    expect(sent.targetUid, 'v-1');
    expect(sent.recipeCode, 'CF-MUOI');
    await tester.tap(find.byKey(const Key('tab_history')));
    await _frames(tester);
    expect(find.text('Chưa gửi thông báo nào'), findsOneWidget);
  });

  testWidgets('PG-04 Người dùng: tìm, lọc, đổi vai trò, khóa; không thao tác trên chính mình', (tester) async {
    final env = _Env();
    await _open(tester, env);
    await _go(tester, '/users');
    expect(find.byKey(const Key('user_menu_admin-1')), findsNothing);
    await tester.enterText(find.byKey(const Key('user_search')), 'barista');
    await _frames(tester, 2);
    await tester.tap(find.byKey(const Key('user_menu_v-1')));
    await _frames(tester);
    await tester.tap(find.byKey(const Key('menu_role')));
    await _frames(tester);
    await _confirm(tester, 'Đổi');
    await tester.tap(find.byKey(const Key('user_menu_v-1')));
    await _frames(tester);
    await tester.tap(find.byKey(const Key('menu_disable')));
    await _frames(tester);
    await _confirm(tester, 'Khóa');
    expect(env.users.calls, ['role:v-1:admin', 'disabled:v-1:true']);
    await tester.tap(find.byKey(const Key('user_v-1')));
    await _frames(tester);
    expect(find.textContaining('Redmi 7'), findsWidgets);
  });

  testWidgets('PG-05 Món: thêm (kiểm tra số, bỏ dòng trống, giữ Dụng cụ/Lưu ý), sửa, ẩn', (tester) async {
    final env = _Env();
    await _open(tester, env);
    await _go(tester, '/recipes');
    await tester.tap(find.byKey(const Key('recipe_add')));
    await _frames(tester);
    await tester.enterText(find.byKey(const Key('form_code')), 'tt-new');
    await tester.enterText(find.byKey(const Key('form_name')), 'Trà Mới');
    await tester.enterText(find.byKey(const Key('ing_name_0')), 'Trà');
    await tester.enterText(find.byKey(const Key('ing_qty_0')), 'abc');
    await tester.enterText(find.byKey(const Key('step_title_0')), 'Ủ');
    await tester.tap(find.byKey(const Key('form_save')));
    await _frames(tester);
    expect(find.textContaining('không phải số'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('ing_qty_0')), '100');
    await tester.enterText(find.byKey(const Key('step_seconds_0')), '-5');
    await tester.tap(find.byKey(const Key('form_save')));
    await _frames(tester);
    expect(find.textContaining('số nguyên'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('step_seconds_0')), '60');
    await tester.tap(find.byKey(const Key('form_add_ing')));
    await _frames(tester, 2);
    await tester.tap(find.byKey(const Key('form_save')));
    await _frames(tester);
    expect(env.recipes.calls.last, 'save:TT-NEW:true', reason: 'dòng nguyên liệu trống bị bỏ, mã tự in hoa');

    await tester.tap(find.byKey(const Key('recipe_CF-MUOI')));
    await _frames(tester);
    await tester.tap(find.byKey(const Key('form_save')));
    await _frames(tester);
    expect(env.recipes.calls.last, 'save:CF-MUOI:false');

    await tester.tap(find.byKey(const Key('recipe_toggle_CF-MUOI')));
    await _frames(tester);
    expect(env.recipes.calls.last, 'publish:CF-MUOI:false');
  });

  testWidgets('PG-06 Món trống → nạp món mẫu', (tester) async {
    final env = _Env();
    final services = AppServices.mock(auth: MockAdminAuthService(initial: _admin), recipes: MockRecipeAdminService());
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(RecipeHubAdminApp(services: services));
    await _frames(tester);
    await _go(tester, '/recipes');
    await tester.tap(find.byKey(const Key('recipe_seed')));
    await _frames(tester);
    expect(find.text('Đã nạp 6 món mẫu.'), findsOneWidget);
    expect(env.recipes, isNotNull);
  });

  test('PG-07 router: giữ trang khi tải lại trình duyệt', () {
    expect(adminRedirect(AdminAuthStatus.unknown, Uri.parse('/users')), '/loading?from=%2Fusers');
    expect(adminRedirect(AdminAuthStatus.admin, Uri.parse('/loading?from=/users')), '/users');
    expect(adminRedirect(AdminAuthStatus.signedOut, Uri.parse('/loading?from=/users')), '/login?from=%2Fusers');
    expect(adminRedirect(AdminAuthStatus.admin, Uri.parse('/login?from=/users')), '/users');
    expect(adminRedirect(AdminAuthStatus.admin, Uri.parse('/login?from=/evil')), '/');
    expect(adminRedirect(AdminAuthStatus.forbidden, Uri.parse('/users')), '/forbidden');
    expect(adminRedirect(AdminAuthStatus.admin, Uri.parse('/recipes')), isNull);
  });

  test('PG-08 Tổng quan: lỗi giữ nguyên tới khi Thử lại; hẹn giờ 00:00 giờ VN', () async {
    final vm = DashboardViewModel(incidents: _FailingDays());
    vm.start();
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(vm.error, contains('days'));
    expect(DashboardViewModel.untilVnMidnight(DateTime.utc(2026, 11, 5, 16, 59, 0)).inSeconds, 62);
    vm.dispose();
  });

  test('PG-09 hiển thị phiên bản: "1,0,0" và "1_0_0" → "1.0.0"; tên có "_" giữ nguyên', () {
    expect(IncidentsViewModel.displayVersion('1,0,0+1'), '1.0.0+1');
    expect(IncidentsViewModel.displayVersion('1_0_0'), '1.0.0');
    expect(IncidentsViewModel.displayVersion('other'), 'other');
  });
}

class _FailingDays extends MockIncidentService {
  @override
  Stream<List<DayStats>> watchDays(int n) => Stream.error(StateError('days index'));
}
