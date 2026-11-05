/// Model dữ liệu web Admin, ánh xạ 1-1 với Firestore (xem docs/plans/261105-admin-web-firebase/phase-02).
library;

enum UserRole { viewer, admin }

UserRole roleFrom(Object? raw) => raw == 'admin' ? UserRole.admin : UserRole.viewer;

String roleCode(UserRole r) => r == UserRole.admin ? 'admin' : 'viewer';

String roleLabel(UserRole r) => r == UserRole.admin ? 'Admin' : 'Barista';

/// Người đang đăng nhập web.
class AdminIdentity {
  const AdminIdentity({required this.uid, required this.email, required this.role, this.displayName});

  final String uid;
  final String email;
  final String? displayName;
  final UserRole role;

  bool get isAdmin => role == UserRole.admin;
}

/// `users/{uid}`.
class AdminUser {
  const AdminUser({
    required this.uid,
    required this.role,
    required this.disabled,
    required this.isAnonymous,
    this.email,
    this.displayName,
    this.deviceCount = 0,
    this.createdAt,
    this.lastSeenAt,
  });

  final String uid;
  final String? email;
  final String? displayName;
  final UserRole role;
  final bool disabled;
  final bool isAnonymous;
  final int deviceCount;
  final DateTime? createdAt;
  final DateTime? lastSeenAt;

  String get label => email ?? (isAnonymous ? 'Khách (ẩn danh)' : uid);
}

/// `users/{uid}/devices/{id}`.
class DeviceInfo {
  const DeviceInfo({
    required this.id,
    required this.platform,
    this.model,
    this.osVersion,
    this.appVersion,
    this.updatedAt,
  });

  final String id;
  final String platform;
  final String? model;
  final String? osVersion;
  final String? appVersion;
  final DateTime? updatedAt;
}

enum IncidentStatus { open, acknowledged, resolved, dismissed }

enum IncidentKind { fatal, nonFatal, crashlyticsIssue }

IncidentStatus incidentStatusFrom(Object? raw) => switch (raw) {
  'acknowledged' => IncidentStatus.acknowledged,
  'resolved' => IncidentStatus.resolved,
  'dismissed' => IncidentStatus.dismissed,
  _ => IncidentStatus.open,
};

String incidentStatusCode(IncidentStatus s) => s.name;

String incidentStatusLabel(IncidentStatus s) => switch (s) {
  IncidentStatus.open => 'Đang mở',
  IncidentStatus.acknowledged => 'Đã xác nhận',
  IncidentStatus.resolved => 'Đã xử lý',
  IncidentStatus.dismissed => 'Bỏ qua',
};

IncidentKind incidentKindFrom(Object? raw) => switch (raw) {
  'fatal' => IncidentKind.fatal,
  'crashlytics_issue' => IncidentKind.crashlyticsIssue,
  _ => IncidentKind.nonFatal,
};

String incidentKindCode(IncidentKind k) => switch (k) {
  IncidentKind.fatal => 'fatal',
  IncidentKind.nonFatal => 'non_fatal',
  IncidentKind.crashlyticsIssue => 'crashlytics_issue',
};

String incidentKindLabel(IncidentKind k) => switch (k) {
  IncidentKind.fatal => 'Crash',
  IncidentKind.nonFatal => 'Lỗi non-fatal',
  IncidentKind.crashlyticsIssue => 'Crashlytics issue',
};

/// `incidents/{id}`.
class Incident {
  const Incident({
    required this.id,
    required this.kind,
    required this.status,
    required this.message,
    this.uid,
    this.email,
    this.source,
    this.errorType,
    this.stackTop,
    this.screen,
    this.appVersion,
    this.buildNumber,
    this.deviceModel,
    this.osVersion,
    this.occurredAt,
    this.reportedAt,
    this.handledBy,
    this.handledAt,
    this.note,
    this.crashlyticsIssueId,
  });

  final String id;
  final IncidentKind kind;
  final IncidentStatus status;
  final String message;
  final String? uid;
  final String? email;
  final String? source;
  final String? errorType;
  final String? stackTop;
  final String? screen;
  final String? appVersion;
  final String? buildNumber;
  final String? deviceModel;
  final String? osVersion;
  final DateTime? occurredAt;
  final DateTime? reportedAt;
  final String? handledBy;
  final DateTime? handledAt;
  final String? note;
  final String? crashlyticsIssueId;

  String get who => email ?? (uid == null ? 'Chưa đăng nhập' : 'Khách');

  Incident copyWith({
    IncidentStatus? status,
    String? note,
    bool clearNote = false,
    String? handledBy,
    DateTime? handledAt,
  }) => Incident(
    id: id,
    kind: kind,
    status: status ?? this.status,
    message: message,
    uid: uid,
    email: email,
    source: source,
    errorType: errorType,
    stackTop: stackTop,
    screen: screen,
    appVersion: appVersion,
    buildNumber: buildNumber,
    deviceModel: deviceModel,
    osVersion: osVersion,
    occurredAt: occurredAt,
    reportedAt: reportedAt,
    handledBy: handledBy ?? this.handledBy,
    handledAt: handledAt ?? this.handledAt,
    note: clearNote ? null : (note ?? this.note),
    crashlyticsIssueId: crashlyticsIssueId,
  );
  String get device => [deviceModel, osVersion].whereType<String>().where((s) => s.isNotEmpty).join(' · ');
}

