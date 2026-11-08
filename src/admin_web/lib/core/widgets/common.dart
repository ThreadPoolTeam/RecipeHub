import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/admin_models.dart';
import '../theme/nomad_kit.dart';

final DateFormat _dt = DateFormat('dd/MM/yyyy HH:mm:ss');
final DateFormat _d = DateFormat('dd/MM HH:mm');

String formatDateTime(DateTime? t) => t == null ? '—' : _dt.format(t.toLocal());
String formatShort(DateTime? t) => t == null ? '—' : _d.format(t.toLocal());

/// Tiêu đề trang: nhãn nhỏ + tiêu đề lớn + hành động bên phải.
class PageHeader extends StatelessWidget {
  const PageHeader({super.key, required this.overline, required this.title, this.actions = const []});

  final String overline;
  final String title;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.end,
      runSpacing: 12,
      spacing: 12,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              overline.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: NomadKit.sandDark,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: NomadKit.ink),
            ),
          ],
        ),
        if (actions.isNotEmpty) Wrap(spacing: 8, runSpacing: 8, children: actions),
      ],
    ),
  );
}

class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.color = NomadKit.sandDark,
    this.hint,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? hint;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: NomadKit.secondary, fontSize: 13)),
                Text(
                  value,
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: NomadKit.ink),
                ),
                if (hint != null)
                  Text(
                    hint!,
                    style: const TextStyle(color: NomadKit.secondary, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class Pill extends StatelessWidget {
  const Pill({super.key, required this.label, required this.fg, required this.bg, this.icon});

  final String label;
  final Color fg;
  final Color bg;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[Icon(icon, size: 14, color: fg), const SizedBox(width: 4)],
        Text(
          label,
          style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );
}

class IncidentStatusChip extends StatelessWidget {
  const IncidentStatusChip(this.status, {super.key});

  final IncidentStatus status;

  @override
  Widget build(BuildContext context) => switch (status) {
    IncidentStatus.open => Pill(label: incidentStatusLabel(status), fg: NomadKit.error, bg: NomadKit.errorLight),
    IncidentStatus.acknowledged => Pill(
      label: incidentStatusLabel(status),
      fg: const Color(0xFF854D0E),
      bg: NomadKit.warningLight,
    ),
    IncidentStatus.resolved => Pill(label: incidentStatusLabel(status), fg: NomadKit.forest, bg: NomadKit.forestLight),
    IncidentStatus.dismissed => Pill(
      label: incidentStatusLabel(status),
      fg: NomadKit.secondary,
      bg: NomadKit.sandLight,
    ),
  };
}

class IncidentKindChip extends StatelessWidget {
  const IncidentKindChip(this.kind, {super.key});

  final IncidentKind kind;

  @override
  Widget build(BuildContext context) => switch (kind) {
    IncidentKind.fatal => Pill(
      label: incidentKindLabel(kind),
      fg: Colors.white,
      bg: NomadKit.error,
      icon: Icons.bolt_rounded,
    ),
    IncidentKind.nonFatal => Pill(label: incidentKindLabel(kind), fg: NomadKit.ocean, bg: NomadKit.oceanLight),
    IncidentKind.crashlyticsIssue => Pill(
      label: incidentKindLabel(kind),
      fg: const Color(0xFF854D0E),
      bg: NomadKit.warningLight,
    ),
  };
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message = 'Đang tải...'});

  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: NomadKit.secondary)),
        ],
      ),
    ),
  );
}

class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.title, this.message, this.icon = Icons.inbox_outlined, this.action});

  final String title;
  final String? message;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 44, color: NomadKit.sand),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: NomadKit.ink),
          ),
          if (message != null) ...[
            const SizedBox(height: 6),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: NomadKit.secondary),
            ),
          ],
          if (action != null) ...[const SizedBox(height: 16), action!],
        ],
      ),
    ),
  );
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => EmptyView(
    title: 'Không tải được dữ liệu',
    message: message,
    icon: Icons.cloud_off_rounded,
    action: FilledButton.icon(
      onPressed: onRetry,
      icon: const Icon(Icons.refresh_rounded),
      label: const Text('Thử lại'),
    ),
  );
}

/// Banner lỗi thao tác (ghi/gọi Function) trong trang.
class InlineError extends StatelessWidget {
  const InlineError(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: NomadKit.errorLight, borderRadius: BorderRadius.circular(10)),
    child: Row(
      children: [
        const Icon(Icons.error_outline_rounded, color: NomadKit.error),
        const SizedBox(width: 8),
        Expanded(
          child: Text(message, style: const TextStyle(color: NomadKit.error)),
        ),
      ],
    ),
  );
}

Future<bool> confirm(
  BuildContext context, {
  required String title,
  required String message,
  String ok = 'Xác nhận',
  bool danger = false,
}) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
        FilledButton(
          style: danger ? FilledButton.styleFrom(backgroundColor: NomadKit.error) : null,
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(ok),
        ),
      ],
    ),
  );
  return r == true;
}
