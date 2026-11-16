import 'package:flutter/material.dart';

/// Token màu NomadKit – dùng chung với app mobile (src/mobile/lib/core/theme/nomad_kit.dart).
class NomadKit {
  static const sand = Color(0xFFC49A6C);
  static const sandDark = Color(0xFFA07040);
  static const sandLight = Color(0xFFFAF6F0);
  static const ocean = Color(0xFF0891B2);
  static const oceanLight = Color(0xFFF0F9FF);
  static const forest = Color(0xFF166534);
  static const forestLight = Color(0xFFDCFCE7);
  static const warning = Color(0xFFCA8A04);
  static const warningLight = Color(0xFFFEF9C3);
  static const ink = Color(0xFF292524);
  static const secondary = Color(0xFF78716C);
  static const canvas = Color(0xFFFFFDF7);
  static const surface = Colors.white;
  static const border = Color(0xFFE7E0D5);
  static const error = Color(0xFFDC2626);
  static const errorLight = Color(0xFFFEE2E2);

  static ThemeData theme() => ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: canvas,
    colorScheme: ColorScheme.fromSeed(seedColor: sand, primary: sandDark, surface: surface, error: error),
    cardTheme: const CardThemeData(
      color: surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
        side: BorderSide(color: border),
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
      isDense: true,
    ),
    dividerTheme: const DividerThemeData(color: border, space: 1),
  );
}
