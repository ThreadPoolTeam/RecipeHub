import 'dart:async';

import '../models/admin_models.dart';
import '../services/interfaces/admin_services.dart';
import 'view_state.dart';

/// Sự cố real-time: danh sách theo bộ lọc, cảnh báo sự cố mới, xử lý trạng thái, thống kê.
///
/// Cảnh báo dùng luồng RIÊNG (`watchSince(thời điểm mở trang)`), không phụ thuộc bộ lọc / giới hạn
/// danh sách: sự cố cũ trượt vào cửa sổ 50 bản ghi hay được "Mở lại" không bị coi là mới.
class IncidentsViewModel extends BaseViewModel {
  IncidentsViewModel({required this._service, this.onNewIncident, this.adminEmail, DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final IIncidentService _service;
  final DateTime Function() _clock;

  /// Gọi khi có sự cố mới (phát âm báo trên web).
  final void Function(Incident incident)? onNewIncident;

  /// Email Admin đang đăng nhập – hiển thị "Xử lý bởi" ngay sau khi đổi trạng thái.
  final String? adminEmail;

  ViewState _state = ViewState.loading;
  IncidentFilter _filter = const IncidentFilter();
  List<Incident> _items = const [];
  Incident? _alert;
  Incident? _selected;
  bool _openDetailRequested = false;
  String? _error;
  String? _actionError;
  bool _saving = false;
  bool _loadingMore = false;
  int _limit = 50;
  bool soundOn = true;

  StreamSubscription<List<Incident>>? _listSub;
  StreamSubscription<List<Incident>>? _alertSub;
  StreamSubscription<List<DayStats>>? _statsSub;
  final Set<String> _alerted = {};
  List<DayStats> _statsDays = const [];
  int _statsRange = 7;
  String? _statsError;

  ViewState get state => _state;
  IncidentFilter get filter => _filter;
  List<Incident> get items => _items;
  Incident? get alert => _alert;
  Incident? get selected => _selected;
  String? get error => _error;
  String? get actionError => _actionError;
  bool get saving => _saving;
  bool get loadingMore => _loadingMore;
  List<DayStats> get statsDays => _statsDays;
  int get statsRange => _statsRange;
  String? get statsError => _statsError;
  bool get canLoadMore => _items.length >= _limit && !_loadingMore;

  void start() {
    _subscribeList();
    _subscribeAlerts();
    _subscribeStats();
  }

  void _subscribeList() {
    _listSub?.cancel();
    if (_items.isEmpty) _state = ViewState.loading;
    notify();
    _listSub = _service
        .watchIncidents(_filter, limit: _limit)
        .listen(
          (list) {
            _items = list;
            _loadingMore = false;
            final sel = _selected;
            if (sel != null) {
              _selected = list.where((i) => i.id == sel.id).firstOrNull ?? sel;
            }
            _state = list.isEmpty ? ViewState.empty : ViewState.ready;
            _error = null;
            notify();
          },
          onError: (Object e) {
            _loadingMore = false;
            _state = ViewState.error;
            _error = e.toString();
            notify();
          },
        );
  }

  void _subscribeAlerts() {
    _alertSub?.cancel();
    final since = _clock();
    _alertSub = _service.watchSince(since).listen((recent) {
      final fresh = recent.where((i) => _alerted.add(i.id)).toList();
      if (fresh.isEmpty) return;
      _alert = fresh.first;
      if (soundOn) onNewIncident?.call(fresh.first);
      notify();
    }, onError: (_) {});
  }

  void _subscribeStats() {
    _statsSub?.cancel();
    _statsSub = _service
        .watchDays(_statsRange)
        .listen(
          (d) {
            _statsDays = d;
            _statsError = null;
            notify();
          },
          onError: (Object e) {
            _statsError = e.toString();
            notify();
          },
        );
  }

  Future<void> setFilter(IncidentFilter f) async {
    // Bỏ chọn hết trạng thái = không hiển thị gì → không cho, giữ ít nhất một.
    if (f.statuses.isEmpty) return;
    _filter = f;
    _limit = 50;
    _items = const [];
    _subscribeList();
  }

  Future<void> loadMore() async {
    if (_loadingMore) return;
    _loadingMore = true;
    _limit += 50;
    _subscribeList();
  }

  Future<void> setStatsRange(int days) async {
    if (days == _statsRange) return;
    _statsRange = days;
    _subscribeStats();
  }

  Future<void> retry() async {
    _subscribeList();
    _subscribeStats();
  }

  void dismissAlert() {
    _alert = null;
    notify();
  }

  /// [fromOutside]: mở từ banner / Tổng quan → màn hẹp tự bật hộp thoại chi tiết.
  void select(Incident? i, {bool fromOutside = false}) {
    _selected = i;
    _actionError = null;
    _openDetailRequested = fromOutside && i != null;
    if (i != null && _alert?.id == i.id) _alert = null;
    notify();
  }

  /// Trang Sự cố gọi khi hiển thị: true nếu cần mở hộp thoại chi tiết (màn hẹp).
  bool takeOpenDetailRequest() {
    final r = _openDetailRequested;
    _openDetailRequested = false;
    return r;
  }

  Stream<List<Incident>> otherIncidentsOf(String uid) => _service.watchByUser(uid);

  Future<bool> updateStatus(Incident i, IncidentStatus status, {String? note}) async {
    if (_saving) return false;
    _saving = true;
    _actionError = null;
    notify();
    try {
      await _service.updateStatus(i.id, status, note: note);
      if (_selected?.id == i.id) {
        final trimmed = note?.trim();
        final empty = trimmed == null || trimmed.isEmpty;
        _selected = i.copyWith(
          status: status,
          note: empty ? null : trimmed,
          clearNote: empty,
          handledBy: adminEmail,
          handledAt: DateTime.now(),
        );
      }
      return true;
    } on AdminFailure catch (f) {
      _actionError = f.message;
      return false;
    } catch (e) {
      _actionError = e.toString();
      return false;
    } finally {
      _saving = false;
      notify();
    }
  }

  // ---------- thống kê ----------
  int get statsTotal => _statsDays.fold(0, (a, d) => a + d.total);
  int get statsFatal => _statsDays.fold(0, (a, d) => a + d.fatal);
  int get statsNonFatal => _statsDays.fold(0, (a, d) => a + d.nonFatal);
  int get statsCrashlytics => _statsDays.fold(0, (a, d) => a + d.crashlytics);

  List<MapEntry<String, int>> _top(Map<String, int> Function(DayStats) pick, int n) {
    final acc = <String, int>{};
    for (final d in _statsDays) {
      pick(d).forEach((k, v) => acc[k] = (acc[k] ?? 0) + v);
    }
    final list = acc.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return list.take(n).toList();
  }

  /// Function lưu "1,0,0" (khóa map không chứa được dấu chấm); bản cũ dùng "1_0_0". Hiển thị "1.0.0".
  static String displayVersion(String key) {
    if (key.contains(',')) return key.replaceAll(',', '.');
    if (RegExp(r'^\d+(_\d+)+(\+\d+)?$').hasMatch(key)) return key.replaceAll('_', '.');
    return key;
  }

  List<MapEntry<String, int>> get topVersions =>
      _top((d) => d.byVersion, 5).map((e) => MapEntry(displayVersion(e.key), e.value)).toList();
  List<MapEntry<String, int>> get topModels => _top((d) => d.byModel, 5);

  @override
  void dispose() {
    _listSub?.cancel();
    _alertSub?.cancel();
    _statsSub?.cancel();
    super.dispose();
  }
}
