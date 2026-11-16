import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/di/app_services.dart';
import '../core/platform/alert_sound.dart';
import '../core/viewmodels/admin_auth_viewmodel.dart';
import '../core/viewmodels/dashboard_viewmodel.dart';
import '../core/viewmodels/incidents_viewmodel.dart';
import '../core/viewmodels/notifications_viewmodel.dart';
import '../core/viewmodels/recipes_viewmodel.dart';
import '../core/viewmodels/users_viewmodel.dart';
import '../core/widgets/admin_scaffold.dart';

/// Tạo các ViewModel của phiên Admin một lần (sống suốt khi chuyển trang) rồi bọc AdminScaffold.
/// IncidentsViewModel chạy ngay từ đầu để banner sự cố mới hiện trên mọi trang.
class AdminShell extends StatelessWidget {
  const AdminShell({super.key, required this.location, required this.child});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final s = context.read<AppServices>();
    final identity = context.read<AdminAuthViewModel>().identity;
    final selfUid = identity?.uid ?? '';
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => DashboardViewModel(incidents: s.incidents)..start()),
        ChangeNotifierProvider(
          create: (_) => IncidentsViewModel(
            service: s.incidents,
            onNewIncident: (_) => playAlertSound(),
            adminEmail: identity?.email,
          )..start(),
        ),
        ChangeNotifierProvider(create: (_) => NotificationsViewModel(service: s.notifications)..startHistory()),
        ChangeNotifierProvider(
          create: (_) => UsersViewModel(service: s.users, selfUid: selfUid)..start(),
        ),
        ChangeNotifierProvider(create: (_) => RecipesViewModel(service: s.recipes)..start()),
      ],
      // Trình duyệt chỉ cho phát âm báo sau thao tác của người dùng → mở khóa ở lần chạm đầu.
      child: Listener(
        onPointerDown: (_) => unlockAlertSound(),
        child: AdminScaffold(location: location, child: child),
      ),
    );
  }
}
