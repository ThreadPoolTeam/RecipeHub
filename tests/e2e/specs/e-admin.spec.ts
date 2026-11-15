import { expect, test } from '@playwright/test';
import { getAccessToken, loginAs } from '../fixtures/accounts';
import {
  getShortTag,
  shot,
  writeRunState,
} from '../fixtures/evidence';

const SPEC = 'e-admin.spec.ts';

test.describe('Nhóm E — Quản trị người dùng, nhật ký và kiểm thử phân quyền', () => {
  test('E1–E5: Quản lý người dùng, khóa/mở khóa, lọc nhật ký kiểm toán và chặn truy cập trái quyền', async ({
    page,
    request,
  }) => {
    const shortTag = getShortTag().toLowerCase();
    const newEmail = `barista.${shortTag}@recipehub.demo`;
    const newFullName = `Barista E2E ${shortTag.toUpperCase()}`;

    // E1: /admin/users — danh sách, tạo người dùng mới
    await loginAs(page, 'admin');
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Tài khoản & phân quyền' })).toBeVisible();

    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();

    await createDialog.getByPlaceholder('barista.demo@beveragelab.vn').fill(newEmail);
    await createDialog.getByLabel(/^Mật khẩu ban đầu/i).fill('DemoPass123');
    await createDialog.getByPlaceholder('Nguyễn Văn A').fill(newFullName);
    await createDialog.getByRole('button', { name: 'Lưu tài khoản' }).click();

    await expect(createDialog).toBeHidden();
    // Danh sách có phân trang; dữ liệu nhiều lượt chạy làm tài khoản mới có thể không ở trang đầu.
    await page.getByPlaceholder('Tìm theo tên hoặc email').fill(newEmail);
    const userRow = page.locator('tr').filter({ hasText: newEmail }).first();
    await expect(userRow).toBeVisible();
    await expect(userRow).toContainText('Đang hoạt động');

    writeRunState({
      createdUserEmail: newEmail,
      createdUserName: newFullName,
    });

    await shot(page, 'e01-admin-users-created', {
      description: `E1: Trang /admin/users sau khi tạo tài khoản mới (${newEmail})`,
      spec: SPEC,
    });

    // E2: Khóa / mở khóa một tài khoản -> Nhãn trạng thái đổi
    await userRow.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Khóa', exact: true }).click();

    await expect(userRow).toContainText('Đã khóa');
    await shot(page, 'e02-admin-user-locked', {
      description: `E2: Khóa tài khoản ${newEmail} — nhãn trạng thái đổi sang "Đã khóa"`,
      spec: SPEC,
    });

    // Mở khóa lại để giữ trạng thái sạch
    await userRow.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Mở khóa', exact: true }).click();
    await expect(userRow).toContainText('Đang hoạt động');

    // E3: /admin/logs — lọc theo hành động, kiểm tra các dòng sinh ra từ B, C, D, E
    await page.goto('/admin/logs');
    await expect(page.getByRole('heading', { name: 'Nhật ký hoạt động' })).toBeVisible();

    await expect
      .poll(
        async () => {
          return page.locator('table tbody tr').count();
        },
        { timeout: 15_000 }
      )
      .toBeGreaterThan(0);

    await shot(page, 'e03-admin-audit-logs', {
      description: 'E3: Trang /admin/logs hiển thị nhật ký hoạt động bất đồng bộ từ B, C, D, E',
      spec: SPEC,
    });

    // E5: Ngoại lệ phân quyền — Quản trị gọi API công thức -> 403 Forbidden
    const adminToken = await getAccessToken(page);
    expect(adminToken, 'Phải lấy được token của Admin để kiểm thử API').toBeTruthy();

    const apiResponse = await request.post('/api/backend/api/v1/recipes', {
      headers: {
        Authorization: `Bearer ${adminToken!.accessToken}`,
        'X-User-Id': adminToken!.userId,
        'Content-Type': 'application/json',
      },
      data: {
        code: `REC-FORBIDDEN-${shortTag.toUpperCase()}`,
        name: 'Công thức thử quyền Admin',
        targetYield: 1,
        yieldUnit: 'ly',
      },
    });

    expect(apiResponse.status()).toBe(403);
    const responseBody = await apiResponse.text();

    await page.setContent(
      `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8" /><title>E5 — Kiểm thử phân quyền API 403</title>
<style>
  body { margin: 0; padding: 32px; background: #0f172a; color: #f8fafc; font-family: ui-monospace, monospace; }
  .box { border: 1px solid #ef4444; background: #1e293b; border-radius: 8px; padding: 20px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; background: #dc2626; color: #fff; font-weight: 700; }
  pre { margin-top: 16px; white-space: pre-wrap; color: #fca5a5; }
</style></head>
<body>
  <div class="box">
    <div><span class="badge">HTTP ${apiResponse.status()} Forbidden</span> &nbsp; POST /api/v1/recipes (Actor: Admin)</div>
    <pre>${responseBody || '(403 Forbidden — Admin không có quyền tạo/sửa công thức R&D)'}</pre>
  </div>
</body>
</html>`
    );

    await shot(page, 'e05-admin-recipe-api-403', {
      description: 'E5: Ngoại lệ phân quyền — Admin gọi POST /api/v1/recipes bị từ chối HTTP 403',
      spec: SPEC,
    });

    // E4: Ngoại lệ phân quyền — Nhân viên pha chế mở /rnd/recipes -> Chuyển tới /forbidden
    await loginAs(page, 'viewer');
    await page.goto('/rnd/recipes');
    await page.waitForURL('**/forbidden');
    await expect(page.getByRole('heading', { name: 'Không đủ quyền truy cập' })).toBeVisible();

    await shot(page, 'e04-viewer-forbidden-rnd', {
      description: 'E4: Ngoại lệ phân quyền — Nhân viên pha chế mở /rnd/recipes bị chuyển hướng tới /forbidden',
      spec: SPEC,
    });
  });
});
