import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models/admin_models.dart';
import '../../core/theme/nomad_kit.dart';
import '../../core/viewmodels/recipes_viewmodel.dart';
import '../../core/widgets/common.dart';

/// Mở form thêm / sửa món. Trả `true` nếu đã lưu.
Future<bool> showRecipeForm(BuildContext context, {RecipeItem? recipe}) async {
  final vm = context.read<RecipesViewModel>();
  final r = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) => ChangeNotifierProvider.value(
      value: vm,
      child: RecipeFormDialog(recipe: recipe),
    ),
  );
  return r == true;
}

class _IngRow {
  _IngRow([RecipeIngredient? i])
    : name = TextEditingController(text: i?.name ?? ''),
      qty = TextEditingController(text: i == null ? '' : _num(i.quantity)),
      unit = TextEditingController(text: i?.unit ?? 'ml'),
      stage = TextEditingController(text: i?.stage ?? ''),
      warning = TextEditingController(text: i?.warning ?? '');

  final TextEditingController name, qty, unit, stage, warning;

  /// Lỗi định dạng số (ô nhập chữ vào chỗ số thì báo, không lặng lẽ thành 0).
  String? parseError(int index) {
    final raw = qty.text.trim();
    if (raw.isEmpty) return null;
    final v = double.tryParse(raw.replaceAll(',', '.'));
    if (v == null || !v.isFinite) return 'Nguyên liệu ${index + 1}: định lượng "$raw" không phải số.';
    return null;
  }

  RecipeIngredient toModel() => RecipeIngredient(
    name: name.text.trim(),
    quantity: double.tryParse(qty.text.trim().replaceAll(',', '.')) ?? 0,
    unit: unit.text.trim(),
    stage: stage.text.trim(),
    warning: warning.text.trim(),
  );

  void dispose() {
    for (final c in [name, qty, unit, stage, warning]) {
      c.dispose();
    }
  }
}

class _StepRow {
  _StepRow([RecipeStep? s])
    : title = TextEditingController(text: s?.title ?? ''),
      desc = TextEditingController(text: s?.description ?? ''),
      seconds = TextEditingController(text: s?.durationSeconds?.toString() ?? ''),
      temp = TextEditingController(text: s?.temperatureCelsius == null ? '' : _num(s!.temperatureCelsius!)),
      equipment = TextEditingController(text: s?.equipment ?? ''),
      safety = TextEditingController(text: s?.safetyNote ?? '');

  final TextEditingController title, desc, seconds, temp, equipment, safety;

  String? parseError(int index) {
    final sec = seconds.text.trim();
    if (sec.isNotEmpty && (int.tryParse(sec) == null || int.parse(sec) < 0)) {
      return 'Bước ${index + 1}: số giây "$sec" phải là số nguyên ≥ 0.';
    }
    final t = temp.text.trim();
    if (t.isNotEmpty) {
      final v = double.tryParse(t.replaceAll(',', '.'));
      if (v == null || !v.isFinite) return 'Bước ${index + 1}: nhiệt độ "$t" không phải số.';
    }
    return null;
  }

  RecipeStep toModel() => RecipeStep(
    title: title.text.trim(),
    description: desc.text.trim(),
    durationSeconds: int.tryParse(seconds.text.trim()),
    temperatureCelsius: double.tryParse(temp.text.trim().replaceAll(',', '.')),
    equipment: equipment.text.trim(),
    safetyNote: safety.text.trim(),
  );

  void dispose() {
    for (final c in [title, desc, seconds, temp, equipment, safety]) {
      c.dispose();
    }
  }
}

