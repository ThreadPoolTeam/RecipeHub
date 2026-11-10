import 'dart:async';

import '../models/admin_models.dart';
import '../services/interfaces/admin_services.dart';
import 'view_state.dart';

/// Tổng quan: số liệu tổng, sự cố 7 ngày, 5 sự cố mới nhất.
///
/// - Mỗi luồng có cờ "đã nhận lần đầu" riêng: chỉ ready/empty khi cả 3 luồng đã có dữ liệu.
/// - Lỗi giữ nguyên tới khi người dùng bấm Thử lại (cập nhật summary sau đó không xóa lỗi).
/// - Tự đăng ký lại lúc 00:00 giờ VN để "hôm nay" và cửa sổ 7 ngày không bị cũ khi để trang mở qua đêm.
class DashboardViewModel extends BaseViewModel {
  DashboardViewModel({required this._incidents, DateTime Function()? clock}) : _clock = clock ?? DateTime.now;

  final IIncidentService _incidents;
  final DateTime Function() _clock;

  ViewState _state = ViewState.loading;
  StatsSummary _summary = const StatsSummary();
  List<DayStats> _days = const [];
  List<Incident> _latest = const [];
  String? _error;
  bool _gotSummary = false, _gotDays = false, _gotLatest = false;
  Timer? _midnight;

  ViewState get state => _state;
  StatsSummary get summary => _summary;
  List<DayStats> get days => _days;
  List<Incident> get latest => _latest;
  String? get error => _error;

  int get todayIncidents => _days.isEmpty ? 0 : _days.last.total;

  void start() {
    _state = ViewState.loading;
    _gotSummary = _gotDays = _gotLatest = false;
    notify();
    track(
      _incidents.watchSummary().listen((s) {
        _summary = s;
        _gotSummary = true;
        _recompute();
      }, onError: _fail),
    );
    track(
      _incidents.watchDays(7).listen((d) {
        _days = d;
        _gotDays = true;
        _recompute();
      }, onError: _fail),
    );
    track(
      _incidents.watchIncidents(const IncidentFilter(statuses: {}, days: 0), limit: 5).listen((l) {
        _latest = l;
        _gotLatest = true;
        _recompute();
      }, onError: _fail),
    );
    _scheduleMidnight();
  }

  void _recompute() {
    if (_state == ViewState.error) return notify();
    if (_gotSummary && _gotDays && _gotLatest) {
      _state = (_summary.isEmpty && _latest.isEmpty) ? ViewState.empty : ViewState.ready;
    }
    notify();
  }

  void _fail(Object e) {
    _state = ViewState.error;
    _error = e is AdminFailure ? e.message : e.toString();
    notify();
  }

  /// Khoảng thời gian tới 00:00 giờ VN kế tiếp.
  static Duration untilVnMidnight(DateTime now) {
    final vn = now.toUtc().add(const Duration(hours: 7));
    final next = DateTime.utc(vn.year, vn.month, vn.day).add(const Duration(days: 1));
    return next.difference(vn) + const Duration(seconds: 2);
  }

  void _scheduleMidnight() {
    _midnight?.cancel();
    _midnight = Timer(untilVnMidnight(_clock()), () {
      if (!isDisposed) retry();
    });
  }

  Future<void> retry() async {
    await cancelAll();
    _error = null;
    start();
  }

  @override
  void dispose() {
    _midnight?.cancel();
    super.dispose();
  }
}
