import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin_shell.dart';
import '../../features/auth/forbidden_page.dart';
import '../../features/auth/login_page.dart';
import '../../features/dashboard/dashboard_page.dart';
import '../../features/incidents/incidents_page.dart';
import '../../features/notifications/notifications_page.dart';
import '../../features/recipes/recipes_page.dart';
import '../../features/users/users_page.dart';
import '../viewmodels/admin_auth_viewmodel.dart';

const _shellPaths = {'/', '/incidents', '/notifications', '/users', '/recipes'};

/// Guard: chưa đăng nhập → /login; không có claim admin → /forbidden; admin → khung quản trị.
/// Giữ trang đang mở qua `?from=` khi tải lại trình duyệt (trạng thái xác thực ban đầu là unknown).
String? adminRedirect(AdminAuthStatus status, Uri uri) {
  final loc = uri.path;
  final from = uri.queryParameters['from'];
  String? keep() => _shellPaths.contains(loc) && loc != '/' ? loc : from;
  String withFrom(String target) {
    final f = keep();
    return f == null ? target : Uri(path: target, queryParameters: {'from': f}).toString();
  }

  switch (status) {
    case AdminAuthStatus.unknown:
      return loc == '/loading' ? null : withFrom('/loading');
    case AdminAuthStatus.signedOut:
      return loc == '/login' ? null : withFrom('/login');
    case AdminAuthStatus.forbidden:
      return loc == '/forbidden' ? null : '/forbidden';
    case AdminAuthStatus.admin:
      if (loc == '/login' || loc == '/forbidden' || loc == '/loading') {
        return (from != null && _shellPaths.contains(from)) ? from : '/';
      }
      return null;
  }
}

GoRouter buildRouter(AdminAuthViewModel auth) => GoRouter(
  refreshListenable: auth,
  initialLocation: '/',
  redirect: (context, state) => adminRedirect(auth.status, state.uri),
  routes: [
    GoRoute(path: '/loading', builder: (_, _) => const SplashPage()),
    GoRoute(path: '/login', builder: (_, _) => const LoginPage()),
    GoRoute(path: '/forbidden', builder: (_, _) => const ForbiddenPage()),
    ShellRoute(
      builder: (context, state, child) => AdminShell(location: state.matchedLocation, child: child),
      routes: [
        GoRoute(
          path: '/',
          pageBuilder: (_, _) => const NoTransitionPage(child: DashboardPage()),
        ),
        GoRoute(
          path: '/incidents',
          pageBuilder: (_, _) => const NoTransitionPage(child: IncidentsPage()),
        ),
        GoRoute(
          path: '/notifications',
          pageBuilder: (_, _) => const NoTransitionPage(child: NotificationsPage()),
        ),
        GoRoute(
          path: '/users',
          pageBuilder: (_, _) => const NoTransitionPage(child: UsersPage()),
        ),
        GoRoute(
          path: '/recipes',
          pageBuilder: (_, _) => const NoTransitionPage(child: RecipesPage()),
        ),
      ],
    ),
  ],
  errorBuilder: (_, _) => const SplashPage(),
);

class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) => const Center(child: Text('RecipeHub Admin…'));
}
