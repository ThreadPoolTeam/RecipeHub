import 'dart:js_interop';

import 'package:web/web.dart' as web;

web.AudioContext? _ctx;

/// Trình duyệt chỉ cho phát âm thanh sau một thao tác của người dùng: gọi hàm này trong
/// sự kiện chạm / click đầu tiên để tạo và "mở khóa" AudioContext.
void unlockAlertSound() {
  try {
    final ctx = _ctx ??= web.AudioContext();
    if (ctx.state == 'suspended') ctx.resume().toDart.ignore();
  } catch (_) {}
}

/// Hai tiếng bíp ngắn (Web Audio API), không cần file âm thanh.
void playAlertSound() {
  try {
    final ctx = _ctx ??= web.AudioContext();
    if (ctx.state == 'suspended') ctx.resume().toDart.ignore();
    final now = ctx.currentTime;
    for (final offset in [0.0, 0.25]) {
      final osc = ctx.createOscillator();
      final gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    }
  } catch (_) {
    // Bị chặn: bỏ qua, banner vẫn hiện.
  }
}