/// Bộ lọc màn Sự cố.
class IncidentFilter {
  const IncidentFilter({
    this.statuses = const {IncidentStatus.open, IncidentStatus.acknowledged},
    this.kind,
    this.days = 7,
  });

  final Set<IncidentStatus> statuses;
  final IncidentKind? kind;

  /// 1 = hôm nay, 7, 30; 0 = tất cả.
  final int days;

  IncidentFilter copyWith({Set<IncidentStatus>? statuses, IncidentKind? kind, bool clearKind = false, int? days}) =>
      IncidentFilter(
        statuses: statuses ?? this.statuses,
        kind: clearKind ? null : (kind ?? this.kind),
        days: days ?? this.days,
      );
}

/// `stats/summary`.
class StatsSummary {
  const StatsSummary({
    this.openIncidents = 0,
    this.totalIncidents = 0,
    this.totalUsers = 0,
    this.adminUsers = 0,
    this.disabledUsers = 0,
    this.notificationsSent = 0,
  });

  final int openIncidents;
  final int totalIncidents;
  final int totalUsers;
  final int adminUsers;
  final int disabledUsers;
  final int notificationsSent;

  bool get isEmpty => totalIncidents == 0 && totalUsers == 0 && notificationsSent == 0;
}

/// `stats/incidents/days/{yyyy-MM-dd}`.
class DayStats {
  const DayStats({
    required this.day,
    this.total = 0,
    this.fatal = 0,
    this.nonFatal = 0,
    this.crashlytics = 0,
    this.byVersion = const {},
    this.byModel = const {},
  });

  final String day;
  final int total;
  final int fatal;
  final int nonFatal;
  final int crashlytics;
  final Map<String, int> byVersion;
  final Map<String, int> byModel;
}

/// Yêu cầu gửi thông báo (callable `sendNotification`).
class NotificationRequest {
  const NotificationRequest({
    required this.title,
    required this.body,
    required this.toAll,
    this.targetUid,
    this.recipeCode,
  });

  static const int maxTitle = 65;
  static const int maxBody = 240;

  final String title;
  final String body;
  final bool toAll;
  final String? targetUid;
  final String? recipeCode;

  /// Lỗi kiểm tra phía client (null = hợp lệ).
  String? validate() {
    final t = title.trim();
    final b = body.trim();
    if (t.isEmpty) return 'Nhập tiêu đề.';
    if (t.length > maxTitle) return 'Tiêu đề tối đa $maxTitle ký tự.';
    if (b.isEmpty) return 'Nhập nội dung.';
    if (b.length > maxBody) return 'Nội dung tối đa $maxBody ký tự.';
    if (!toAll && (targetUid == null || targetUid!.isEmpty)) return 'Chọn người nhận.';
    return null;
  }

  Map<String, dynamic> toPayload() => {
    'title': title.trim(),
    'body': body.trim(),
    'target': toAll ? 'all' : 'user',
    if (!toAll) 'targetUid': targetUid,
    'data': recipeCode == null || recipeCode!.isEmpty ? {'type': 'none'} : {'type': 'recipe', 'targetId': recipeCode},
  };
}

class SendResult {
  const SendResult({required this.successCount, required this.failureCount});

  final int successCount;
  final int failureCount;
}

/// `notifications/{id}`.
class SentNotification {
  const SentNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.target,
    this.targetUid,
    this.recipeCode,
    this.sentBy,
    this.sentAt,
    this.successCount = 0,
    this.failureCount = 0,
    this.error,
  });

  final String id;
  final String title;
  final String body;
  final String target;
  final String? targetUid;
  final String? recipeCode;
  final String? sentBy;
  final DateTime? sentAt;
  final int successCount;
  final int failureCount;
  final String? error;
}

/// Nguyên liệu trong `recipes/{code}.ingredients`.
class RecipeIngredient {
  const RecipeIngredient({required this.name, required this.quantity, required this.unit, this.stage, this.warning});

  final String name;
  final double quantity;
  final String unit;
  final String? stage;
  final String? warning;

  bool get isBlank => name.trim().isEmpty && quantity == 0 && (stage ?? '').trim().isEmpty;

  Map<String, dynamic> toMap() => {
    'name': name.trim(),
    'quantity': quantity,
    'unit': unit,
    if (stage != null && stage!.isNotEmpty) 'stage': stage,
    if (warning != null && warning!.isNotEmpty) 'warning': warning,
  };
}

