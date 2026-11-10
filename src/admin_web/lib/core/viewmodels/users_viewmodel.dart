import '../models/admin_models.dart';
import '../services/interfaces/admin_services.dart';
import 'view_state.dart';

/// Quản lý người dùng: tìm kiếm, lọc, đổi vai trò, khóa / mở khóa.
class UsersViewModel extends BaseViewModel {
  UsersViewModel({required this._service, required this.selfUid});

  final IUserAdminService _service;

  /// Admin đang đăng nhập – không được thao tác lên chính mình.
  final String selfUid;

  ViewState _state = ViewState.loading;
  List<AdminUser> _all = const [];
  String _query = '';
  UserRole? _roleFilter;
  bool? _disabledFilter;
  String? _busyUid;
  String? _error;
  String? _actionError;

  ViewState get state => _state;
  String get query => _query;
  UserRole? get roleFilter => _roleFilter;
  bool? get disabledFilter => _disabledFilter;
  String? get busyUid => _busyUid;
  String? get error => _error;
  String? get actionError => _actionError;
  List<AdminUser> get all => _all;

  List<AdminUser> get users {
    final q = _query.trim().toLowerCase();
    return _all.where((u) {
      if (_roleFilter != null && u.role != _roleFilter) return false;
      if (_disabledFilter != null && u.disabled != _disabledFilter) return false;
      if (q.isEmpty) return true;
      return (u.email ?? '').toLowerCase().contains(q) || (u.displayName ?? '').toLowerCase().contains(q);
    }).toList();
  }

  bool canManage(AdminUser u) => u.uid != selfUid;

  void start() {
    track(
      _service.watchUsers().listen(
        (list) {
          _all = list;
          _state = list.isEmpty ? ViewState.empty : ViewState.ready;
          notify();
        },
        onError: (Object e) {
          _state = ViewState.error;
          _error = e.toString();
          notify();
        },
      ),
    );
  }

  Future<void> retry() async {
    await cancelAll();
    _state = ViewState.loading;
    notify();
    start();
  }

  void setQuery(String q) {
    _query = q;
    notify();
  }

  void setRoleFilter(UserRole? r) {
    _roleFilter = r;
    notify();
  }

  void setDisabledFilter(bool? d) {
    _disabledFilter = d;
    notify();
  }

  Future<List<DeviceInfo>> devicesOf(String uid) => _service.devicesOf(uid);

  Future<bool> _run(AdminUser u, Future<void> Function() action) async {
    if (!canManage(u)) {
      _actionError = 'Không thể thao tác trên tài khoản của chính mình.';
      notify();
      return false;
    }
    _busyUid = u.uid;
    _actionError = null;
    notify();
    try {
      await action();
      return true;
    } on AdminFailure catch (f) {
      _actionError = f.message;
      return false;
    } catch (e) {
      _actionError = e.toString();
      return false;
    } finally {
      _busyUid = null;
      notify();
    }
  }

  Future<bool> setRole(AdminUser u, UserRole role) => _run(u, () => _service.setRole(u.uid, role));

  Future<bool> setDisabled(AdminUser u, bool disabled) => _run(u, () => _service.setDisabled(u.uid, disabled));
}
