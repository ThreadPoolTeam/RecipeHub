import '../models/admin_models.dart';
import '../services/interfaces/admin_services.dart';
import 'view_state.dart';

enum AdminAuthStatus { unknown, signedOut, forbidden, admin }

/// Phiên đăng nhập web: chỉ tài khoản có claim `role=admin` vào được.
class AdminAuthViewModel extends BaseViewModel {
  AdminAuthViewModel({required this._auth});

  final IAdminAuthService _auth;

  AdminAuthStatus _status = AdminAuthStatus.unknown;
  AdminIdentity? _identity;
  bool _busy = false;
  String? _error;

  AdminAuthStatus get status => _status;
  AdminIdentity? get identity => _identity;
  bool get busy => _busy;
  String? get error => _error;

  void start() {
    track(
      _auth.identityChanges().listen(
        (id) {
          _identity = id;
          _status = id == null
              ? AdminAuthStatus.signedOut
              : (id.isAdmin ? AdminAuthStatus.admin : AdminAuthStatus.forbidden);
          _busy = false;
          notify();
        },
        onError: (Object e) {
          _status = AdminAuthStatus.signedOut;
          _busy = false;
          _error = e is AdminFailure ? e.message : 'Không xác minh được tài khoản. Thử đăng nhập lại.';
          notify();
        },
      ),
    );
  }

  Future<void> signIn() async {
    if (_busy) return;
    _busy = true;
    _error = null;
    notify();
    try {
      await _auth.signInWithGoogle();
    } on AdminFailure catch (f) {
      _error = f.code == 'cancelled' ? null : f.message;
      _busy = false;
      notify();
    } catch (e) {
      _error = 'Đăng nhập thất bại: $e';
      _busy = false;
      notify();
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
