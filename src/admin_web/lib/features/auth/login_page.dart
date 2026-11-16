import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/nomad_kit.dart';
import '../../core/viewmodels/admin_auth_viewmodel.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<AdminAuthViewModel>();
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(color: NomadKit.sand, borderRadius: BorderRadius.circular(18)),
                    child: const Icon(Icons.coffee_rounded, color: Colors.white, size: 36),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'RecipeHub Admin',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: NomadKit.ink),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Quản lý người dùng, món, thông báo và sự cố của app mobile.\nChỉ tài khoản Admin được truy cập.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: NomadKit.secondary, height: 1.4),
                  ),
                  const SizedBox(height: 24),
                  if (vm.error != null) ...[
                    Text(
                      vm.error!,
                      key: const Key('login_error'),
                      style: const TextStyle(color: NomadKit.error),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton.icon(
                      key: const Key('login_google'),
                      onPressed: vm.busy ? null : vm.signIn,
                      icon: vm.busy
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.login_rounded),
                      label: const Text('Đăng nhập với Google'),
                    ),
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
