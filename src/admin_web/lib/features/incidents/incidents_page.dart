import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/models/admin_models.dart';
import '../../core/theme/nomad_kit.dart';
import '../../core/viewmodels/incidents_viewmodel.dart';
import '../../core/viewmodels/view_state.dart';
import '../../core/widgets/common.dart';
import '../dashboard/dashboard_page.dart';

class IncidentsPage extends StatelessWidget {
  const IncidentsPage({super.key});

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 2,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHeader(
            overline: 'Sự cố',
            title: 'Crash & lỗi từ app mobile',
            actions: [
              Consumer<IncidentsViewModel>(
                builder: (_, vm, _) => FilterChip(
                  key: const Key('sound_toggle'),
                  avatar: Icon(vm.soundOn ? Icons.volume_up_rounded : Icons.volume_off_rounded, size: 18),
                  label: const Text('Âm báo'),
                  selected: vm.soundOn,
                  onSelected: (v) {
                    vm.soundOn = v;
                    vm.notify();
                  },
                ),
              ),
            ],
          ),
          const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Danh sách (real-time)'),
              Tab(key: Key('tab_stats'), text: 'Thống kê'),
            ],
          ),
          const SizedBox(height: 12),
          const Expanded(child: TabBarView(children: [_ListTab(), _StatsTab()])),
        ],
      ),
    ),
  );
}

class _ListTab extends StatelessWidget {
  const _ListTab();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<IncidentsViewModel>();
    final wide = MediaQuery.sizeOf(context).width >= 1200;
    // Mở từ banner / Tổng quan trên màn hẹp: chi tiết chỉ có dạng hộp thoại → tự mở.
    if (!wide && vm.selected != null && vm.takeOpenDetailRequest()) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) _openDetailDialog(context);
      });
    }
    final list = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Filters(vm: vm),
        const SizedBox(height: 12),
        Expanded(
          child: switch (vm.state) {
            ViewState.loading => const LoadingView(message: 'Đang nghe sự cố từ Firestore...'),
            ViewState.error => ErrorView(message: vm.error ?? '', onRetry: vm.retry),
            ViewState.empty => const EmptyView(
              title: 'Không có sự cố nào khớp bộ lọc',
              message: 'Sự cố mới từ app sẽ tự hiện ở đây (không cần tải lại trang).',
              icon: Icons.verified_outlined,
            ),
            ViewState.ready => Card(
              child: ListView.separated(
                key: const Key('incident_list'),
                itemCount: vm.items.length + (vm.canLoadMore || vm.loadingMore ? 1 : 0),
                separatorBuilder: (_, _) => const Divider(),
                itemBuilder: (context, idx) {
                  if (idx == vm.items.length) {
                    return vm.loadingMore
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: Center(child: CircularProgressIndicator()),
                          )
                        : TextButton(
                            key: const Key('load_more'),
                            onPressed: vm.loadMore,
                            child: const Text('Tải thêm'),
                          );
                  }
                  final i = vm.items[idx];
                  return ListTile(
                    key: Key('incident_${i.id}'),
                    selected: vm.selected?.id == i.id,
                    selectedTileColor: NomadKit.sandLight,
                    leading: IncidentKindChip(i.kind),
                    title: Text(
                      '${i.errorType ?? ''}${i.errorType == null ? '' : ': '}${i.message}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      '${formatDateTime(i.reportedAt)} · ${i.who} · ${i.device.isEmpty ? '—' : i.device} · v${i.appVersion ?? '?'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: IncidentStatusChip(i.status),
                    onTap: () {
                      vm.select(i);
                      if (!wide) _openDetailDialog(context);
                    },
                  );
                },
              ),
            ),
          },
        ),
      ],
    );
    if (!wide) return list;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(flex: 3, child: list),
        const SizedBox(width: 16),
        SizedBox(
          width: 420,
          child: vm.selected == null
              ? const Card(
                  child: EmptyView(
                    title: 'Chọn một sự cố',
                    message: 'để xem chi tiết và xử lý',
                    icon: Icons.touch_app_outlined,
                  ),
                )
              : SingleChildScrollView(child: IncidentDetailPanel(incident: vm.selected!)),
        ),
      ],
    );
  }

  void _openDetailDialog(BuildContext context) {
    final vm = context.read<IncidentsViewModel>();
    showDialog(
      context: context,
      builder: (_) => ChangeNotifierProvider.value(
        value: vm,
        child: Dialog(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520, maxHeight: 720),
            child: Consumer<IncidentsViewModel>(
              builder: (_, vm, _) => vm.selected == null
                  ? const SizedBox.shrink()
                  : SingleChildScrollView(child: IncidentDetailPanel(incident: vm.selected!)),
            ),
          ),
        ),
      ),
    );
  }
}

