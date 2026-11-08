import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models/admin_models.dart';
import '../../core/theme/nomad_kit.dart';
import '../../core/viewmodels/recipes_viewmodel.dart';
import '../../core/viewmodels/view_state.dart';
import '../../core/widgets/common.dart';
import 'recipe_form_dialog.dart';

/// Danh sách món trên Firestore `recipes/` – app mobile chỉ thấy món "Ban hành".
class RecipesPage extends StatelessWidget {
  const RecipesPage({super.key});

  Future<void> _seed(BuildContext context) async {
    final vm = context.read<RecipesViewModel>();
    final n = await vm.seedSamples();
    if (!context.mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(n == null ? (vm.actionError ?? 'Không nạp được.') : 'Đã nạp $n món mẫu.')));
  }

  Future<void> _open(BuildContext context, RecipeItem? r) async {
    final saved = await showRecipeForm(context, recipe: r);
    if (saved && context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(r == null ? 'Đã thêm món.' : 'Đã lưu thay đổi.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<RecipesViewModel>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHeader(
            overline: 'Món',
            title: 'Danh sách món (${vm.all.length})',
            actions: [
              FilledButton.icon(
                key: const Key('recipe_add'),
                onPressed: vm.busy ? null : () => _open(context, null),
                icon: const Icon(Icons.add_rounded),
                label: const Text('Thêm món'),
              ),
            ],
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              SizedBox(
                width: 280,
                child: TextField(
                  key: const Key('recipe_search'),
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.search_rounded), hintText: 'Tìm tên / mã'),
                  onChanged: vm.setQuery,
                ),
              ),
              DropdownButton<bool?>(
                value: vm.publishedFilter,
                items: const [
                  DropdownMenuItem(value: null, child: Text('Mọi trạng thái')),
                  DropdownMenuItem(value: true, child: Text('Ban hành')),
                  DropdownMenuItem(value: false, child: Text('Đang ẩn')),
                ],
                onChanged: vm.setPublishedFilter,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (vm.actionError != null) InlineError(vm.actionError!),
          Expanded(
            child: switch (vm.state) {
              ViewState.loading => const LoadingView(),
              ViewState.error => ErrorView(message: vm.error ?? '', onRetry: vm.retry),
              ViewState.empty => EmptyView(
                title: 'Chưa có món nào',
                message: 'Thêm món mới, hoặc nạp 6 món mẫu (dữ liệu từ Recipe service).',
                icon: Icons.local_cafe_outlined,
                action: FilledButton.icon(
                  key: const Key('recipe_seed'),
                  onPressed: vm.busy ? null : () => _seed(context),
                  icon: const Icon(Icons.download_rounded),
                  label: const Text('Nạp món mẫu'),
                ),
              ),
              ViewState.ready => Card(
                child: ListView.separated(
                  key: const Key('recipe_list'),
                  itemCount: vm.recipes.length,
                  separatorBuilder: (_, _) => const Divider(),
                  itemBuilder: (context, i) {
                    final r = vm.recipes[i];
                    return ListTile(
                      key: Key('recipe_${r.code}'),
                      leading: CircleAvatar(
                        backgroundColor: NomadKit.sandLight,
                        child: Text(
                          r.code.length >= 2 ? r.code.substring(0, 2) : r.code,
                          style: const TextStyle(color: NomadKit.sandDark, fontSize: 12),
                        ),
                      ),
                      title: Text(r.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text(
                        '${r.code} · v${r.versionNumber} · ${r.ingredients.length} nguyên liệu · ${r.steps.length} bước'
                        ' · ${formatShort(r.updatedAt)}${r.updatedBy == null ? '' : ' · ${r.updatedBy}'}',
                      ),
                      onTap: () => _open(context, r),
                      trailing: Wrap(
                        spacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          r.published
                              ? const Pill(label: 'Ban hành', fg: NomadKit.forest, bg: NomadKit.forestLight)
                              : const Pill(label: 'Đang ẩn', fg: NomadKit.secondary, bg: NomadKit.sandLight),
                          Semantics(
                            label: '${r.published ? 'Ẩn' : 'Ban hành'} ${r.name}',
                            child: Switch(
                              key: Key('recipe_toggle_${r.code}'),
                              value: r.published,
                              onChanged: vm.busy ? null : (_) => vm.togglePublished(r),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            },
          ),
        ],
      ),
    );
  }
}
