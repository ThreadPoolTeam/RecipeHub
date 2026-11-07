import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/models/admin_models.dart';
import '../../core/theme/nomad_kit.dart';
import '../../core/viewmodels/dashboard_viewmodel.dart';
import '../../core/viewmodels/incidents_viewmodel.dart';
import '../../core/viewmodels/view_state.dart';
import '../../core/widgets/common.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<DashboardViewModel>();
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        PageHeader(
          overline: 'Tổng quan',
          title: 'Tình trạng hệ thống',
          actions: [
            FilledButton.icon(
              onPressed: () => context.go('/notifications'),
              icon: const Icon(Icons.campaign_outlined),
              label: const Text('Gửi thông báo'),
            ),
            OutlinedButton.icon(
              onPressed: () => context.go('/incidents'),
              icon: const Icon(Icons.report_gmailerrorred_rounded),
              label: const Text('Sự cố đang mở'),
            ),
          ],
        ),
        switch (vm.state) {
          ViewState.loading => const LoadingView(),
          ViewState.error => ErrorView(message: vm.error ?? '', onRetry: vm.retry),
          ViewState.empty => const EmptyView(
            title: 'Chưa có dữ liệu',
            message: 'Khi app mobile có người đăng nhập hoặc có sự cố, số liệu sẽ hiện ở đây.',
            icon: Icons.insights_outlined,
          ),
          ViewState.ready => _Content(vm: vm),
        },
      ],
    );
  }
}

class _Content extends StatelessWidget {
  const _Content({required this.vm});

  final DashboardViewModel vm;

  @override
  Widget build(BuildContext context) {
    final s = vm.summary;
    final cards = [
      StatCard(
        key: const Key('stat_open'),
        label: 'Sự cố đang mở',
        value: '${s.openIncidents}',
        icon: Icons.report_gmailerrorred_rounded,
        color: NomadKit.error,
        hint: 'Tổng ${s.totalIncidents} sự cố',
      ),
      StatCard(
        label: 'Sự cố hôm nay',
        value: '${vm.todayIncidents}',
        icon: Icons.today_rounded,
        color: NomadKit.warning,
      ),
      StatCard(
        label: 'Người dùng',
        value: '${s.totalUsers}',
        icon: Icons.group_outlined,
        color: NomadKit.ocean,
        hint: '${s.adminUsers} admin · ${s.disabledUsers} bị khóa',
      ),
      StatCard(
        label: 'Thông báo đã gửi',
        value: '${s.notificationsSent}',
        icon: Icons.campaign_outlined,
        color: NomadKit.forest,
      ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LayoutBuilder(
          builder: (context, c) {
            final cols = c.maxWidth >= 1000 ? 4 : (c.maxWidth >= 600 ? 2 : 1);
            final w = (c.maxWidth - (cols - 1) * 12) / cols;
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [for (final card in cards) SizedBox(width: w, child: card)],
            );
          },
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Sự cố 7 ngày', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 4),
                const Text(
                  'Crash · Non-fatal · Crashlytics issue',
                  style: TextStyle(color: NomadKit.secondary, fontSize: 12),
                ),
                const SizedBox(height: 16),
                SizedBox(height: 220, child: IncidentBarChart(days: vm.days)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text('Sự cố mới nhất', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              ),
              if (vm.latest.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('Chưa có sự cố.')),
              for (final i in vm.latest)
                ListTile(
                  leading: IncidentKindChip(i.kind),
                  title: Text(i.message, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text('${i.who} · ${i.device} · ${formatShort(i.reportedAt)}'),
                  trailing: IncidentStatusChip(i.status),
                  onTap: () {
                    context.read<IncidentsViewModel>().select(i, fromOutside: true);
                    context.go('/incidents');
                  },
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Biểu đồ cột chồng theo ngày.
class IncidentBarChart extends StatelessWidget {
  const IncidentBarChart({super.key, required this.days});

  final List<DayStats> days;

  @override
  Widget build(BuildContext context) {
    if (days.isEmpty) return const Center(child: Text('Chưa có dữ liệu'));
    final maxY = days.fold<int>(0, (m, d) => d.total > m ? d.total : m);
    return BarChart(
      BarChartData(
        maxY: (maxY < 4 ? 4 : maxY + 1).toDouble(),
        gridData: const FlGridData(drawVerticalLine: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 36,
              interval: maxY <= 8 ? 1 : (maxY / 5).ceilToDouble(),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (v, meta) {
                final i = v.toInt();
                if (i < 0 || i >= days.length) return const SizedBox.shrink();
                final parts = days[i].day.split('-');
                // 30 ngày: chỉ ghi nhãn cách quãng để không chồng chữ ở màn hẹp.
                final step = days.length > 10 ? 5 : 1;
                if (i % step != 0 && i != days.length - 1) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text('${parts[2]}/${parts[1]}', style: const TextStyle(fontSize: 11)),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < days.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: days[i].total.toDouble(),
                  width: 18,
                  borderRadius: BorderRadius.circular(4),
                  rodStackItems: [
                    BarChartRodStackItem(0, days[i].fatal.toDouble(), NomadKit.error),
                    BarChartRodStackItem(
                      days[i].fatal.toDouble(),
                      (days[i].fatal + days[i].nonFatal).toDouble(),
                      NomadKit.ocean,
                    ),
                    BarChartRodStackItem(
                      (days[i].fatal + days[i].nonFatal).toDouble(),
                      days[i].total.toDouble(),
                      NomadKit.warning,
                    ),
                  ],
                ),
              ],
            ),
        ],
      ),
    );
  }
}
