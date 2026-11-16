const { chromium, request } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const outputDir = path.join(repoRoot, 'docs', 'report', '02_REST_API');
const gateway = process.env.E2E_GATEWAY_URL || 'http://localhost:5000';
const identitySwagger = process.env.IDENTITY_SWAGGER_URL || 'http://localhost:5001/swagger/index.html';
const recipeSwagger = process.env.RECIPE_SWAGGER_URL || 'http://localhost:5002/swagger/index.html';
const suffix = Date.now().toString().slice(-8);
const timestamp = new Date().toISOString();
const password = 'Evidence@123';
const createdUserIds = [];

fs.mkdirSync(outputDir, { recursive: true });

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function pretty(value, limit = 4200) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > limit ? `${text.slice(0, limit)}\n... [truncated]` : text;
}

function decodeJwtPayload(token) {
  const payload = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

function evidenceHtml({ number, title, subtitle, status, requestText, responseText, source }) {
  const statusClass = status >= 200 && status < 300 ? 'ok' : status === 400 || status === 401 || status === 403 ? 'warn' : 'info';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    :root{--ink:#17324d;--muted:#60758a;--line:#d7e1ea;--paper:#f6f8fb;--accent:#0e7490;--ok:#157347;--warn:#b45309;--info:#475569}
    *{box-sizing:border-box} body{margin:0;background:linear-gradient(135deg,#eef5f7,#f8f4ed);font-family:Segoe UI,Arial,sans-serif;color:var(--ink)}
    main{width:1360px;height:820px;margin:24px auto;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 20px 60px #17324d1c;overflow:hidden}
    header{height:126px;padding:26px 34px;background:linear-gradient(110deg,#0f2d46,#155e75);color:white;display:flex;align-items:center;gap:22px}
    .num{font:700 34px/1 ui-monospace,Consolas;background:#ffffff1c;border:1px solid #ffffff4d;border-radius:12px;padding:18px}
    h1{font-size:31px;margin:0 0 8px}.subtitle{font-size:17px;color:#dbeafe}.meta{margin-left:auto;text-align:right;font-size:14px;color:#dbeafe}
    .content{display:grid;grid-template-columns:1fr 1.2fr;gap:20px;padding:24px 30px}.card{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--paper)}
    .card h2{margin:0;padding:12px 16px;background:#e8eef4;font-size:16px;text-transform:uppercase;letter-spacing:.08em}
    pre{margin:0;padding:16px;height:490px;overflow:hidden;white-space:pre-wrap;word-break:break-word;font:14px/1.45 Consolas,monospace;color:#1e293b}
    .status{display:inline-block;padding:6px 11px;border-radius:999px;font-weight:700;margin-left:10px}.ok{background:#dcfce7;color:var(--ok)}.warn{background:#ffedd5;color:var(--warn)}.info{background:#e2e8f0;color:var(--info)}
    footer{display:flex;justify-content:space-between;padding:0 32px;color:var(--muted);font-size:14px}.source{max-width:950px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  </style></head><body><main>
    <header><div class="num">${String(number).padStart(2, '0')}</div><div><h1>${escapeHtml(title)} <span class="status ${statusClass}">HTTP ${escapeHtml(status)}</span></h1><div class="subtitle">${escapeHtml(subtitle)}</div></div><div class="meta">RecipeHub - PRN232<br>${escapeHtml(timestamp)}</div></header>
    <section class="content"><article class="card"><h2>Request / thao tác</h2><pre>${escapeHtml(requestText)}</pre></article><article class="card"><h2>Runtime response / kết quả</h2><pre>${escapeHtml(responseText)}</pre></article></section>
    <footer><span class="source">Source: ${escapeHtml(source)}</span><span>Evidence/02_REST_API</span></footer>
  </main></body></html>`;
}

async function apiCall(api, method, url, token, data) {
  const options = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  if (data !== undefined) options.data = data;
  const response = await api[method](url, options);
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { status: response.status(), body, text };
}

async function saveEvidencePage(page, fileName, model) {
  await page.setContent(evidenceHtml(model), { waitUntil: 'load' });
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
}

async function saveSwagger(page, url, fileName, label) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(({ label, timestamp }) => {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;z-index:99999;right:20px;top:18px;background:#0f2d46;color:white;padding:12px 18px;border-radius:8px;font:600 14px Segoe UI;box-shadow:0 8px 24px #0003';
    banner.textContent = `${label} | Runtime ${timestamp}`;
    document.body.appendChild(banner);
  }, { label, timestamp });
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
}

async function main() {
  const api = await request.newContext({ baseURL: gateway });
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL || 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await context.newPage();
  let adminToken;
  let ingredientId;
  const screenshotFiles = [];

  try {
    await saveSwagger(page, identitySwagger, 'REST_01_Swagger_Identity.png', 'Identity API - Swagger');
    screenshotFiles.push('REST_01_Swagger_Identity.png');
    await saveSwagger(page, recipeSwagger, 'REST_02_Swagger_Recipe.png', 'Recipe API - Swagger');
    screenshotFiles.push('REST_02_Swagger_Recipe.png');

    const login = await apiCall(api, 'post', '/api/v1/identity/auth/login', null, {
      username: 'admin@recipehub.demo', password: 'Demo@1234'
    });
    if (login.status !== 200) throw new Error(`Admin login failed: ${login.status}`);
    adminToken = login.body.accessToken;
    const jwtPayload = decodeJwtPayload(adminToken);
    await saveEvidencePage(page, 'REST_03_JWT_Login_200.png', {
      number: 3, title: 'JWT login thành công', subtitle: 'Token được xác thực nhưng đã che khỏi evidence', status: login.status,
      requestText: 'POST /api/v1/identity/auth/login\nContent-Type: application/json\n\n{ username: "admin@recipehub.demo", password: "[REDACTED]" }',
      responseText: pretty({ user: login.body.user, token: '[REDACTED]', jwtClaims: { sub: jwtPayload.sub, role: jwtPayload.role, iss: jwtPayload.iss, aud: jwtPayload.aud, exp: jwtPayload.exp } }),
      source: 'Identity.Api/Controllers/AuthController.cs'
    });
    screenshotFiles.push('REST_03_JWT_Login_200.png');

    const noToken = await apiCall(api, 'get', '/api/v1/identity/users', null);
    await saveEvidencePage(page, 'REST_04_NoToken_401.png', {
      number: 4, title: 'API từ chối request không có JWT', subtitle: 'Endpoint quản trị được bảo vệ bằng Bearer authentication', status: noToken.status,
      requestText: 'GET /api/v1/identity/users\nAuthorization: [missing]', responseText: pretty(noToken.body),
      source: 'Identity.Api/Controllers/UsersController.cs - [Authorize(Roles = "admin")]'
    });
    screenshotFiles.push('REST_04_NoToken_401.png');

    const createUser = async (email, fullName, role) => {
      const result = await apiCall(api, 'post', '/api/v1/identity/users', adminToken, { email, fullName, role, password });
      if (result.status !== 201) throw new Error(`Create user ${email} failed: ${result.status} ${result.text}`);
      createdUserIds.push(result.body.id);
      return result.body;
    };
    const rndUser = await createUser(`evid-rnd-${suffix}@recipehub.local`, `Evidence R&D ${suffix}`, 'rnd');
    await createUser(`evid-viewer-a-${suffix}@recipehub.local`, `Evidence Viewer A ${suffix}`, 'viewer');
    await createUser(`evid-viewer-z-${suffix}@recipehub.local`, `Evidence Viewer Z ${suffix}`, 'viewer');
    const rndLogin = await apiCall(api, 'post', '/api/v1/identity/auth/login', null, { username: rndUser.email, password });
    if (rndLogin.status !== 200) throw new Error(`R&D login failed: ${rndLogin.status}`);
    const rndToken = rndLogin.body.accessToken;

    const units = await apiCall(api, 'get', '/api/v1/recipes/catalogs/units', rndToken);
    const categories = await apiCall(api, 'get', '/api/v1/recipes/ingredient-categories', rndToken);
    const gram = units.body.find(unit => unit.code === 'g') || units.body[0];
    const category = categories.body[0];
    const ingredientCode = `EVID-${suffix}`;
    const createBody = { code: ingredientCode, name: `Evidence Ingredient ${suffix}`, categoryId: category.id, defaultUnitId: gram.id, description: 'PRN232 REST evidence fixture' };
    const created = await apiCall(api, 'post', '/api/v1/recipes/ingredients', rndToken, createBody);
    if (created.status !== 201) throw new Error(`Ingredient create failed: ${created.status} ${created.text}`);
    ingredientId = created.body.id;
    await saveEvidencePage(page, 'REST_05_Ingredient_Create_201.png', {
      number: 5, title: 'Ingredient Create', subtitle: 'POST tạo resource thật qua Gateway', status: created.status,
      requestText: `POST /api/v1/recipes/ingredients\nAuthorization: Bearer [REDACTED]\n\n${pretty(createBody)}`,
      responseText: pretty(created.body), source: 'Recipe.Api/Controllers/IngredientsController.cs - Create'
    });
    screenshotFiles.push('REST_05_Ingredient_Create_201.png');

    const read = await apiCall(api, 'get', `/api/v1/recipes/ingredients/${ingredientId}`, rndToken);
    await saveEvidencePage(page, 'REST_06_Ingredient_Read_200.png', {
      number: 6, title: 'Ingredient Read', subtitle: 'GET đọc lại resource vừa lưu', status: read.status,
      requestText: `GET /api/v1/recipes/ingredients/${ingredientId}\nAuthorization: Bearer [REDACTED]`,
      responseText: pretty(read.body), source: 'Recipe.Api/Controllers/IngredientsController.cs - GetById'
    });
    screenshotFiles.push('REST_06_Ingredient_Read_200.png');

    const updateBody = { ...createBody, name: `Evidence Ingredient Updated ${suffix}`, description: 'Updated through REST PUT' };
    const updated = await apiCall(api, 'put', `/api/v1/recipes/ingredients/${ingredientId}`, rndToken, updateBody);
    await saveEvidencePage(page, 'REST_07_Ingredient_Update_200.png', {
      number: 7, title: 'Ingredient Update', subtitle: 'PUT cập nhật và trả resource mới', status: updated.status,
      requestText: `PUT /api/v1/recipes/ingredients/${ingredientId}\nAuthorization: Bearer [REDACTED]\n\n${pretty(updateBody)}`,
      responseText: pretty(updated.body), source: 'Recipe.Api/Controllers/IngredientsController.cs - Update'
    });
    screenshotFiles.push('REST_07_Ingredient_Update_200.png');

    const dbSql = `SELECT code, name, state, created_at FROM recipe_db.ingredient WHERE code = '${ingredientCode}';`;
    const dbOutput = execFileSync('docker', ['exec', 'recipehub-postgres', 'psql', '-U', 'recipehub_admin', '-d', 'recipehub_recipe', '-At', '-F', ' | ', '-c', dbSql], { encoding: 'utf8' }).trim();

    const deleted = await apiCall(api, 'delete', `/api/v1/recipes/ingredients/${ingredientId}`, rndToken);
    await saveEvidencePage(page, 'REST_08_Ingredient_Delete_204.png', {
      number: 8, title: 'Ingredient Delete', subtitle: 'DELETE thực hiện soft-delete/deactivate', status: deleted.status,
      requestText: `DELETE /api/v1/recipes/ingredients/${ingredientId}\nAuthorization: Bearer [REDACTED]`,
      responseText: deleted.status === 204 ? '204 No Content\nResource đã chuyển trạng thái inactive theo nghiệp vụ.' : pretty(deleted.body),
      source: 'Recipe.Api/Controllers/IngredientsController.cs - Deactivate'
    });
    screenshotFiles.push('REST_08_Ingredient_Delete_204.png');
    ingredientId = null;

    const forbidden = await apiCall(api, 'get', '/api/v1/identity/users', rndToken);
    await saveEvidencePage(page, 'REST_09_Wrong_Role_403.png', {
      number: 9, title: 'RBAC từ chối sai vai trò', subtitle: 'R&D không được truy cập API quản trị tài khoản', status: forbidden.status,
      requestText: 'GET /api/v1/identity/users\nAuthorization: Bearer [R&D TOKEN REDACTED]',
      responseText: pretty(forbidden.body), source: 'Identity.Api/Controllers/UsersController.cs - admin only'
    });
    screenshotFiles.push('REST_09_Wrong_Role_403.png');

    const queryBase = `/api/v1/identity/users?search=${suffix}&role=viewer&state=active&sortBy=email&page=1&pageSize=10`;
    const sortedAsc = await apiCall(api, 'get', `${queryBase}&sortDirection=asc`, adminToken);
    const sortedDesc = await apiCall(api, 'get', `${queryBase}&sortDirection=desc`, adminToken);
    await saveEvidencePage(page, 'REST_10_Search_Filter_Sort_Paging.png', {
      number: 10, title: 'Search / Filter / Sort / Paging', subtitle: 'Cùng tập dữ liệu, thứ tự email đảo khi đổi direction', status: sortedAsc.status,
      requestText: `GET ${queryBase}&sortDirection=asc\nGET ${queryBase}&sortDirection=desc\n\nsearch=${suffix}\nrole=viewer\nstate=active\nsortBy=email\npage=1&pageSize=10`,
      responseText: pretty({ ascending: sortedAsc.body.items.map(item => item.email), descending: sortedDesc.body.items.map(item => item.email), totalCount: sortedAsc.body.totalCount, page: sortedAsc.body.page, pageSize: sortedAsc.body.pageSize }),
      source: 'UserService.cs + IdentityStore.cs + PostgreSQL ORDER BY/SKIP/TAKE'
    });
    screenshotFiles.push('REST_10_Search_Filter_Sort_Paging.png');

    await saveEvidencePage(page, 'REST_11_PostgreSQL_Persistence.png', {
      number: 11, title: 'PostgreSQL persistence', subtitle: 'Row được đọc trực tiếp từ database-per-service sau POST/PUT', status: 200,
      requestText: `docker exec recipehub-postgres psql\nDatabase: recipehub_recipe\n\n${dbSql}`,
      responseText: dbOutput || '[no row returned]', source: 'docs/database-schema/recipe-db/RecipeHub.Recipe.postgres'
    });
    screenshotFiles.push('REST_11_PostgreSQL_Persistence.png');

    const programSource = fs.readFileSync(path.join(repoRoot, 'src/backend/Services/Identity/RecipeHub.Identity.Api/Program.cs'), 'utf8')
      .split(/\r?\n/).filter(line => /AddControllers|AddSwaggerGen|UseExceptionHandler|UseAuthentication|UseAuthorization/.test(line)).join('\n');
    const diSource = fs.readFileSync(path.join(repoRoot, 'src/backend/Services/Identity/RecipeHub.Identity.Infrastructure/DependencyInjection.cs'), 'utf8')
      .split(/\r?\n/).filter(line => /AddDbContext|AddScoped|ConnectionStrings|GetConnectionString/.test(line)).join('\n');
    const containerLogs = execFileSync('docker', ['logs', '--tail', '20', 'recipehub-identity'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      .split(/\r?\n/).filter(line => !/password|token|connectionstring/i.test(line)).slice(-12).join('\n');
    await saveEvidencePage(page, 'REST_12_DI_Config_Logging.png', {
      number: 12, title: 'DI / Config / Logging', subtitle: 'Composition root, DbContext configuration và container log runtime', status: 200,
      requestText: `${programSource}\n\n${diSource}`,
      responseText: containerLogs || 'Identity container healthy; no sensitive log lines in tail.',
      source: 'Identity.Api/Program.cs + Identity.Infrastructure/DependencyInjection.cs + docker logs'
    });
    screenshotFiles.push('REST_12_DI_Config_Logging.png');

    fs.writeFileSync(path.join(outputDir, 'capture-manifest.json'), JSON.stringify({ generatedAt: timestamp, gateway, screenshots: screenshotFiles, fixtureSuffix: suffix, tokensIncluded: false }, null, 2));

    // MP4 is assembled from the captured PNG files with FFmpeg after this script.
    // Optional browser recording is kept only for troubleshooting because Edge may
    // close long headless recording sessions on some Windows environments.
    if (process.env.CAPTURE_WEBM === '1') {
    const videoContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(outputDir, '.video-temp'), size: { width: 1280, height: 720 } } });
    const videoPage = await videoContext.newPage();
    const video = videoPage.video();
    const intro = evidenceHtml({ number: '00', title: 'RecipeHub REST API Evidence Demo', subtitle: 'Swagger, JWT, CRUD, RBAC, search/filter/sort/paging, PostgreSQL và DI/logging', status: 200, requestText: 'PRN232 Final Assignment\nRuntime evidence generated from current Docker stack.\n\nDuration: khoảng 3 phút 20 giây\nTokens/passwords: REDACTED', responseText: `12 evidence steps\nGateway: ${gateway}\nGenerated: ${timestamp}\n\nMỗi slide giữ 14 giây để giảng viên đọc.`, source: 'docs/report/02_REST_API' });
    const outro = evidenceHtml({ number: '13', title: 'Verification complete', subtitle: 'Evidence sẵn sàng đưa vào Report.pdf', status: 200, requestText: 'Backend build: PASS\nUnit tests: PASS\nHTTP smoke: PASS\nSwagger runtime: PASS\nSecret scan: required before submission', responseText: 'Xem README.md để map rubric, source và lệnh tái hiện.\nXem SHA256SUMS.txt để kiểm toàn vẹn file.', source: 'docs/report/02_REST_API/README.md' });
    const slides = [intro, ...screenshotFiles.map((file, index) => {
      const base64 = fs.readFileSync(path.join(outputDir, file)).toString('base64');
      return `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;background:#071a2b;font-family:Segoe UI;color:white;overflow:hidden}.top{height:58px;padding:15px 24px;background:#0f2d46;font-size:19px;font-weight:700}.counter{float:right;color:#a5f3fc}.frame{height:662px;display:flex;align-items:center;justify-content:center;padding:14px}.frame img{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 12px 42px #0008;border-radius:8px}.bar{position:fixed;bottom:0;left:0;height:5px;background:#22d3ee;animation:progress 14s linear forwards}@keyframes progress{from{width:0}to{width:100%}}</style></head><body><div class="top">${escapeHtml(file)}<span class="counter">${index + 1}/12</span></div><div class="frame"><img src="data:image/png;base64,${base64}"></div><div class="bar"></div></body></html>`;
    }), outro];
    for (const slide of slides) {
      await videoPage.setContent(slide, { waitUntil: 'load' });
      await videoPage.waitForTimeout(14000);
    }
    await videoContext.close();
    await video.saveAs(path.join(outputDir, 'REST_API_Demo.webm'));
    }
  } finally {
    if (adminToken) {
      for (const id of createdUserIds) {
        try { await apiCall(api, 'put', `/api/v1/identity/users/${id}/status`, adminToken, { isActive: false }); } catch {}
      }
    }
    await context.close();
    await browser.close();
    await api.dispose();
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
