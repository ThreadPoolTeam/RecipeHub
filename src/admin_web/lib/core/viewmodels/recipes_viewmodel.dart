import '../models/admin_models.dart';
import '../services/interfaces/admin_services.dart';
import 'view_state.dart';

/// Danh sách món trên Firestore: tìm, lọc, thêm / sửa, ẩn / ban hành, nạp món mẫu.
class RecipesViewModel extends BaseViewModel {
  RecipesViewModel({required this._service});

  final IRecipeAdminService _service;

  ViewState _state = ViewState.loading;
  List<RecipeItem> _all = const [];
  String _query = '';
  bool? _publishedFilter;
  bool _busy = false;
  String? _error;
  String? _actionError;

  ViewState get state => _state;
  bool get busy => _busy;
  String? get error => _error;
  String? get actionError => _actionError;
  bool? get publishedFilter => _publishedFilter;
  List<RecipeItem> get all => _all;
  Set<String> get codes => _all.map((r) => r.code).toSet();

  List<RecipeItem> get recipes {
    final q = RecipeItem.normalize(_query.trim());
    return _all.where((r) {
      if (_publishedFilter != null && r.published != _publishedFilter) return false;
      if (q.isEmpty) return true;
      return RecipeItem.normalize(r.name).contains(q) || r.code.toLowerCase().contains(q);
    }).toList();
  }

  List<RecipeItem> get publishedRecipes => _all.where((r) => r.published).toList();

  void start() {
    track(
      _service.watchRecipes().listen(
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

  void setPublishedFilter(bool? v) {
    _publishedFilter = v;
    notify();
  }

  Future<bool> _run(Future<void> Function() action) async {
    _busy = true;
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
      _busy = false;
      notify();
    }
  }

  /// Trả lỗi kiểm tra (nếu có) hoặc null khi đã lưu.
  Future<String?> save(RecipeItem input, {required bool isNew}) async {
    final r = input.withoutBlankRows();
    final v = r.validate(existingCodes: codes, isNew: isNew);
    if (v != null) return v;
    final ok = await _run(() => _service.save(r, isNew: isNew));
    return ok ? null : _actionError;
  }

  Future<bool> togglePublished(RecipeItem r) => _run(() => _service.setPublished(r.code, !r.published));

  Future<int?> seedSamples() async {
    int? created;
    final ok = await _run(() async => created = await _service.seedSamples());
    return ok ? created : null;
  }
}
