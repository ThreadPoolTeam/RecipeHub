import '../../models/admin_models.dart';

/// Đăng nhập web Admin (Firebase Auth – Google). Vai trò đọc từ custom claim `role`.
abstract class IAdminAuthService {
  /// Phát người đang đăng nhập (null = đã đăng xuất). Vai trò đã đồng bộ với server.
  Stream<AdminIdentity?> identityChanges();

  Future<void> signInWithGoogle();

  Future<void> signOut();
}

/// Quản lý người dùng: đọc Firestore `users`, ghi qua callable `setUserRole` / `setUserDisabled`.
abstract class IUserAdminService {
  Stream<List<AdminUser>> watchUsers();

  Future<List<DeviceInfo>> devicesOf(String uid);

  Future<void> setRole(String uid, UserRole role);

  Future<void> setDisabled(String uid, bool disabled);
}

/// Sự cố + thống kê: Firestore `incidents`, `stats/summary`, `stats/incidents/days`.
abstract class IIncidentService {
  /// Danh sách real-time theo bộ lọc, tối đa [limit] bản ghi mới nhất.
  Stream<List<Incident>> watchIncidents(IncidentFilter filter, {int limit = 50});

  Stream<List<Incident>> watchByUser(String uid, {int limit = 20});

  /// Sự cố ghi nhận SAU [since] (dùng cho cảnh báo, độc lập bộ lọc), mới nhất trước.
  Stream<List<Incident>> watchSince(DateTime since, {int limit = 10});

  Stream<StatsSummary> watchSummary();

  /// [days] ngày gần nhất (kể cả hôm nay), thiếu ngày nào thì trả DayStats rỗng.
  Stream<List<DayStats>> watchDays(int days);

  /// Đổi trạng thái + ghi chú; `handledBy` = email admin, `handledAt` = giờ server.
  Future<void> updateStatus(String id, IncidentStatus status, {String? note});
}

/// Gửi thông báo qua callable `sendNotification` + lịch sử `notifications`.
abstract class INotificationAdminService {
  Future<SendResult> send(NotificationRequest request);

  Stream<List<SentNotification>> watchHistory({int limit = 50});
}

/// Danh sách món: Firestore `recipes` (Admin ghi trực tiếp, rules kiểm quyền).
abstract class IRecipeAdminService {
  Stream<List<RecipeItem>> watchRecipes();

  /// [isNew]: tạo mới, báo lỗi nếu mã đã tồn tại trên server (không ghi đè món của Admin khác).
  Future<void> save(RecipeItem recipe, {required bool isNew});

  Future<void> setPublished(String code, bool published);

  /// Callable `seedRecipes`: nạp 6 món mẫu. Trả về số món đã tạo.
  Future<int> seedSamples();
}
