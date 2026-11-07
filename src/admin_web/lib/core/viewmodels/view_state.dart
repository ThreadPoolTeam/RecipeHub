import 'dart:async';

import 'package:flutter/foundation.dart';

/// 4 trạng thái chuẩn của mọi màn (Lab 3): loading / ready / empty / error.
enum ViewState { loading, ready, empty, error }

/// ChangeNotifier an toàn khi đã dispose + quản lý subscription.
abstract class BaseViewModel extends ChangeNotifier {
  final List<StreamSubscription<dynamic>> _subs = [];
  bool _disposed = false;

  bool get isDisposed => _disposed;

  void track(StreamSubscription<dynamic> sub) => _subs.add(sub);

  Future<void> cancelAll() async {
    final subs = List.of(_subs);
    _subs.clear();
    for (final s in subs) {
      await s.cancel();
    }
  }

  void notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}
