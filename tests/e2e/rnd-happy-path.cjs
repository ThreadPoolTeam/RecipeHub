// Run: set NODE_PATH=<npm global node_modules> && node tests/e2e/rnd-happy-path.cjs
// Destructive actions are restricted to records created by this run; published records may remain archived.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.E2E_BASE_URL || 'http://localhost:3000';
const out = path.resolve('docs/plans/261109-1951-web-ui-figma-refactor/reports/e2e');
const tag = 'E2E-' + Date.now().toString().slice(-7);
const state = { tag, errors: [], http: [], expectedHttp: [], remaining: [], results: [] };
const readOnly = process.argv.includes('--read-only');

const isIdentityUsers = url => { try { return new URL(url).pathname === '/api/backend/api/v1/identity/users'; } catch { return false; } };

async function scenario(name, email, fn) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await context.newPage(); p.setDefaultTimeout(12000);
  p.on('pageerror', e => state.errors.push({ name, error: e.message }));
  p.on('console', m => {
    if (m.type() === 'error' && !(isIdentityUsers(m.location().url) && /status of 403\b/.test(m.text())))
      state.errors.push({ name, error: m.text() });
  });
  p.on('response', r => {
    if (r.status() < 400) return;
    const entry = { name, status: r.status(), url: r.url() };
    (r.status() === 403 && isIdentityUsers(r.url()) ? state.expectedHttp : state.http).push(entry);
  });
  try {
    await p.goto(base + '/login');
    await p.locator('input[type=email]').fill(email);
    await p.locator('input[type=password]').fill(process.env.E2E_PASSWORD || 'Demo@1234');
    await p.getByRole('button', { name: 'Đăng nhập' }).click();
    await p.waitForURL(email.startsWith('viewer') ? '**/viewer/**' : '**/rnd/**', { timeout: 30000 });
    await fn(p);
    state.results.push({ name, result: 'PASS' });
    return true;
  } catch (e) {
    state.results.push({ name, result: 'FAIL', error: e.message });
    await p.screenshot({ path: path.join(out, `run-${name}-failure.png`), fullPage: true }).catch(() => {});
    return false;
  } finally { await browser.close(); }
}
const rd = process.env.E2E_RD_EMAIL || 'rd@recipehub.demo';
const viewer = process.env.E2E_VIEWER_EMAIL || 'viewer@recipehub.demo';
const button = (p, name) => p.getByRole('button', { name, exact: true });
const link = (p, name) => p.getByRole('link', { name, exact: true });