String _num(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();

class RecipeFormDialog extends StatefulWidget {
  const RecipeFormDialog({super.key, this.recipe});

  final RecipeItem? recipe;

  @override
  State<RecipeFormDialog> createState() => _RecipeFormDialogState();
}

class _RecipeFormDialogState extends State<RecipeFormDialog> {
  late final bool _isNew = widget.recipe == null;
  late final TextEditingController _code = TextEditingController(text: widget.recipe?.code ?? '');
  late final TextEditingController _name = TextEditingController(text: widget.recipe?.name ?? '');
  late final TextEditingController _desc = TextEditingController(text: widget.recipe?.description ?? '');
  late bool _published = widget.recipe?.published ?? false;
  late final List<_IngRow> _ings = [
    for (final i in widget.recipe?.ingredients ?? const <RecipeIngredient>[]) _IngRow(i),
  ];
  late final List<_StepRow> _steps = [for (final s in widget.recipe?.steps ?? const <RecipeStep>[]) _StepRow(s)];
  String? _error;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (_ings.isEmpty) _ings.add(_IngRow());
    if (_steps.isEmpty) _steps.add(_StepRow());
  }

  @override
  void dispose() {
    for (final c in [_code, _name, _desc]) {
      c.dispose();
    }
    for (final r in _ings) {
      r.dispose();
    }
    for (final r in _steps) {
      r.dispose();
    }
    super.dispose();
  }

  RecipeItem _model() => RecipeItem(
    code: _code.text.trim().toUpperCase(),
    name: _name.text.trim(),
    description: _desc.text.trim(),
    published: _published,
    versionNumber: widget.recipe?.versionNumber ?? 1,
    ingredients: _ings.map((r) => r.toModel()).toList(),
    steps: _steps.map((s) => s.toModel()).toList(),
  );

  Future<void> _save() async {
    final parseErrors = [
      for (var i = 0; i < _ings.length; i++) _ings[i].parseError(i),
      for (var i = 0; i < _steps.length; i++) _steps[i].parseError(i),
    ].whereType<String>().toList();
    if (parseErrors.isNotEmpty) {
      setState(() => _error = parseErrors.first);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final err = await context.read<RecipesViewModel>().save(_model(), isNew: _isNew);
    if (!mounted) return;
    if (err == null) {
      Navigator.pop(context, true);
    } else {
      setState(() {
        _saving = false;
        _error = err;
      });
    }
  }

  Widget _field(
    TextEditingController c,
    String label, {
    double? width,
    Key? key,
    int maxLines = 1,
    bool enabled = true,
    int? maxLength,
    TextInputType? keyboardType,
  }) => SizedBox(
    width: width,
    child: TextField(
      key: key,
      controller: c,
      enabled: enabled,
      maxLines: maxLines,
      maxLength: maxLength,
      keyboardType: keyboardType,
      decoration: InputDecoration(labelText: label, counterText: maxLength == null ? null : ''),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_isNew ? 'Thêm món' : 'Sửa ${widget.recipe!.name}'),
      content: SizedBox(
        width: 760,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error != null) InlineError(_error!),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _field(_code, 'Mã món (VD: CF-MUOI)', width: 220, key: const Key('form_code'), enabled: _isNew),
                  _field(_name, 'Tên món', width: 400, key: const Key('form_name'), maxLength: RecipeItem.maxName),
                ],
              ),
              const SizedBox(height: 12),
              _field(_desc, 'Mô tả', maxLines: 2, key: const Key('form_desc')),
              SwitchListTile(
                key: const Key('form_published'),
                contentPadding: EdgeInsets.zero,
                title: const Text('Ban hành (app mobile thấy món này)'),
                value: _published,
                onChanged: (v) => setState(() => _published = v),
              ),
              const Divider(),
              Row(
                children: [
                  const Text('Nguyên liệu', style: TextStyle(fontWeight: FontWeight.w800)),
                  const Spacer(),
                  TextButton.icon(
                    key: const Key('form_add_ing'),
                    onPressed: () => setState(() => _ings.add(_IngRow())),
                    icon: const Icon(Icons.add),
                    label: const Text('Thêm'),
                  ),
                ],
              ),
              for (var i = 0; i < _ings.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      _field(_ings[i].name, 'Tên', width: 200, key: Key('ing_name_$i')),
                      _field(_ings[i].qty, 'Lượng', width: 90, key: Key('ing_qty_$i')),
                      _field(_ings[i].unit, 'Đơn vị', width: 80, key: Key('ing_unit_$i')),
                      _field(_ings[i].stage, 'Công đoạn', width: 130),
                      _field(_ings[i].warning, 'Cảnh báo', width: 160),
                      IconButton(
                        tooltip: 'Xóa',
                        onPressed: _ings.length <= 1 ? null : () => setState(() => _ings.removeAt(i).dispose()),
                        icon: const Icon(Icons.delete_outline, color: NomadKit.error),
                      ),
                    ],
                  ),
                ),
              const Divider(),
              Row(
                children: [
                  const Text('Các bước pha chế', style: TextStyle(fontWeight: FontWeight.w800)),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => setState(() => _steps.add(_StepRow())),
                    icon: const Icon(Icons.add),
                    label: const Text('Thêm'),
                  ),
                ],
              ),
              for (var i = 0; i < _steps.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text('${i + 1}.', style: const TextStyle(fontWeight: FontWeight.w700)),
                      _field(_steps[i].title, 'Tiêu đề', width: 160, key: Key('step_title_$i')),
                      _field(_steps[i].desc, 'Mô tả', width: 300),
                      _field(_steps[i].seconds, 'Giây', width: 70, key: Key('step_seconds_$i')),
                      _field(_steps[i].temp, '°C', width: 70, key: Key('step_temp_$i')),
                      _field(_steps[i].equipment, 'Dụng cụ', width: 150),
                      _field(_steps[i].safety, 'Lưu ý an toàn', width: 200),
                      IconButton(
                        tooltip: 'Xóa',
                        onPressed: _steps.length <= 1 ? null : () => setState(() => _steps.removeAt(i).dispose()),
                        icon: const Icon(Icons.delete_outline, color: NomadKit.error),
                      ),
                    ],
                  ),
                ),
              if (!_isNew)
                Text(
                  'Lưu sẽ tăng phiên bản lên v${(widget.recipe?.versionNumber ?? 1) + 1}. Cập nhật lúc ${formatDateTime(widget.recipe?.updatedAt)}.',
                  style: const TextStyle(color: NomadKit.secondary, fontSize: 12),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: _saving ? null : () => Navigator.pop(context, false), child: const Text('Hủy')),
        FilledButton(
          key: const Key('form_save'),
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Lưu'),
        ),
      ],
    );
  }
}