/// Bước trong `recipes/{code}.steps`.
class RecipeStep {
  const RecipeStep({
    required this.title,
    required this.description,
    this.durationSeconds,
    this.temperatureCelsius,
    this.equipment,
    this.safetyNote,
  });

  final String title;
  final String description;
  final int? durationSeconds;
  final double? temperatureCelsius;

  /// App mobile hiển thị "Dụng cụ" và "Lưu ý" – phải giữ khi Admin sửa món.
  final String? equipment;
  final String? safetyNote;

  bool get isBlank =>
      title.trim().isEmpty && description.trim().isEmpty && durationSeconds == null && temperatureCelsius == null;

  Map<String, dynamic> toMap() => {
    'title': title.trim(),
    'description': description.trim(),
    if (durationSeconds != null) 'durationSeconds': durationSeconds,
    if (temperatureCelsius != null) 'temperatureCelsius': temperatureCelsius,
    if (equipment != null && equipment!.trim().isNotEmpty) 'equipment': equipment!.trim(),
    if (safetyNote != null && safetyNote!.trim().isNotEmpty) 'safetyNote': safetyNote!.trim(),
  };
}

/// `recipes/{code}`.
class RecipeItem {
  const RecipeItem({
    required this.code,
    required this.name,
    required this.published,
    this.description = '',
    this.versionNumber = 1,
    this.ingredients = const [],
    this.steps = const [],
    this.updatedAt,
    this.updatedBy,
  });

  static final RegExp codePattern = RegExp(r'^[A-Z]{2}-[A-Z0-9]{2,20}$');
  static const int maxName = 120;

  final String code;
  final String name;
  final bool published;
  final String description;
  final int versionNumber;
  final List<RecipeIngredient> ingredients;
  final List<RecipeStep> steps;
  final DateTime? updatedAt;
  final String? updatedBy;

  /// Bỏ các dòng nguyên liệu / bước để trống hoàn toàn (người dùng bấm "Thêm" rồi không nhập).
  RecipeItem withoutBlankRows() => RecipeItem(
    code: code,
    name: name,
    published: published,
    description: description,
    versionNumber: versionNumber,
    ingredients: ingredients.where((i) => !i.isBlank).toList(),
    steps: steps.where((s) => !s.isBlank).toList(),
    updatedAt: updatedAt,
    updatedBy: updatedBy,
  );

  RecipeItem copyWith({bool? published, int? versionNumber}) => RecipeItem(
    code: code,
    name: name,
    published: published ?? this.published,
    description: description,
    versionNumber: versionNumber ?? this.versionNumber,
    ingredients: ingredients,
    steps: steps,
    updatedAt: updatedAt,
    updatedBy: updatedBy,
  );

  /// Lỗi kiểm tra (null = hợp lệ). [existingCodes] để chặn trùng mã khi tạo mới.
  String? validate({Set<String> existingCodes = const {}, bool isNew = true}) {
    if (!codePattern.hasMatch(code)) return 'Mã món dạng XX-ABC (chữ in hoa, số), ví dụ CF-MUOI.';
    if (isNew && existingCodes.contains(code)) return 'Mã $code đã tồn tại.';
    if (name.trim().isEmpty) return 'Nhập tên món.';
    if (name.trim().length > maxName) return 'Tên món tối đa $maxName ký tự.';
    if (ingredients.isEmpty) return 'Cần ít nhất 1 nguyên liệu.';
    if (ingredients.any(
      (i) => i.name.trim().isEmpty || !i.quantity.isFinite || i.quantity <= 0 || i.unit.trim().isEmpty,
    )) {
      return 'Nguyên liệu cần tên, định lượng > 0 và đơn vị.';
    }
    if (steps.isEmpty) return 'Cần ít nhất 1 bước pha chế.';
    if (steps.any((s) => s.title.trim().isEmpty)) return 'Mỗi bước cần tiêu đề.';
    if (steps.any((s) => (s.durationSeconds ?? 0) < 0)) return 'Số giây không được âm.';
    if (steps.any(
      (s) => s.temperatureCelsius != null && (s.temperatureCelsius! < -20 || s.temperatureCelsius! > 100),
    )) {
      return 'Nhiệt độ phải trong khoảng -20…100 °C.';
    }
    return null;
  }

  /// Từ khóa tìm kiếm (chữ thường, bỏ dấu) – app mobile dùng `array-contains`.
  List<String> searchKeywords() {
    final words = normalize('$name $code').split(RegExp(r'[^a-z0-9]+')).where((w) => w.isNotEmpty).toSet().toList()
      ..sort();
    return words;
  }

  static String normalize(String s) {
    const from = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
    const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
    final b = StringBuffer();
    for (final ch in s.toLowerCase().split('')) {
      final i = from.indexOf(ch);
      b.write(i >= 0 ? to[i] : ch);
    }
    return b.toString();
  }
}

/// Lỗi chuẩn hóa từ Firebase để View hiển thị tiếng Việt.
class AdminFailure implements Exception {
  const AdminFailure(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}
