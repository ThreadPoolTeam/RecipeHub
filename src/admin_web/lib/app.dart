import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/di/app_services.dart';
import 'core/navigation/router.dart';
import 'core/theme/nomad_kit.dart';
import 'core/viewmodels/admin_auth_viewmodel.dart';

/// Root của web Admin: Provider (MVVM) + go_router có guard theo vai trò.
class RecipeHubAdminApp extends StatefulWidget {
  const RecipeHubAdminApp({super.key, required this.services});

  final AppServices services;

  @override
  State<RecipeHubAdminApp> createState() => _RecipeHubAdminAppState();
}

class _RecipeHubAdminAppState extends State<RecipeHubAdminApp> {
  late final AdminAuthViewModel _auth = AdminAuthViewModel(auth: widget.services.auth)..start();
  late final GoRouter _router = buildRouter(_auth);

  @override
  void dispose() {
    _router.dispose();
    _auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MultiProvider(
    providers: [
      Provider<AppServices>.value(value: widget.services),
      ChangeNotifierProvider<AdminAuthViewModel>.value(value: _auth),
    ],
    child: MaterialApp.router(
      title: 'RecipeHub Admin',
      debugShowCheckedModeBanner: false,
      theme: NomadKit.theme(),
      routerConfig: _router,
    ),
  );
}
