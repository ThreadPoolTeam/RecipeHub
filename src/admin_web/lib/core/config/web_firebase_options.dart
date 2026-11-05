import 'package:firebase_core/firebase_core.dart';

/// Cấu hình Web app Firebase. Không ghi key vào mã nguồn: truyền bằng
/// `--dart-define-from-file=env/firebase_web.json` (file đã .gitignore, mẫu ở env/firebase_web.example.json).
class WebFirebaseConfig {
  WebFirebaseConfig._();

  static const String apiKey = String.fromEnvironment('FB_API_KEY');
  static const String appId = String.fromEnvironment('FB_APP_ID');
  static const String senderId = String.fromEnvironment('FB_SENDER_ID');
  static const String projectId = String.fromEnvironment('FB_PROJECT_ID', defaultValue: 'recipehub-mobile');
  static const String authDomain = String.fromEnvironment(
    'FB_AUTH_DOMAIN',
    defaultValue: 'recipehub-mobile.firebaseapp.com',
  );
  static const String storageBucket = String.fromEnvironment('FB_STORAGE_BUCKET');

  /// `--dart-define=USE_EMULATOR=true` → Auth 9099, Firestore 8080, Functions 5001 trên localhost.
  static const bool useEmulator = bool.fromEnvironment('USE_EMULATOR');

  /// Region của Cloud Functions.
  static const String functionsRegion = 'asia-southeast1';

  static bool get isConfigured => apiKey.isNotEmpty && appId.isNotEmpty;

  static FirebaseOptions get options => const FirebaseOptions(
    apiKey: apiKey,
    appId: appId,
    messagingSenderId: senderId,
    projectId: projectId,
    authDomain: authDomain,
    storageBucket: storageBucket,
  );
}