async function main() {
  await fs.mkdir(out, { recursive: true });
  await scenario('navigation', rd, async p => {
    const routes = [['Tổng quan R&D','/rnd'],['Công thức đồ uống','/rnd/recipes'],['Kho nguyên liệu','/rnd/ingredients'],['Đại lượng & Đơn vị đo','/rnd/catalogue'],['Tư liệu hình ảnh','/rnd/media'],['Tài liệu PDF','/rnd/documents'],['Bộ Quiz','/rnd/quizzes'],['Kết quả làm bài','/rnd/quizzes/results']];
    for (const [name, route] of routes) {
      await link(p, name).first().click(); await p.waitForURL(url => url.pathname === route);
      const h = p.locator('h1').first(); await h.waitFor();
      const style = await h.evaluate(e => ({ font: getComputedStyle(e).fontFamily, weight: getComputedStyle(e).fontWeight }));
      assert.match(style.font, /Outfit/i); assert.equal(style.weight, '500');
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await p.setViewportSize({ width: 390, height: 844 });
    for (const route of ['/rnd/recipes','/rnd/ingredients','/rnd/quizzes']) {
      await p.goto(base + route); await p.locator('h1').first().waitFor();
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
  });
  if (readOnly) return;
  await scenario('catalogue', rd, async p => {
    await link(p, 'Đại lượng & Đơn vị đo').click(); await p.waitForURL('**/rnd/catalogue');
    await p.getByText('Khối lượng', { exact: true }).click(); await button(p, 'Thêm đơn vị khối lượng').click();
    await p.getByPlaceholder('VD: ML').fill(tag); await p.getByPlaceholder('VD: Mililit').fill(tag + ' don vi');
    await button(p, 'Lưu đơn vị').click(); const row = p.locator('tr').filter({ hasText: tag }); await row.waitFor();
    await row.getByRole('button', { name: 'Chỉnh sửa đơn vị' }).click(); await p.getByPlaceholder('VD: Mililit').fill(tag + ' da sua');
    await button(p, 'Lưu đơn vị').click(); await p.getByText(tag + ' da sua', { exact: true }).first().waitFor();
    await row.getByRole('button', { name: 'Đang dùng' }).click(); await row.getByRole('button', { name: 'Tạm khóa' }).waitFor();
    state.remaining.push(`${tag} đơn vị: tạm khóa`);
  });
  const ingredientReady = await scenario('ingredient', rd, async p => {
    await link(p, 'Kho nguyên liệu').click(); await link(p, 'Thêm nguyên liệu').click(); await p.waitForURL('**/rnd/ingredients/new');
    await p.getByPlaceholder('VD: ING-TRA-001').fill(tag + '-ING'); await p.getByPlaceholder('VD: Trà Ô Long Rang Thượng Hạng').fill(tag + ' Tra');
    await p.locator('select').nth(0).selectOption({ label: 'Trà' }); await p.locator('select').nth(1).selectOption({ label: 'Khối lượng' });
    await button(p, 'Lưu Nguyên Liệu').click(); await p.waitForURL('**/rnd/ingredients'); state.ingredientCreated = true; await link(p, tag + ' Tra').click(); await p.waitForURL('**/edit');
    await button(p, 'Chọn từ thư viện').click(); await p.getByRole('dialog').getByRole('button').filter({ has: p.locator('img') }).first().click();
    await button(p, 'Lưu Thay Đổi').click(); await p.waitForURL('**/rnd/ingredients');
    const card = p.locator('article').filter({ hasText: tag + '-ING' }); await card.locator('img').waitFor();
    await p.reload(); await link(p, tag + ' Tra').click(); await p.waitForURL('**/edit');
    await button(p, 'Gỡ ảnh').click(); await p.getByPlaceholder('VD: Trà Ô Long Rang Thượng Hạng').fill(tag + ' Tra sua');
    await button(p, 'Lưu Thay Đổi').click(); await p.waitForURL('**/rnd/ingredients');
    await link(p, tag + ' Tra sua').waitFor();
    assert.equal(await p.locator('article').filter({ hasText: tag + '-ING' }).locator('img').count(), 0);
  });
  const mediaReady = await scenario('media', rd, async p => {
    await link(p, 'Tư liệu hình ảnh').click(); await p.waitForURL('**/rnd/media');
    const data = await fs.readFile('src/frontend/public/landing/figma/cat-ca-phe.png');
    await p.locator('input[type=file]').setInputFiles({ name: tag + '-image.png', mimeType: 'image/png', buffer: data });
    const image = p.getByRole('button', { name: tag + '-image.png' }); await image.waitFor({ timeout: 60000 }); await image.click();
    await p.getByRole('dialog').waitFor(); await p.keyboard.press('Escape'); assert.equal(await p.getByRole('dialog').count(), 0);
    state.remaining.push(`${tag}-image.png: kiểm tra tham chiếu trước khi dọn`);
  });
  const recipeReady = ingredientReady && mediaReady ? await scenario('recipe', rd, async p => {
    await link(p, 'Tạo công thức mới').click(); await p.waitForURL('**/rnd/recipes/new');
    await p.getByPlaceholder('VD: REC-001').fill(tag + '-REC'); await p.getByPlaceholder('VD: Trà Ô Long Sữa Nướng Trân Châu').fill(tag + ' Công thức');
    await p.getByRole('button', { name: '02Thành phần & định lượng' }).click(); await button(p, '+ Thêm Nguyên Liệu Đầu Tiên').click();
    await button(p, '+ Thêm Nguyên Liệu').click(); await p.locator('select').nth(2).selectOption({ label: tag + '-ING - ' + tag + ' Tra sua (g)' });
    await p.getByRole('button', { name: '03Quy trình SOP' }).click(); await button(p, '+ Thêm Bước Thao Tác').click();
    await p.getByPlaceholder('Mô tả kỹ thuật ủ trà, đánh bọt, rót tầng hoặc lắc shaker...').nth(1).fill(tag + ' Khuấy đều.');
    await button(p, 'Lưu Bản Nháp & Chuyển Đến Chi Tiết').click(); await p.waitForURL(/\/rnd\/recipes\/[0-9a-f-]+$/); state.recipe = p.url();
    await p.getByRole('link', { name: 'Chỉnh sửa' }).click(); await p.waitForURL('**/edit');
    await p.getByRole('button', { name: 'Chọn từ thư viện' }).last().click(); await p.getByRole('dialog').getByRole('button', { name: tag + '-image.png' }).click();
    await p.getByRole('button', { name: '03  Quy trình SOP' }).click(); await p.getByRole('button', { name: 'Chọn từ thư viện' }).first().click();
    await p.getByRole('dialog').getByRole('button', { name: tag + '-image.png' }).click(); await button(p, 'Lưu Bản Nháp').click();
    await button(p, 'Tạo bằng AI').click(); await p.getByRole('dialog').waitFor(); await p.keyboard.press('Escape');
    await p.getByRole('link', { name: 'Quay Lại Chi Tiết' }).click(); await p.waitForURL(state.recipe); await button(p, 'Phát hành').click();
    await p.getByText('Đã phát hành', { exact: true }).first().waitFor();
  }) : (state.results.push({ name: 'recipe', result: 'BLOCKED', error: 'Nguyên liệu hoặc ảnh chưa sẵn sàng' }), false);
  if (!recipeReady) state.results.push({ name: 'pdf', result: 'BLOCKED', error: 'Công thức chưa phát hành' });
  else await scenario('pdf', rd, async p => {
    await link(p, 'Tài liệu PDF').click(); await link(p, 'Tạo ấn phẩm').click(); await p.waitForURL('**/rnd/documents/new');
    await p.locator('label').filter({ hasText: tag + ' Công thức' }).locator('input[type=checkbox]').check();
    await p.getByPlaceholder('Tên tài liệu PDF...').fill(tag + ' Ấn phẩm'); await button(p, 'Cập nhật xem trước').click();
    await p.getByText('Bản xem trước sẵn sàng').waitFor({ timeout: 60000 }); await button(p, 'Xuất chính thức').click();
    await p.waitForURL('**/rnd/documents', { timeout: 60000 });
    const documentCard = p.locator('article').filter({ hasText: tag + ' Ấn phẩm' });
    await documentCard.waitFor();
    const download = p.waitForEvent('download', { timeout: 60000 });
    await documentCard.getByRole('button', { name: 'Tải PDF' }).click();
    const pdf = await (await download).path();
    assert.equal((await fs.readFile(pdf)).subarray(0, 5).toString(), '%PDF-');
    state.remaining.push(`${tag} ấn phẩm PDF: không có chức năng xóa`);
  });
  const quizReady = recipeReady ? await scenario('quiz', rd, async p => {
    await link(p, 'Bộ Quiz').click(); await link(p, 'Tạo bộ đề').click(); await p.waitForURL('**/rnd/quizzes/new');
    await p.getByPlaceholder('Ví dụ: Cà phê phin chuẩn nhập môn').fill(tag + ' Quiz'); await p.getByPlaceholder('VD: QZ-CAPHE-01').fill(tag + '-QUIZ');
    await p.locator('label').filter({ hasText: tag + ' Công thức' }).click(); await button(p, 'Tạo và soạn câu hỏi').click();
    await p.waitForURL(/\/rnd\/quizzes\/[0-9a-f-]+/); state.quiz = p.url();
    for (let n = 1; n <= 2; n++) {
      await button(p, 'Thêm câu hỏi').click(); const d = p.getByRole('dialog'); await d.locator('textarea').first().fill(`${tag} Câu hỏi ${n}`);
      for (let i = 0; i < 4; i++) await d.locator('input:not([type=radio])').nth(i).fill(`Lựa chọn ${i + 1}`);
      await d.getByRole('radio', { name: 'Đáp án A là đúng' }).check(); await d.locator('textarea').nth(1).fill('Lựa chọn đầu tiên là đúng.');
      await d.getByRole('button', { name: 'Áp dụng câu hỏi' }).click();
    }
    await button(p, 'Lưu bản nháp').click(); await button(p, 'Ban hành').click(); await p.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click();
    await p.getByText('Đã ban hành', { exact: false }).first().waitFor();
  }) : (state.results.push({ name: 'quiz', result: 'BLOCKED', error: 'Công thức chưa phát hành' }), false);
  const viewerReady = quizReady ? await scenario('viewer', viewer, async p => {
    await link(p, 'Bài kiểm tra').click(); await link(p, tag + ' Quiz').click(); await button(p, 'Bắt đầu làm bài').click();
    await p.getByText('Lựa chọn 1', { exact: true }).click(); await button(p, 'Câu tiếp').click(); await p.getByText('Lựa chọn 1', { exact: true }).click();
    await button(p, 'Hoàn thành & nộp bài').click(); await button(p, 'Xác nhận nộp bài').click(); await p.getByText('100%', { exact: true }).first().waitFor();
  }) : (state.results.push({ name: 'viewer', result: 'BLOCKED', error: 'Quiz chưa ban hành' }), false);
  if (!viewerReady) state.results.push({ name: 'results', result: 'BLOCKED', error: 'Chưa có lượt làm bài' });
  else await scenario('results', rd, async p => {
    await link(p, 'Kết quả làm bài').click(); await link(p, tag + ' Quiz').click(); await p.getByText(tag + ' Câu hỏi 1').waitFor();
  });
  await scenario('cleanup', rd, async p => {
    const clean = async (name, fn) => { try { await fn(); } catch (e) { state.remaining.push(`${tag} ${name}: dọn thất bại - ${e.message}`); } };
    await clean('quiz', async () => {
      if (!state.quiz) {
        await p.goto(base + '/rnd/quizzes'); await p.waitForLoadState('networkidle').catch(() => {});
        const card = p.locator('article').filter({ hasText: tag + '-QUIZ' });
        if (await card.count()) { const href = await card.locator('a[href*="/rnd/quizzes/"]').first().getAttribute('href'); if (href) state.quiz = new URL(href, base).href; }
      }
      if (!state.quiz) return;
      await p.goto(state.quiz); await button(p, 'Lưu trữ').click(); await p.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click();
      state.remaining.push(`${tag} quiz: đã lưu trữ${viewerReady ? ', lượt làm được giữ lại' : ''}`);
    });
    await clean('công thức', async () => {
      if (!state.recipe) {
        await p.goto(base + '/rnd/recipes'); await p.waitForLoadState('networkidle').catch(() => {});
        const card = p.locator('article').filter({ hasText: tag + '-REC' });
        if (await card.count()) { const href = await card.locator('a[href*="/rnd/recipes/"]').first().getAttribute('href'); if (href) state.recipe = new URL(href, base).href; }
      }
      if (!state.recipe) return;
      await p.goto(state.recipe); await button(p, 'Lưu trữ').click(); await p.getByRole('dialog').getByRole('button', { name: 'Xác Nhận Lưu Trữ' }).click();
      state.remaining.push(`${tag} công thức: đã lưu trữ`);
    });
    await clean('nguyên liệu', async () => {
      if (!state.ingredientCreated) return;
      await p.goto(base + '/rnd/ingredients'); const card = p.locator('article').filter({ hasText: tag + '-ING' });
      await card.waitFor();
      const toggle = card.getByRole('button', { name: 'Đang dùng' });
      if (await toggle.count()) await toggle.click();
      await card.getByRole('button', { name: 'Tạm khóa' }).waitFor();
      state.remaining.push(`${tag} nguyên liệu: tạm khóa`);
    });
    await clean('đơn vị', async () => {
      await p.goto(base + '/rnd/catalogue'); await p.getByText('Khối lượng', { exact: true }).click();
      const row = p.locator('tr').filter({ hasText: tag }); const toggle = row.getByRole('button', { name: 'Đang dùng' });
      if (await toggle.count()) { await toggle.click(); state.remaining.push(`${tag} đơn vị: tạm khóa`); }
    });
  });
}
main().catch(e => state.errors.push({ name: 'runner', error: e.message })).finally(async () => {
  await fs.writeFile(path.join(out, 'playwright-last-run.json'), JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2)); if (state.results.some(r => r.result !== 'PASS') || state.errors.length || state.http.length) process.exitCode = 1;
});
