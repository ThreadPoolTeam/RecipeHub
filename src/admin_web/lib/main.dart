import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app.dart';
import 'core/config/web_firebase_options.dart';
import 'core/di/app_services.dart';
import 'core/theme/nomad_kit.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!WebFirebaseConfig.isConfigured) {
    runApp(const _MissingConfigApp());
    return;
  }
  await Firebase.initializeApp(options: WebFirebaseConfig.options);
  if (WebFirebaseConfig.useEmulator) {
    await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
    FirebaseFirestore.instance.useFirestoreEmulator('localhost', 8080);
    FirebaseFunctions.instanceFor(region: WebFirebaseConfig.functionsRegion).useFunctionsEmulator('localhost', 5001);
  }
  runApp(RecipeHubAdminApp(services: AppServices.firebase()));
}

/// Build thiếu `--dart-define-from-file=env/firebase_web.json`.
class _MissingConfigApp extends StatelessWidget {
  const _MissingConfigApp();

  @override
  Widget build(BuildContext context) => MaterialApp(
    theme: NomadKit.theme(),
    home: const Scaffold(
      body: Center(
        child: Text(
          'Thiếu cấu hình Firebase web.\nBuild với --dart-define-from-file=env/firebase_web.json',
          textAlign: TextAlign.center,
        ),
      ),
    ),
  );
}
