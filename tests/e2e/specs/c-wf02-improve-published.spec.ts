import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/accounts';
import { readRunState, shot } from '../fixtures/evidence';

const SPEC = 'c-wf02-improve-published.spec.ts';

test.describe('Nhóm C — Luồng 2: Cải tiến công thức đã phát hành (R&D & Viewer)', () => {
  test('C1–C6: Chỉnh sửa công thức đã phát hành tự động tạo v2 nháp, giữ nguyên v1, khóa mã công thức và kiểm tra quyền xem của nhân viên pha chế', async ({
    page,
  }) => {
    const state = readRunState();
    expect(
      state.recipeId,
      'Cần chạy Spec B trước để có công thức đã phát hành trong .run-state'
    ).toBeTruthy();

    const recipeId = state.recipeId!;

    await loginAs(page, 'rnd');
    await page.goto(`/rnd/recipes/${recipeId}`);
    await expect(page.locator('text=Đã phát hành >> visible=true').first()).toBeVisible();

    // C1: Mở công thức đã phát hành ở B, bấm "Chỉnh sửa" -> Thông báo "Đã tạo bản nháp mới"
    await page.getByRole('link', { name: 'Chỉnh sửa' }).click();
    await page.waitForURL(`**/rnd/recipes/${recipeId}/edit`);
    await expect(page.getByText('Đã tạo bản nháp mới').first()).toBeVisible();

    await shot(page, 'c01-fork-new-draft-toast', {
      description: 'C1: Bấm "Chỉnh sửa" trên công thức đã phát hành — thông báo "Đã tạo bản nháp mới"',
      spec: SPEC,
    });

    // C5 (hoặc kiểm tra ngay trên màn edit): Ngoại lệ thử đổi mã công thức -> Ô mã bị khóa
    const codeInput = page.getByLabel(/^Mã Công Thức/i);
    await expect(codeInput).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Tạo mã công thức' })).toBeDisabled();
    await expect(
      page.getByText(
        'Mã được giữ cố định sau lần phát hành đầu tiên; không thể sửa hoặc tạo mã mới.'
      )
    ).toBeVisible();

    // C2: Sửa một định lượng, bấm "Lưu Bản Nháp"
    await page.getByRole('button', { name: /02\s*Thành phần & định lượng/ }).click();
    const quantityInput = page.getByLabel(/^Định Lượng/i).first();
    await quantityInput.fill('75');

    await page.getByRole('button', { name: 'Lưu Bản Nháp' }).click();
    await expect(page.getByText('Đã lưu bản nháp').first()).toBeVisible();

    await shot(page, 'c02-edit-quantity-save-draft', {
      description: 'C2: Sửa định lượng nguyên liệu lên 75 và bấm "Lưu Bản Nháp" trên v2',
      spec: SPEC,
    });

    // Chụp C5 ở tab 01 nơi ô Mã Công Thức bị khóa
    await page.getByRole('button', { name: /01\s*Thông tin cơ bản/ }).click();
    await expect(codeInput).toBeDisabled();
    await shot(page, 'c05-recipe-code-locked', {
      description: 'C5: Ngoại lệ thử đổi mã công thức sau khi đã phát hành — ô mã bị khóa',
      spec: SPEC,
    });

    // C3: Trang chi tiết: ô chuyển phiên bản có 2 phiên bản (v1 "Đã phát hành", v2 "Bản nháp")
    await page.getByRole('link', { name: 'Quay Lại Chi Tiết' }).click();
    await page.waitForURL(`**/rnd/recipes/${recipeId}`);

    const versionSwitcher = page.getByRole('combobox', {
      name: 'Chuyển đổi phiên bản công thức',
    });
    await expect(versionSwitcher).toBeVisible();
    await versionSwitcher.click();

    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(2);

    await shot(page, 'c03-version-switcher-two-versions', {
      description: 'C3: Ô chuyển đổi phiên bản công thức hiển thị 2 phiên bản (v1 và v2)',
      spec: SPEC,
    });

    // C4: Chọn lại v1: nội dung cũ còn nguyên (Định lượng cũ 50, trạng thái "Đã phát hành")
    const v1Option = listbox.getByRole('option', { name: /v1/i }).first();
    await v1Option.click();

    await expect(page.locator('text=Đã phát hành >> visible=true').first()).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toContainText('50');

    await shot(page, 'c04-select-v1-content-intact', {
      description: 'C4: Chọn lại phiên bản v1 — nhãn "Đã phát hành" và định lượng cũ (50) còn nguyên',
      spec: SPEC,
    });

    // C6: Đăng nhập nhân viên pha chế: chỉ thấy v1, không thấy bản nháp v2
    await loginAs(page, 'viewer');
    await page.goto(`/viewer/recipes/${recipeId}`);

    await expect(page.getByRole('heading', { name: state.recipeName! })).toBeVisible();
    await expect(page.locator('text=Đã phát hành >> visible=true').first()).toBeVisible();
    await expect(page.getByText('Bản nháp')).toHaveCount(0);
    await expect(page.locator('table tbody tr').first()).toContainText('50');

    await shot(page, 'c06-viewer-sees-only-published-v1', {
      description: 'C6: Nhân viên pha chế (Viewer) chỉ thấy bản v1 đã phát hành, không thấy bản nháp v2',
      spec: SPEC,
    });
  });
});
