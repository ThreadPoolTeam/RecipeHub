import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../models/admin_models.dart';
import '../theme/nomad_kit.dart';
import '../viewmodels/admin_auth_viewmodel.dart';
import '../viewmodels/dashboard_viewmodel.dart';
import '../viewmodels/incidents_viewmodel.dart';

class _NavItem {
  const _NavItem(this.path, this.label, this.icon);
  final String path;
  final String label;
  final IconData icon;
}

const _items = [
  _NavItem('/', 'Tổng quan', Icons.space_dashboard_outlined),
  _NavItem('/incidents', 'Sự cố', Icons.report_gmailerrorred_rounded),
  _NavItem('/notifications', 'Thông báo', Icons.campaign_outlined),
  _NavItem('/users', 'Người dùng', Icons.group_outlined),
  _NavItem('/recipes', 'Món', Icons.local_cafe_outlined),
];

/// Khung web Admin: sidebar (≥ 900 px) hoặc drawer, header, banner sự cố mới toàn cục.
class AdminScaffold extends StatelessWidget {
  const AdminScaffold({super.key, required this.location, required this.child});

  final String location;
  final Widget child;

  int get _index {
    for (var i = _items.length - 1; i >= 0; i--) {
      if (_items[i].path != '/' && location.startsWith(_items[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final open = context.select<DashboardViewModel, int>((vm) => vm.summary.openIncidents);
    final nav = _SideNav(
      selected: _index,
      openIncidents: open,
      onSelect: (i) {
        if (!wide) Navigator.of(context).maybePop();
        context.go(_items[i].path);
      },
    );
    return Scaffold(
      key: const Key('admin_scaffold'),
      appBar: wide
          ? null
          : AppBar(
              backgroundColor: NomadKit.surface,
              title: Text(_items[_index].label),
              actions: const [_AccountMenu()],
            ),
      drawer: wide ? null : Drawer(key: const Key('admin_drawer'), child: nav),
      body: Row(
        children: [
          if (wide) SizedBox(width: 240, child: nav),
          if (wide) const VerticalDivider(width: 1),
          Expanded(
            child: Column(
              children: [
                if (wide)
                  Container(
                    height: 56,
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    alignment: Alignment.centerRight,
                    decoration: const BoxDecoration(
                      color: NomadKit.surface,
                      border: Border(bottom: BorderSide(color: NomadKit.border)),
                    ),
                    child: const _AccountMenu(),
                  ),
                const _NewIncidentBanner(),
                Expanded(child: child),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SideNav extends StatelessWidget {
  const _SideNav({required this.selected, required this.openIncidents, required this.onSelect});

  final int selected;
  final int openIncidents;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) => Material(
    color: NomadKit.surface,
    child: SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: NomadKit.sand, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.coffee_rounded, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'RecipeHub',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: NomadKit.ink),
                      ),
                      Text('Admin', style: TextStyle(color: NomadKit.secondary, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          for (var i = 0; i < _items.length; i++)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
              child: ListTile(
                key: Key('nav_${_items[i].path}'),
                dense: true,
                selected: i == selected,
                selectedTileColor: NomadKit.sandLight,
                selectedColor: NomadKit.sandDark,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                leading: Icon(_items[i].icon),
                title: Text(_items[i].label, style: const TextStyle(fontWeight: FontWeight.w600)),
                trailing: i == 1 && openIncidents > 0
                    ? Badge(
                        key: const Key('nav_incident_badge'),
                        label: Text('$openIncidents'),
                        backgroundColor: NomadKit.error,
                      )
                    : null,
                onTap: () => onSelect(i),
              ),
            ),
          const Spacer(),
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Firebase · recipehub-mobile', style: TextStyle(color: NomadKit.secondary, fontSize: 11)),
          ),
        ],
      ),
    ),
  );
}

class _AccountMenu extends StatelessWidget {
  const _AccountMenu();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AdminAuthViewModel>();
    final email = auth.identity?.email ?? '';
    return PopupMenuButton<String>(
      tooltip: 'Tài khoản',
      onSelected: (v) {
        if (v == 'logout') auth.signOut();
      },
      itemBuilder: (_) => [
        PopupMenuItem(enabled: false, child: Text(email)),
        const PopupMenuItem(value: 'logout', child: Text('Đăng xuất')),
      ],
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircleAvatar(
            radius: 14,
            backgroundColor: NomadKit.sandLight,
            child: Icon(Icons.person, size: 16, color: NomadKit.sandDark),
          ),
          const SizedBox(width: 8),
          Text(
            email,
            style: const TextStyle(color: NomadKit.ink, fontWeight: FontWeight.w600),
          ),
          const Icon(Icons.expand_more_rounded, color: NomadKit.secondary),
        ],
      ),
    );
  }
}

/// Sự cố mới tới (real-time) → banner đỏ trên mọi trang.
class _NewIncidentBanner extends StatelessWidget {
  const _NewIncidentBanner();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<IncidentsViewModel>();
    final a = vm.alert;
    if (a == null) return const SizedBox.shrink();
    return Material(
      key: const Key('new_incident_banner'),
      color: NomadKit.error,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Row(
          children: [
            const Icon(Icons.notification_important_rounded, color: Colors.white),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Sự cố mới (${incidentKindLabel(a.kind)}) từ ${a.who}${a.deviceModel == null ? '' : ' – ${a.deviceModel}'}: ${a.message}',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            TextButton(
              onPressed: () {
                vm.select(a, fromOutside: true);
                context.go('/incidents');
              },
              child: const Text(
                'Xem',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
              ),
            ),
            IconButton(
              tooltip: 'Ẩn',
              onPressed: vm.dismissAlert,
              icon: const Icon(Icons.close_rounded, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
