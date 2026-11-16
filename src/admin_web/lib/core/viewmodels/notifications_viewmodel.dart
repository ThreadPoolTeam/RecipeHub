import '../models/admin_models.dart';
import '../services/interfaces/admin_services.dart';
import 'view_state.dart';

/// Soạn + gửi thông báo FCM (qua Cloud Function) và lịch sử gửi.
class NotificationsViewModel extends BaseViewModel {
  NotificationsViewModel({required this._service});

  final INotificationAdminService _service;

  String title = '';
  String body = '';
  bool toAll = true;
  AdminUser? targetUser;
  String? recipeCode;

  bool _sending = false;
  String? _error;
  SendResult? _lastResult;
  ViewState _historyState = ViewState.loading;
  List<SentNotification> _history = const [];

  bool get sending => _sending;
  String? get error => _error;
  SendResult? get lastResult => _lastResult;
  ViewState get historyState => _historyState;
  List<SentNotification> get history => _history;

  NotificationRequest get request =>
      NotificationRequest(title: title, body: body, toAll: toAll, targetUid: targetUser?.uid, recipeCode: recipeCode);

  String? get validationError => request.validate();
  bool get canSend => !_sending && validationError == null;

  void update({
    String? title,
    String? body,
    bool? toAll,
    AdminUser? target,
    bool clearTarget = false,
    String? recipeCode,
    bool clearRecipe = false,
  }) {
    if (title != null) this.title = title;
    if (body != null) this.body = body;
    if (toAll != null) this.toAll = toAll;
    if (target != null) targetUser = target;
    if (clearTarget) targetUser = null;
    if (recipeCode != null) this.recipeCode = recipeCode;
    if (clearRecipe) this.recipeCode = null;
    _error = null;
    notify();
  }

  /// Mở form với người nhận chọn sẵn (từ màn Người dùng).
  void prefillUser(AdminUser user) {
    toAll = false;
    targetUser = user;
    notify();
  }

  Future<void> retryHistory() async {
    await cancelAll();
    _historyState = ViewState.loading;
    notify();
    startHistory();
  }

  void startHistory() {
    track(
      _service.watchHistory().listen(
        (h) {
          _history = h;
          _historyState = h.isEmpty ? ViewState.empty : ViewState.ready;
          notify();
        },
        onError: (Object e) {
          _historyState = ViewState.error;
          notify();
        },
      ),
    );
  }

  Future<bool> send() async {
    final v = validationError;
    if (v != null) {
      _error = v;
      notify();
      return false;
    }
    _sending = true;
    _error = null;
    _lastResult = null;
    notify();
    try {
      _lastResult = await _service.send(request);
      title = '';
      body = '';
      recipeCode = null; // deep link gắn với từng tin: không mang sang tin kế tiếp
      return true;
    } on AdminFailure catch (f) {
      _error = f.message;
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _sending = false;
      notify();
    }
  }
}
