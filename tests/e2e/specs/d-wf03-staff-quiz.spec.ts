import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/accounts';
import {
  getRunId,
  getShortTag,
  readRunState,
  shot,
  writeRunState,
} from '../fixtures/evidence';

const SPEC = 'd-wf03-staff-quiz.spec.ts';

test.describe('Nhóm D — Luồng 3: Kiểm tra kiến thức nhân viên pha chế (Quiz)', () => {
  test('D1–D11: R&D tạo và ban hành bộ câu hỏi, nhân viên làm bài đạt/chưa đạt và kiểm tra lịch sử hai phía', async ({
    page,
  }) => {
    const state = readRunState();
    expect(
      state.recipeName,
      'Cần chạy Spec B trước để có công thức đã phát hành cho bộ đề Quiz'
    ).toBeTruthy();

    const runId = getRunId();
    const shortTag = getShortTag();
    const quizCode = `QZ-${shortTag}`;
    const quizTitle = `Kiểm tra SOP ${runId}`;

    // D1: Tạo bộ câu hỏi gắn với công thức đã phát hành (R&D)
    await loginAs(page, 'rnd');
    await page.goto('/rnd/quizzes/new');
    await expect(page.getByRole('heading', { name: 'Tạo bộ đề mới' })).toBeVisible();

    await page.getByPlaceholder('Ví dụ: Cà phê phin chuẩn nhập môn').fill(quizTitle);
    await page.getByPlaceholder('VD: QZ-CAPHE-01').fill(quizCode);
    await page.getByLabel(/^Điểm đạt/i).fill('80');
    await page
      .getByPlaceholder('Mục tiêu và phạm vi kiến thức của bộ đề.')
      .fill(`Đánh giá nắm vững SOP công thức ${state.recipeName}.`);

    const recipeLabel = page.locator('label').filter({ hasText: state.recipeName! }).first();
    await expect(recipeLabel).toBeVisible({ timeout: 15_000 });
    await recipeLabel.click();

    await shot(page, 'd01-create-quiz-linked-recipe', {
      description: `D1: R&D tạo bộ câu hỏi gắn với công thức đã phát hành (${quizCode})`,
      spec: SPEC,
    });

    await page.getByRole('button', { name: 'Tạo và soạn câu hỏi' }).click();
    await page.waitForURL(/\/rnd\/quizzes\/[0-9a-f-]+\?version=1/);

    const parsedUrl = new URL(page.url());
    const quizId = parsedUrl.pathname.split('/').pop() || '';
    writeRunState({
      quizId,
      quizVersion: 1,
      quizCode,
      quizTitle,
    });

    // D2: Thêm câu hỏi, đặt ngưỡng đạt (R&D)
    for (let n = 1; n <= 2; n++) {
      await page.getByRole('button', { name: 'Thêm câu hỏi' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await dialog.locator('textarea').first().fill(`Câu hỏi SOP số ${n} (${runId}): Nhiệt độ và định lượng chuẩn là gì?`);
      const textInputs = dialog.locator('input:not([type="radio"])');
      for (let i = 0; i < 4; i++) {
        await textInputs.nth(i).fill(`Lựa chọn ${i + 1}`);
      }
      await dialog.getByRole('radio', { name: 'Đáp án A là đúng' }).check();
      await dialog.locator('textarea').nth(1).fill('Lựa chọn 1 (Đáp án A) đúng theo quy trình SOP đã ban hành.');
      await dialog.getByRole('button', { name: 'Áp dụng câu hỏi' }).click();
      await expect(dialog).toBeHidden();
    }

    await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
    await expect(page.getByText('Đang hiển thị nội dung đã lưu')).toBeVisible();

    await shot(page, 'd02-quiz-questions-and-threshold', {
      description: 'D2: R&D thêm 2 câu hỏi, ngưỡng đạt 80% và lưu bản nháp',
      spec: SPEC,
    });

    // D3: Bấm "Ban hành" -> Nhãn "Đã ban hành", nội dung khóa
    await page.getByRole('button', { name: 'Ban hành' }).click();
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Xác nhận' }).click();

    await expect(page.getByText(/Đã ban hành/).first()).toBeVisible();
    await expect(
      page.getByText('Nội dung đã khóa. Nhân bản phiên bản để tiếp tục chỉnh sửa.')
    ).toBeVisible();

    await shot(page, 'd03-quiz-published-locked', {
      description: 'D3: R&D ban hành bộ đề — nhãn "Đã ban hành" và thông báo khóa nội dung',
      spec: SPEC,
    });

    // D4: Danh sách bài kiểm tra (Nhân viên pha chế)
    await loginAs(page, 'viewer');
    await page.goto('/viewer/quizzes');
    await expect(page.getByRole('heading', { name: 'Bài kiểm tra dành cho bạn' })).toBeVisible();
    await expect(page.getByText(quizTitle).first()).toBeVisible();

    await shot(page, 'd04-viewer-quiz-list', {
      description: 'D4: Nhân viên pha chế thấy bộ đề vừa ban hành trong danh sách bài kiểm tra',
      spec: SPEC,
    });

    // D5: Màn bắt đầu: số câu, ngưỡng đạt
    await page.getByRole('link', { name: new RegExp(quizTitle) }).first().click();
    await page.waitForURL(`**/viewer/quizzes/${quizId}**`);
    await expect(page.getByText('2 câu hỏi')).toBeVisible();
    await expect(page.getByText('Đạt từ 80%')).toBeVisible();

    await shot(page, 'd05-viewer-quiz-start-screen', {
      description: 'D5: Màn hình bắt đầu làm bài — hiển thị 2 câu hỏi, ngưỡng đạt 80%',
      spec: SPEC,
    });

    // D6: Đang làm bài (Lượt 1 — chọn đáp án đúng "Lựa chọn 1")
    await page.getByRole('button', { name: /Bắt đầu làm bài/ }).click();
    await page.waitForURL(/\/viewer\/quizzes\/attempts\/[0-9a-f-]+$/);

    await page.getByText('Lựa chọn 1', { exact: true }).click();
    await expect(page.getByText('Đáp án đã được lưu')).toBeVisible();

    await shot(page, 'd06-viewer-quiz-taking', {
      description: 'D6: Nhân viên pha chế đang làm bài kiểm tra và tự động lưu đáp án',
      spec: SPEC,
    });

    await page.getByRole('button', { name: /Câu tiếp/ }).click();
    await page.getByText('Lựa chọn 1', { exact: true }).click();
    await expect(page.getByText('Đáp án đã được lưu')).toBeVisible();

    // D7: Xác nhận nộp bài
    await page.getByRole('button', { name: 'Hoàn thành & nộp bài' }).click();
    const submitDialog = page.getByRole('dialog');
    await expect(submitDialog).toBeVisible();
    await expect(submitDialog.getByRole('heading', { name: 'Sẵn sàng nộp bài?' })).toBeVisible();

    await shot(page, 'd07-viewer-quiz-confirm-submit', {
      description: 'D7: Hộp thoại xác nhận nộp bài kiểm tra (2/2 câu đã trả lời)',
      spec: SPEC,
    });

    // D8: Kết quả "Đạt yêu cầu" + điểm do máy chủ chấm
    await submitDialog.getByRole('button', { name: 'Xác nhận nộp bài' }).click();
    await page.waitForURL(/\/viewer\/quizzes\/attempts\/[0-9a-f-]+\/result$/);

    await expect(page.getByText('Đạt yêu cầu').first()).toBeVisible();
    await expect(page.getByText('Điểm do máy chủ chấm')).toBeVisible();
    await expect(page.getByText('100')).toBeVisible();

    await shot(page, 'd08-viewer-quiz-passed', {
      description: 'D8: Kết quả "Đạt yêu cầu" (100% — điểm do máy chủ chấm)',
      spec: SPEC,
    });

    // D9: Ngoại lệ — Làm lại, cố ý chọn sai ("Lựa chọn 2") -> "Chưa đạt yêu cầu"
    await page.getByRole('link', { name: /Về bộ đề & làm lại/ }).click();
    await page.waitForURL(`**/viewer/quizzes/${quizId}**`);

    await page.getByRole('button', { name: /Bắt đầu làm bài/ }).click();
    await page.waitForURL(/\/viewer\/quizzes\/attempts\/[0-9a-f-]+$/);

    await page.getByText('Lựa chọn 2', { exact: true }).click();
    await expect(page.getByText('Đáp án đã được lưu')).toBeVisible();
    await page.getByRole('button', { name: /Câu tiếp/ }).click();
    await page.getByText('Lựa chọn 2', { exact: true }).click();
    await expect(page.getByText('Đáp án đã được lưu')).toBeVisible();

    await page.getByRole('button', { name: 'Hoàn thành & nộp bài' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận nộp bài' }).click();
    await page.waitForURL(/\/viewer\/quizzes\/attempts\/[0-9a-f-]+\/result$/);

    await expect(page.getByText('Chưa đạt yêu cầu').first()).toBeVisible();
    await shot(page, 'd09-viewer-quiz-failed', {
      description: 'D9: Ngoại lệ làm lại cố ý chọn sai — kết quả "Chưa đạt yêu cầu" (0%)',
      spec: SPEC,
    });

    // D10: Lịch sử làm bài phía nhân viên: 2 lượt
    await page.goto(`/viewer/quizzes/history?quizId=${encodeURIComponent(quizId)}&version=1`);
    await expect(page.getByRole('heading', { name: 'Lịch sử làm bài Quiz' })).toBeVisible();
    await expect(page.getByText('Đạt yêu cầu').first()).toBeVisible();
    await expect(page.getByText('Chưa đạt').first()).toBeVisible();

    await shot(page, 'd10-viewer-quiz-history', {
      description: 'D10: Lịch sử làm bài của nhân viên hiển thị đủ 2 lượt (1 Đạt, 1 Chưa đạt)',
      spec: SPEC,
    });

    // D11: Kết quả làm bài phía quản lý (R&D): thấy 2 lượt
    await loginAs(page, 'rnd');
    await page.goto(`/rnd/quizzes/results?quizId=${encodeURIComponent(quizId)}&version=1`);
    await expect(page.getByRole('heading', { name: 'Kết quả làm bài' })).toBeVisible();
    await expect(page.locator('article').filter({ hasText: quizTitle })).toHaveCount(2);

    await shot(page, 'd11-rnd-quiz-results', {
      description: 'D11: Trang kết quả làm bài phía R&D hiển thị đủ 2 lượt làm bài của nhân viên',
      spec: SPEC,
    });
  });
});