class _Filters extends StatelessWidget {
  const _Filters({required this.vm});

  final IncidentsViewModel vm;

  @override
  Widget build(BuildContext context) {
    final f = vm.filter;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final s in IncidentStatus.values)
          FilterChip(
            key: Key('filter_status_${s.name}'),
            label: Text(incidentStatusLabel(s)),
            selected: f.statuses.contains(s),
            onSelected: (on) {
              final next = {...f.statuses};
              on ? next.add(s) : next.remove(s);
              vm.setFilter(f.copyWith(statuses: next));
            },
          ),
        const SizedBox(width: 8),
        DropdownButton<IncidentKind?>(
          value: f.kind,
          hint: const Text('Mọi loại'),
          items: [
            const DropdownMenuItem(value: null, child: Text('Mọi loại')),
            for (final k in IncidentKind.values) DropdownMenuItem(value: k, child: Text(incidentKindLabel(k))),
          ],
          onChanged: (k) => vm.setFilter(k == null ? f.copyWith(clearKind: true) : f.copyWith(kind: k)),
        ),
        DropdownButton<int>(
          value: f.days,
          items: const [
            DropdownMenuItem(value: 1, child: Text('Hôm nay')),
            DropdownMenuItem(value: 7, child: Text('7 ngày')),
            DropdownMenuItem(value: 30, child: Text('30 ngày')),
            DropdownMenuItem(value: 0, child: Text('Tất cả')),
          ],
          onChanged: (d) => vm.setFilter(f.copyWith(days: d)),
        ),
      ],
    );
  }
}

/// Chi tiết + xử lý một sự cố.
class IncidentDetailPanel extends StatefulWidget {
  const IncidentDetailPanel({super.key, required this.incident});

  final Incident incident;

  @override
  State<IncidentDetailPanel> createState() => _IncidentDetailPanelState();
}

class _IncidentDetailPanelState extends State<IncidentDetailPanel> {
  late final TextEditingController _note = TextEditingController(text: widget.incident.note ?? '');
  Stream<List<Incident>>? _others;
  String? _othersUid;

  /// Giữ một luồng cho mỗi người dùng; tạo lại mỗi lần build sẽ hủy/đăng ký Firestore liên tục.
  Stream<List<Incident>> _otherStream(IncidentsViewModel vm, String uid) {
    if (_others == null || _othersUid != uid) {
      _othersUid = uid;
      _others = vm.otherIncidentsOf(uid);
    }
    return _others!;
  }

