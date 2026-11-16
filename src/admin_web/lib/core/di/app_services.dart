import '../services/firebase/firebase_admin_services.dart';
import '../services/interfaces/admin_services.dart';
import '../services/mock/mock_admin_services.dart';

/// Composition root của web Admin: View → ViewModel → (interface) → Firebase | Mock.
class AppServices {
  const AppServices({
    required this.auth,
    required this.users,
    required this.incidents,
    required this.notifications,
    required this.recipes,
  });

  final IAdminAuthService auth;
  final IUserAdminService users;
  final IIncidentService incidents;
  final INotificationAdminService notifications;
  final IRecipeAdminService recipes;

  factory AppServices.firebase() => AppServices(
    auth: FirebaseAdminAuthService(),
    users: FirebaseUserAdminService(),
    incidents: FirebaseIncidentService(),
    notifications: FirebaseNotificationAdminService(),
    recipes: FirebaseRecipeAdminService(),
  );

  factory AppServices.mock({
    IAdminAuthService? auth,
    IUserAdminService? users,
    IIncidentService? incidents,
    INotificationAdminService? notifications,
    IRecipeAdminService? recipes,
  }) => AppServices(
    auth: auth ?? MockAdminAuthService(),
    users: users ?? MockUserAdminService(),
    incidents: incidents ?? MockIncidentService(),
    notifications: notifications ?? MockNotificationAdminService(),
    recipes: recipes ?? MockRecipeAdminService(),
  );
}
