import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/models/admin_models.dart';
import '../../core/theme/nomad_kit.dart';
import '../../core/viewmodels/notifications_viewmodel.dart';
import '../../core/viewmodels/users_viewmodel.dart';
import '../../core/viewmodels/view_state.dart';
import '../../core/widgets/common.dart';

/// Quản lý người dùng: vai trò (custom claim) và khóa / mở khóa (Firebase Auth) qua Cloud Functions.
class UsersPage extends StatelessWidget {
  const UsersPage({super.key});

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<UsersViewModel>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHeader(overline: 'Người dùng', title: '${vm.all.length} tài khoản app mobile'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              SizedBox(
                width: 280,
                child: TextField(
                  key: const Key('user_search'),
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search_rounded),
                    hintText: 'Tìm email / tên',
                  ),
                  onChanged: vm.setQuery,
                ),
              ),
              DropdownButton<UserRole?>(
                value: vm.roleFilter,
                items: const [
                  DropdownMenuItem(value: null, child: Text('Mọi vai trò')),
                  DropdownMenuItem(value: UserRole.admin, child: Text('Admin')),
                  DropdownMenuItem(value: UserRole.viewer, child: Text('Barista')),
                ],
                onChanged: vm.setRoleFilter,
              ),
              DropdownButton<bool?>(
                value: vm.disabledFilter,
                items: const [
                  DropdownMenuItem(value: null, child: Text('Mọi trạng thái')),
                  DropdownMenuItem(value: false, child: Text('Đang hoạt động')),
                  DropdownMenuItem(value: true, child: Text('Bị khóa')),
                ],
                onChanged: vm.setDisabledFilter,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (vm.actionError != null) InlineError(vm.actionError!),
          Expanded(
            child: switch (vm.state) {
              ViewState.loading => const LoadingView(),
              ViewState.error => ErrorView(message: vm.error ?? '', onRetry: vm.retry),
              ViewState.empty => const EmptyView(
                title: 'Chưa có người dùng',
                message: 'Người dùng xuất hiện sau lần đăng nhập đầu tiên trên app mobile hoặc web.',
                icon: Icons.group_outlined,
              ),
              ViewState.ready => Card(
                child: ListView.separated(
                  key: const Key('user_list'),
                  itemCount: vm.users.length,
                  separatorBuilder: (_, _) => const Divider(),
                  itemBuilder: (context, i) => _UserRow(user: vm.users[i]),
                ),
              ),
            },
          ),
        ],
      ),
    );
  }
}

class _UserRow extends StatelessWidget {
  const _UserRow({required this.user});

  final AdminUser user;

  Future<void> _toggleRole(BuildContext context) async {
    final vm = context.read<UsersViewModel>();
    final next = user.role == UserRole.admin ? UserRole.viewer : UserRole.admin;
    if (!await confirm(
      context,
      title: 'Đổi vai trò?',
      message: '${user.label}: ${roleLabel(user.role)} → ${roleLabel(next)}.',
      ok: 'Đổi',
    )) {
      return;
    }
    final ok = await vm.setRole(user, next);
    if (context.mounted && ok) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Đã đổi ${user.label} thành ${roleLabel(next)}.')));
    }
  }

  Future<void> _toggleDisabled(BuildContext context) async {
    final vm = context.read<UsersViewModel>();
    final disable = !user.disabled;
    if (!await confirm(
      context,
      title: disable ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?',
      message: disable
          ? '${user.label} sẽ bị đăng xuất khỏi app ngay và không đăng nhập lại được.'
          : '${user.label} có thể đăng nhập lại.',
      ok: disable ? 'Khóa' : 'Mở khóa',
      danger: disable,
    )) {
      return;
    }
    final ok = await vm.setDisabled(user, disable);
    if (context.mounted && ok) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(disable ? 'Đã khóa ${user.label}.' : 'Đã mở khóa ${user.label}.')));
    }
  }

  Future<void> _showDetail(BuildContext context) async {
    final vm = context.read<UsersViewModel>();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(user.label),
        content: SizedBox(
          width: 420,
          child: FutureBuilder<List<DeviceInfo>>(
            future: vm.devicesOf(user.uid),
            builder: (_, snap) {
              if (snap.connectionState != ConnectionState.done) return const LinearProgressIndicator();
              if (snap.hasError) return Text('Lỗi: ${snap.error}');
              final devices = snap.data ?? const [];
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('UID: ${user.uid}', style: const TextStyle(color: NomadKit.secondary, fontSize: 12)),
                  Text(
                    'Tạo: ${formatDateTime(user.createdAt)} · Hoạt động: ${formatDateTime(user.lastSeenAt)}',
                    style: const TextStyle(color: NomadKit.secondary, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Thiết bị nhận thông báo (${devices.length})',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  if (devices.isEmpty) const Text('Chưa có thiết bị nào đăng ký FCM token.'),
                  for (final d in devices)
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.phone_android_rounded),
                      title: Text('${d.model ?? d.platform} · ${d.osVersion ?? ''}'),
                      subtitle: Text('App ${d.appVersion ?? '?'} · cập nhật ${formatDateTime(d.updatedAt)}'),
                    ),
                ],
              );
            },
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Đóng'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<UsersViewModel>();
    final busy = vm.busyUid == user.uid;
    final canManage = vm.canManage(user);
    return ListTile(
      key: Key('user_${user.uid}'),
      onTap: () => _showDetail(context),
      leading: CircleAvatar(
        backgroundColor: user.disabled ? NomadKit.errorLight : NomadKit.sandLight,
        child: Icon(
          user.isAnonymous ? Icons.person_outline : Icons.person,
          color: user.disabled ? NomadKit.error : NomadKit.sandDark,
        ),
      ),
      title: Text(user.label, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(
        '${user.displayName ?? ''}${user.displayName == null ? '' : ' · '}'
        'Hoạt động ${formatShort(user.lastSeenAt)} · ${user.deviceCount} thiết bị',
      ),
      trailing: Wrap(
        spacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          user.role == UserRole.admin
              ? const Pill(label: 'Admin', fg: NomadKit.sandDark, bg: NomadKit.sandLight)
              : const Pill(label: 'Barista', fg: NomadKit.forest, bg: NomadKit.forestLight),
          if (user.disabled) const Pill(label: 'Bị khóa', fg: NomadKit.error, bg: NomadKit.errorLight),
          if (busy) const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
          if (!canManage) const Text('(bạn)', style: TextStyle(color: NomadKit.secondary)),
          if (canManage && !busy)
            PopupMenuButton<String>(
              key: Key('user_menu_${user.uid}'),
              tooltip: 'Thao tác',
              onSelected: (v) {
                switch (v) {
                  case 'role':
                    _toggleRole(context);
                  case 'disable':
                    _toggleDisabled(context);
                  case 'notify':
                    context.read<NotificationsViewModel>().prefillUser(user);
                    context.go('/notifications');
                }
              },
              itemBuilder: (_) => [
                if (!user.isAnonymous)
                  PopupMenuItem(
                    key: const Key('menu_role'),
                    value: 'role',
                    child: Text(user.role == UserRole.admin ? 'Hạ xuống Barista' : 'Cấp quyền Admin'),
                  ),
                PopupMenuItem(
                  key: const Key('menu_disable'),
                  value: 'disable',
                  child: Text(user.disabled ? 'Mở khóa' : 'Khóa tài khoản'),
                ),
                if (!user.disabled) const PopupMenuItem(value: 'notify', child: Text('Gửi thông báo riêng')),
              ],
            ),
        ],
      ),
    );
  }
}