  @override
  void didUpdateWidget(covariant IncidentDetailPanel old) {
    super.didUpdateWidget(old);
    if (old.incident.id != widget.incident.id) _note.text = widget.incident.note ?? '';
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Widget _row(String k, String? v) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(k, style: const TextStyle(color: NomadKit.secondary)),
        ),
        Expanded(child: SelectableText(v == null || v.isEmpty ? '—' : v)),
      ],
    ),
  );

  Future<void> _set(IncidentStatus s) async {
    final vm = context.read<IncidentsViewModel>();
    final ok = await vm.updateStatus(widget.incident, s, note: _note.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok ? 'Đã chuyển sang "${incidentStatusLabel(s)}".' : (vm.actionError ?? 'Không lưu được.')),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final i = widget.incident;
    final vm = context.watch<IncidentsViewModel>();
    return Card(
      key: const Key('incident_detail'),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [IncidentKindChip(i.kind), const SizedBox(width: 8), IncidentStatusChip(i.status)]),
            const SizedBox(height: 12),
            SelectableText(
              '${i.errorType ?? 'Lỗi'}: ${i.message}',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            const SizedBox(height: 12),
            _row('Người dùng', i.who),
            _row('Thiết bị', i.device),
            _row('Phiên bản app', [i.appVersion, i.buildNumber].whereType<String>().join(' + ')),
            _row('Màn hình', i.screen),
            _row('Nguồn', i.source),
            _row('Xảy ra lúc', formatDateTime(i.occurredAt)),
            _row('Ghi nhận lúc', formatDateTime(i.reportedAt)),
            if (i.crashlyticsIssueId != null) _row('Crashlytics issue', i.crashlyticsIssueId),
            if (i.handledBy != null) _row('Xử lý bởi', '${i.handledBy} · ${formatDateTime(i.handledAt)}'),
            if (i.stackTop != null && i.stackTop!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Text('Stack trace', style: TextStyle(fontWeight: FontWeight.w700)),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => Clipboard.setData(ClipboardData(text: i.stackTop!)),
                    icon: const Icon(Icons.copy_rounded, size: 16),
                    label: const Text('Sao chép'),
                  ),
                ],
              ),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: NomadKit.sandLight, borderRadius: BorderRadius.circular(8)),
                child: SelectableText(i.stackTop!, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
              ),
            ],
            const SizedBox(height: 12),
            if (vm.actionError != null) InlineError(vm.actionError!),
            TextField(
              key: const Key('incident_note'),
              controller: _note,
              maxLength: 500,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Ghi chú xử lý'),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.tonal(
                  key: const Key('action_ack'),
                  onPressed: vm.saving ? null : () => _set(IncidentStatus.acknowledged),
                  child: const Text('Xác nhận'),
                ),
                FilledButton(
                  key: const Key('action_resolve'),
                  style: FilledButton.styleFrom(backgroundColor: NomadKit.forest),
                  onPressed: vm.saving ? null : () => _set(IncidentStatus.resolved),
                  child: const Text('Đã xử lý'),
                ),
                OutlinedButton(
                  key: const Key('action_dismiss'),
                  onPressed: vm.saving ? null : () => _set(IncidentStatus.dismissed),
                  child: const Text('Bỏ qua'),
                ),
                if (i.status != IncidentStatus.open)
                  TextButton(
                    key: const Key('action_reopen'),
                    onPressed: vm.saving ? null : () => _set(IncidentStatus.open),
                    child: const Text('Mở lại'),
                  ),
              ],
            ),
            if (i.uid != null) ...[
              const SizedBox(height: 16),
              const Text('Sự cố khác của người này', style: TextStyle(fontWeight: FontWeight.w700)),
              StreamBuilder<List<Incident>>(
                stream: _otherStream(vm, i.uid!),
                builder: (_, snap) {
                  final others = (snap.data ?? const <Incident>[]).where((o) => o.id != i.id).toList();
                  if (others.isEmpty) return const Padding(padding: EdgeInsets.only(top: 6), child: Text('Không có.'));
                  return Column(
                    children: [
                      for (final o in others.take(5))
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(o.message, maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Text(formatShort(o.reportedAt)),
                          trailing: IncidentStatusChip(o.status),
                          onTap: () => vm.select(o),
                        ),
                    ],
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatsTab extends StatelessWidget {
  const _StatsTab();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<IncidentsViewModel>();
    final total = vm.statsTotal;
    Widget bars(String title, List<MapEntry<String, int>> data) => Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            if (data.isEmpty) const Text('Chưa có dữ liệu'),
            for (final e in data)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    SizedBox(width: 140, child: Text(e.key, overflow: TextOverflow.ellipsis)),
                    Expanded(
                      child: LinearProgressIndicator(
                        value: total == 0 ? 0 : e.value / total,
                        minHeight: 10,
                        borderRadius: BorderRadius.circular(6),
                        color: NomadKit.sand,
                        backgroundColor: NomadKit.sandLight,
                      ),
                    ),
                    SizedBox(width: 40, child: Text(' ${e.value}', textAlign: TextAlign.end)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
    return ListView(
      key: const Key('stats_tab'),
      children: [
        Wrap(
          spacing: 8,
          children: [
            for (final d in const [7, 30])
              ChoiceChip(label: Text('$d ngày'), selected: vm.statsRange == d, onSelected: (_) => vm.setStatsRange(d)),
          ],
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, c) {
            final cols = c.maxWidth >= 900 ? 4 : 2;
            final w = (c.maxWidth - (cols - 1) * 12) / cols;
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                SizedBox(
                  width: w,
                  child: StatCard(label: 'Tổng sự cố', value: '$total', icon: Icons.summarize_outlined),
                ),
                SizedBox(
                  width: w,
                  child: StatCard(
                    label: 'Crash',
                    value: '${vm.statsFatal}',
                    icon: Icons.bolt_rounded,
                    color: NomadKit.error,
                  ),
                ),
                SizedBox(
                  width: w,
                  child: StatCard(
                    label: 'Non-fatal',
                    value: '${vm.statsNonFatal}',
                    icon: Icons.warning_amber_rounded,
                    color: NomadKit.ocean,
                  ),
                ),
                SizedBox(
                  width: w,
                  child: StatCard(
                    label: 'Crashlytics issue',
                    value: '${vm.statsCrashlytics}',
                    icon: Icons.bug_report_outlined,
                    color: NomadKit.warning,
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Theo ngày', style: TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                SizedBox(height: 220, child: IncidentBarChart(days: vm.statsDays)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, c) {
            final two = c.maxWidth >= 900;
            final a = bars('Theo phiên bản app', vm.topVersions);
            final b = bars('Theo model máy', vm.topModels);
            final pie = Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  height: 180,
                  child: total == 0
                      ? const Center(child: Text('Chưa có dữ liệu'))
                      : PieChart(
                          PieChartData(
                            sectionsSpace: 2,
                            centerSpaceRadius: 36,
                            sections: [
                              if (vm.statsFatal > 0)
                                PieChartSectionData(
                                  value: vm.statsFatal.toDouble(),
                                  color: NomadKit.error,
                                  title: 'Crash',
                                  radius: 50,
                                  titleStyle: const TextStyle(color: Colors.white, fontSize: 11),
                                ),
                              if (vm.statsNonFatal > 0)
                                PieChartSectionData(
                                  value: vm.statsNonFatal.toDouble(),
                                  color: NomadKit.ocean,
                                  title: 'Non-fatal',
                                  radius: 50,
                                  titleStyle: const TextStyle(color: Colors.white, fontSize: 11),
                                ),
                              if (vm.statsCrashlytics > 0)
                                PieChartSectionData(
                                  value: vm.statsCrashlytics.toDouble(),
                                  color: NomadKit.warning,
                                  title: 'Issue',
                                  radius: 50,
                                  titleStyle: const TextStyle(color: Colors.white, fontSize: 11),
                                ),
                            ],
                          ),
                        ),
                ),
              ),
            );
            if (!two) return Column(children: [pie, const SizedBox(height: 12), a, const SizedBox(height: 12), b]);
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: pie),
                const SizedBox(width: 12),
                Expanded(child: a),
                const SizedBox(width: 12),
                Expanded(child: b),
              ],
            );
          },
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}
