import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models/admin_models.dart';
import '../../core/theme/nomad_kit.dart';
import '../../core/viewmodels/notifications_viewmodel.dart';
import '../../core/viewmodels/recipes_viewmodel.dart';
import '../../core/viewmodels/users_viewmodel.dart';
import '../../core/viewmodels/view_state.dart';
import '../../core/widgets/common.dart';

/// Soạn thông báo → Cloud Function `sendNotification` → FCM → app mobile. Kèm lịch sử gửi.
class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 2,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: const [
          PageHeader(overline: 'Thông báo', title: 'Gửi thông báo tới app mobile'),
          TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Soạn & gửi'),
              Tab(key: Key('tab_history'), text: 'Lịch sử gửi'),
            ],
          ),
          SizedBox(height: 12),
          Expanded(child: TabBarView(children: [_ComposeTab(), _HistoryTab()])),
        ],
      ),
    ),
  );
}

class _ComposeTab extends StatefulWidget {
  const _ComposeTab();

  @override
  State<_ComposeTab> createState() => _ComposeTabState();
}

class _ComposeTabState extends State<_ComposeTab> {
  late final NotificationsViewModel _vm = context.read<NotificationsViewModel>();
  late final TextEditingController _title = TextEditingController(text: _vm.title);
  late final TextEditingController _body = TextEditingController(text: _vm.body);

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final vm = _vm;
    final who = vm.toAll ? 'tất cả nhân viên' : (vm.targetUser?.label ?? '');
    if (!await confirm(context, title: 'Gửi thông báo?', message: 'Gửi "${vm.title.trim()}" tới $who.', ok: 'Gửi')) {
      return;
    }
    final ok = await vm.send();
    if (!mounted) return;
    if (ok) {
      _title.clear();
      _body.clear();
    }
    final r = vm.lastResult;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ok
              ? (vm.toAll
                    ? 'Đã gửi tới topic all_staff.'
                    : 'Đã gửi: ${r?.successCount ?? 0} thành công, ${r?.failureCount ?? 0} thất bại.')
              : (vm.error ?? 'Gửi thất bại.'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<NotificationsViewModel>();
    final users = context.watch<UsersViewModel>().all.where((u) => !u.disabled).toList();
    final recipes = context.watch<RecipesViewModel>().publishedRecipes;
    // Người nhận bị khóa / món bị ẩn sau khi đã chọn → bỏ chọn, tránh gửi đích không mở được.
    final targetUid = users.any((u) => u.uid == vm.targetUser?.uid) ? vm.targetUser?.uid : null;
    final recipeCode = recipes.any((r) => r.code == vm.recipeCode) ? vm.recipeCode : null;
    if (vm.targetUser != null && targetUid == null || vm.recipeCode != null && recipeCode == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (vm.targetUser != null && targetUid == null) vm.update(clearTarget: true);
        if (vm.recipeCode != null && recipeCode == null) vm.update(clearRecipe: true);
      });
    }
    final form = Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (vm.error != null) InlineError(vm.error!),
            TextField(
              key: const Key('notif_title'),
              controller: _title,
              maxLength: NotificationRequest.maxTitle,
              decoration: const InputDecoration(labelText: 'Tiêu đề'),
              onChanged: (v) => vm.update(title: v),
            ),
            const SizedBox(height: 8),
            TextField(
              key: const Key('notif_body'),
              controller: _body,
              maxLength: NotificationRequest.maxBody,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Nội dung'),
              onChanged: (v) => vm.update(body: v),
            ),
            const SizedBox(height: 8),
            const Text('Gửi tới', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: true, label: Text('Tất cả nhân viên'), icon: Icon(Icons.groups_outlined)),
                ButtonSegment(value: false, label: Text('Một người dùng'), icon: Icon(Icons.person_outline)),
              ],
              selected: {vm.toAll},
              onSelectionChanged: (s) => vm.update(toAll: s.first),
            ),
            if (!vm.toAll) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                key: ValueKey('notif_target_$targetUid'),
                initialValue: targetUid,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Người nhận'),
                items: [
                  for (final u in users)
                    DropdownMenuItem(
                      value: u.uid,
                      child: Text(
                        '${u.label} · ${roleLabel(u.role)}${u.deviceCount == 0 ? ' · chưa có thiết bị' : ''}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: (uid) => vm.update(target: users.firstWhere((u) => u.uid == uid)),
              ),
            ],
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              key: ValueKey('notif_recipe_$recipeCode'),
              initialValue: recipeCode,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Khi chạm thông báo, mở'),
              items: [
                const DropdownMenuItem(value: null, child: Text('Trang Thông báo (không mở món)')),
                for (final r in recipes) DropdownMenuItem(value: r.code, child: Text('${r.code} · ${r.name}')),
              ],
              onChanged: (code) => code == null ? vm.update(clearRecipe: true) : vm.update(recipeCode: code),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 46,
              child: FilledButton.icon(
                key: const Key('notif_send'),
                onPressed: vm.canSend ? _send : null,
                icon: vm.sending
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send_rounded),
                label: const Text('Gửi thông báo'),
              ),
            ),
            if (vm.validationError != null && (vm.title.isNotEmpty || vm.body.isNotEmpty))
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  vm.validationError!,
                  key: const Key('notif_validation'),
                  style: const TextStyle(color: NomadKit.secondary),
                ),
              ),
          ],
        ),
      ),
    );
    final preview = Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Xem trước trên Android', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: const Color(0xFFF1F3F4), borderRadius: BorderRadius.circular(16)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(color: NomadKit.sand, borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.coffee_rounded, size: 16, color: Colors.white),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('RecipeHub · bây giờ', style: TextStyle(fontSize: 11, color: NomadKit.secondary)),
                        Text(
                          vm.title.isEmpty ? 'Tiêu đề thông báo' : vm.title,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(vm.body.isEmpty ? 'Nội dung thông báo' : vm.body),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text('Cách gửi', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text(
              'Web gọi Cloud Function sendNotification (Admin SDK). "Tất cả" gửi tới topic all_staff; '
              '"Một người dùng" gửi tới các FCM token trong users/{uid}/devices. '
              'Payload data {type, target_id} để app mở đúng món.',
              style: TextStyle(color: NomadKit.secondary, height: 1.4),
            ),
          ],
        ),
      ),
    );
    return SingleChildScrollView(
      child: LayoutBuilder(
        builder: (context, c) {
          if (c.maxWidth < 900) return Column(children: [form, const SizedBox(height: 12), preview]);
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 3, child: form),
              const SizedBox(width: 16),
              Expanded(flex: 2, child: preview),
            ],
          );
        },
      ),
    );
  }
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<NotificationsViewModel>();
    final users = {for (final u in context.watch<UsersViewModel>().all) u.uid: u.label};
    return switch (vm.historyState) {
      ViewState.loading => const LoadingView(),
      ViewState.error => EmptyView(
        title: 'Không tải được lịch sử',
        icon: Icons.cloud_off_rounded,
        action: FilledButton.icon(
          onPressed: vm.retryHistory,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('Thử lại'),
        ),
      ),
      ViewState.empty => const EmptyView(title: 'Chưa gửi thông báo nào', icon: Icons.campaign_outlined),
      ViewState.ready => Card(
        child: ListView.separated(
          itemCount: vm.history.length,
          separatorBuilder: (_, _) => const Divider(),
          itemBuilder: (_, i) {
            final n = vm.history[i];
            final ok = n.failureCount == 0;
            return ListTile(
              leading: Icon(
                ok ? Icons.check_circle_rounded : Icons.error_rounded,
                color: ok ? NomadKit.forest : NomadKit.error,
              ),
              title: Text(n.title, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(
                '${n.body}\n${formatDateTime(n.sentAt)} · ${n.sentBy ?? ''} · '
                '${n.target == 'all' ? 'Tất cả' : (users[n.targetUid] ?? n.targetUid ?? '')}'
                '${n.recipeCode == null ? '' : ' · mở ${n.recipeCode}'}',
              ),
              isThreeLine: true,
              trailing: Text('${n.successCount} ✓  ${n.failureCount} ✗'),
            );
          },
        ),
      ),
    };
  }
}
