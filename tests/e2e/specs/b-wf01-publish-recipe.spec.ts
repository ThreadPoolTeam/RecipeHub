import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/accounts';
import {
  getRunId,
  getShortTag,
  readRunState,
  recordManualOrSkipped,
  shot,
  writeRunState,
} from '../fixtures/evidence';

const SPEC = 'b-wf01-publish-recipe.spec.ts';

test.describe('Nhóm B — Luồng 1: Phát hành công thức mới (R&D)', () => {
  test('B1–B10, B12: Đăng nhập, thêm nguyên liệu, tạo công thức, kiểm tra ngoại lệ thiếu sản lượng, phát hành và xem trước PDF', async ({
    page,
  }) => {
    const runId = getRunId();
    const shortTag = getShortTag();
    const ingredientCode = `ING-${shortTag}`;
    const ingredientName = `Trà Ô Long E2E ${runId}`;
    const fallbackRecipeCode = `REC-${shortTag}`;
    const recipeName = `Trà Ô Long Sữa E2E ${runId}`;

    // B1: Trang đăng nhập (chụp trước khi điền mật khẩu)
    // B2: Sau đăng nhập: danh sách công thức (/rnd/recipes)
    await loginAs(page, 'rnd', {
      beforeFillPassword: async (loginPage) => {
        await shot(loginPage, 'b01-login-page', {
          description: 'B1: Trang đăng nhập (/login)',
          spec: SPEC,
        });
      },
    });

    await expect(page).toHaveURL(/\/rnd\/recipes/);
    await expect(page.getByRole('heading', { name: 'Công thức đồ uống' })).toBeVisible();
    await shot(page, 'b02-rnd-recipes-list', {
      description: 'B2: Sau đăng nhập R&D — Danh sách công thức (/rnd/recipes)',
      spec: SPEC,
    });

    // B3: Thêm nguyên liệu mới
    await page.goto('/rnd/ingredients/new');
    await expect(page.getByRole('heading', { name: 'Thêm nguyên liệu' })).toBeVisible();

    await page.getByPlaceholder('VD: ING-TRA-001').fill(ingredientCode);
    await page.getByPlaceholder('VD: Trà Ô Long Rang Thượng Hạng').fill(ingredientName);
    await page.getByRole('button', { name: 'Lưu Nguyên Liệu' }).click();

    await page.waitForURL('**/rnd/ingredients');
    await expect(page.getByText(ingredientName).first()).toBeVisible();
    await shot(page, 'b03-ingredient-created', {
      description: `B3: Thêm nguyên liệu mới thành công (${ingredientCode})`,
      spec: SPEC,
    });

    // B4: Tạo công thức — bước thông tin chung
    await page.goto('/rnd/recipes/new');
    await expect(page.getByRole('heading', { name: 'Tạo công thức mới' })).toBeVisible();

    const generateCodeBtn = page.getByRole('button', { name: 'Tạo mã công thức' });
    if (await generateCodeBtn.isEnabled()) {
      await generateCodeBtn.click();
    }
    const codeInput = page.getByPlaceholder('VD: REC-001');
    let recipeCode = (await codeInput.inputValue()).trim();
    if (!recipeCode) {
      await codeInput.fill(fallbackRecipeCode);
      recipeCode = fallbackRecipeCode;
    }

    await page.getByPlaceholder('VD: Trà Ô Long Sữa Nướng Trân Châu').fill(recipeName);
    await page
      .getByPlaceholder('Mô tả tóm tắt về gu vị, điểm nhấn nguyên liệu hoặc phân khúc đồ uống...')
      .fill(`Công thức R&D phục vụ kiểm thử tự động lượt ${runId}.`);

    await shot(page, 'b04-create-recipe-basic-info', {
      description: `B4: Tạo công thức — Bước 01 thông tin chung (${recipeCode})`,
      spec: SPEC,
    });

    // B5: Tạo công thức — bước nguyên liệu, định lượng
    await page.getByRole('button', { name: /02\s*Thành phần & định lượng/ }).click();
    const addFirstIngBtn = page.getByRole('button', { name: '+ Thêm Nguyên Liệu Đầu Tiên' });
    if ((await addFirstIngBtn.count()) > 0 && (await addFirstIngBtn.isVisible())) {
      await addFirstIngBtn.click();
    } else {
      await page.getByRole('button', { name: '+ Thêm Nguyên Liệu' }).click();
    }

    const quantityInput = page.getByLabel(/^Định Lượng/i).first();
    await quantityInput.fill('50');

    await shot(page, 'b05-create-recipe-ingredients', {
      description: 'B5: Tạo công thức — Bước 02 nguyên liệu và định lượng (50)',
      spec: SPEC,
    });

    // B6: Tạo công thức — bước các bước pha chế (SOP)
    await page.getByRole('button', { name: /03\s*Quy trình SOP/ }).click();
    await page.getByRole('button', { name: '+ Thêm Bước Thao Tác' }).click();
    await page
      .getByPlaceholder('Mô tả kỹ thuật ủ trà, đánh bọt, rót tầng hoặc lắc shaker...')
      .last()
      .fill(`Ủ trà 90°C trong 10 phút và khuấy đều (${runId}).`);

    await shot(page, 'b06-create-recipe-sop', {
      description: 'B6: Tạo công thức — Bước 03 quy trình pha chế SOP',
      spec: SPEC,
    });

    await page.getByRole('button', { name: 'Lưu Bản Nháp & Chuyển Đến Chi Tiết' }).click();
    await page.waitForURL(/\/rnd\/recipes\/[0-9a-f-]+$/);

    const recipeUrl = page.url();
    const recipeId = recipeUrl.split('/').pop() || '';
    const displayedCode =
      (await page.locator('span.font-semibold.text-primary').first().textContent())?.trim() ||
      recipeCode;

    writeRunState({
      ingredientCode,
      ingredientName,
      recipeId,
      recipeVersionId: recipeId,
      recipeCode: displayedCode,
      recipeName,
    });

    // B7: Trang chi tiết, nhãn "Bản nháp", có nút "Phát hành"
    await expect(page.locator('text=Bản nháp >> visible=true').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Phát hành' })).toBeVisible();
    await shot(page, 'b07-recipe-detail-draft', {
      description: 'B7: Trang chi tiết công thức với nhãn "Bản nháp" và nút "Phát hành"',
      spec: SPEC,
    });

    // B8: Ngoại lệ — Bấm "Phát hành" khi thiếu sản lượng -> Thông báo lỗi, vẫn "Bản nháp"
    await page.getByRole('link', { name: 'Chỉnh sửa' }).click();
    await page.waitForURL(`**/rnd/recipes/${recipeId}/edit`);
    // Form sửa nạp dữ liệu bất đồng bộ; chờ nạp xong mới điền để giá trị không bị ghi đè.
    await expect(page.getByLabel(/^Tên Công Thức/i)).toHaveValue(recipeName);
    // Form nạp lại khi phiên đăng nhập làm mới; chờ mạng yên để chữ vừa gõ không bị ghi đè.
    await page.waitForLoadState('networkidle');
    const editYieldInput = page.getByLabel(/^Sản Lượng Mục Tiêu/i);
    await editYieldInput.fill('');
    const editUnitCombo = page.getByRole('combobox', { name: /Đơn Vị Thành Phẩm/i });
    await editUnitCombo.click();
    await page.getByRole('option', { name: 'Chưa thiết lập' }).click();

    await page.getByRole('button', { name: 'Lưu Bản Nháp' }).click();
    await expect(page.getByText('Đã lưu bản nháp').first()).toBeVisible();

    await page.getByRole('link', { name: 'Quay Lại Chi Tiết' }).click();
    await page.waitForURL(`**/rnd/recipes/${recipeId}`);

    await page.getByRole('button', { name: 'Phát hành' }).click();
    await expect(
      page.getByText('Hãy thiết lập sản lượng và đơn vị thành phẩm trước khi phát hành.')
    ).toBeVisible();
    await expect(page.locator('text=Bản nháp >> visible=true').first()).toBeVisible();

    await shot(page, 'b08-publish-missing-yield-error', {
      description: 'B8: Ngoại lệ bấm "Phát hành" khi thiếu sản lượng — hiện lỗi, giữ trạng thái "Bản nháp"',
      spec: SPEC,
    });

    // B9: Bổ sung đủ sản lượng -> bấm "Phát hành" -> Thông báo "Đã phát hành công thức"
    await page.getByRole('link', { name: 'Chỉnh sửa' }).click();
    await page.waitForURL(`**/rnd/recipes/${recipeId}/edit`);
    // Form sửa nạp dữ liệu bất đồng bộ; chờ nạp xong mới điền để giá trị không bị ghi đè.
    await expect(page.getByLabel(/^Tên Công Thức/i)).toHaveValue(recipeName);
    // Form nạp lại khi phiên đăng nhập làm mới; chờ mạng yên để chữ vừa gõ không bị ghi đè.
    await page.waitForLoadState('networkidle');
    await editYieldInput.fill('500');
    await expect(editYieldInput).toHaveValue('500');
    await editUnitCombo.click();
    // Chọn đơn vị hợp lệ đầu tiên sau mục "Chưa thiết lập"
    await page.getByRole('option').nth(1).click();
    await expect(editUnitCombo).not.toHaveText(/Chưa thiết lập/);

    await page.getByRole('button', { name: 'Lưu Bản Nháp' }).click();
    await expect(page.getByText('Đã lưu bản nháp').first()).toBeVisible();

    await page.getByRole('link', { name: 'Quay Lại Chi Tiết' }).click();
    await page.waitForURL(`**/rnd/recipes/${recipeId}`);

    await expect(page.getByText('Sản lượng chuẩn', { exact: true }).first().locator('..')).toContainText('500');
    await page.getByRole('button', { name: 'Phát hành' }).click();
    await expect(page.getByText('Đã phát hành công thức').first()).toBeVisible();

    await shot(page, 'b09-recipe-published-toast', {
      description: 'B9: Bổ sung đủ sản lượng và bấm "Phát hành" — thông báo "Đã phát hành công thức"',
      spec: SPEC,
    });

    // B10: Trang chi tiết, nhãn "Đã phát hành", không còn nút "Phát hành"
    await expect(page.locator('text=Đã phát hành >> visible=true').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Phát hành' })).toHaveCount(0);

    await shot(page, 'b10-recipe-detail-published', {
      description: 'B10: Trang chi tiết công thức với nhãn "Đã phát hành", không còn nút "Phát hành"',
      spec: SPEC,
    });

    // B12: Xuất PDF — màn xem trước
    await page.getByRole('link', { name: 'Xuất bản PDF' }).click();
    await page.waitForURL('**/rnd/documents/new**');

    const previewBtn = page.getByRole('button', { name: 'Cập nhật xem trước' });
    await expect(previewBtn).toBeEnabled({ timeout: 20_000 });
    await previewBtn.click();

    await expect(page.getByText('Bản xem trước sẵn sàng')).toBeVisible({ timeout: 60_000 });
    await shot(page, 'b12-pdf-preview', {
      description: 'B12: Xuất PDF — Màn hình xem trước tài liệu SOP A4 ngang',
      spec: SPEC,
    });
  });

  test('B11: Hộp thoại tạo ảnh AI + ảnh ứng viên (tùy chọn E2E_AI=1)', async ({ page }) => {
    if (!process.env.E2E_AI) {
      await recordManualOrSkipped({
        name: 'b11-ai-image-candidate',
        description: 'B11: Bỏ qua tạo ảnh AI vì chưa đặt biến môi trường E2E_AI=1',
        source: '/rnd/recipes/[id]/edit',
        spec: SPEC,
      });
      test.skip(true, 'Cần đặt E2E_AI=1 kèm khóa Gemini/Cloudflare để kiểm thử tạo ảnh AI');
      return;
    }

    const state = readRunState();
    await loginAs(page, 'rnd');

    // Tạo bản nháp riêng cho B11 để không làm fork v1 Published trước khi chạy Spec C
    await page.goto('/rnd/recipes/new');
    const shortTag = getShortTag();
    await page.getByPlaceholder('VD: REC-001').fill(`REC-AI-${shortTag}`);
    await page.getByPlaceholder('VD: Trà Ô Long Sữa Nướng Trân Châu').fill(
      state.recipeName ? `${state.recipeName} AI` : `Trà AI ${shortTag}`
    );
    await page.getByRole('button', { name: 'Lưu Bản Nháp & Chuyển Đến Chi Tiết' }).click();
    await page.waitForURL(/\/rnd\/recipes\/[0-9a-f-]+$/);

    await page.getByRole('link', { name: 'Chỉnh sửa' }).click();
    await page.waitForURL('**/edit');

    await page.getByRole('button', { name: 'Tạo bằng AI' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Bắt Đầu Tạo Ảnh Với AI' }).click();
    await expect(dialog.locator('img[alt="AI Concept"]')).toBeVisible({ timeout: 110_000 });

    await shot(page, 'b11-ai-image-candidate', {
      description: 'B11: Hộp thoại tạo ảnh AI và ảnh ứng viên thành phẩm',
      spec: SPEC,
    });
  });
});
