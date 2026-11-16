import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/nomad_kit.dart';
import '../../core/viewmodels/admin_auth_viewmodel.dart';

/// Đăng nhập được nhưng claim không phải admin.
class ForbiddenPage extends StatelessWidget {
  const ForbiddenPage({super.key});

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<AdminAuthViewModel>();
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.lock_outline_rounded, size: 48, color: NomadKit.error),
                  const SizedBox(height: 12),
                  const Text(
                    'Không có quyền truy cập',
                    key: Key('forbidden_title'),
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: NomadKit.ink),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tài khoản ${vm.identity?.email ?? ''} chưa được cấp vai trò Admin.\n'
                    'Nhờ một Admin hiện có cấp quyền ở mục Người dùng.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: NomadKit.secondary, height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  OutlinedButton.icon(
                    key: const Key('forbidden_logout'),
                    onPressed: vm.signOut,
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Đăng xuất'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
