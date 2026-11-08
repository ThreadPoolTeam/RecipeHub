// Âm báo khi có sự cố mới: bản web dùng Web Audio, bản VM (test) không làm gì.
export 'alert_sound_stub.dart' if (dart.library.js_interop) 'alert_sound_web.dart';
