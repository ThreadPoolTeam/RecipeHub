import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { Locator, Page } from '@playwright/test';

export const E2E_DIR = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(__dirname, '../../..');
export const COMPOSE_FILE = path.join(REPO_ROOT, 'infra', 'compose.yaml');

function formatDefaultRunId(date = new Date()): string {
  const yyyy = String(date.getFullYear());
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}${MM}${dd}-${HH}${mm}`;
}

/**
 * Lấy RUN_ID thống nhất giữa tất cả các spec trong cùng một lượt chạy.
 * Nếu E2E_RUN_ID không truyền từ môi trường, lưu tạm vào .evidence-counter-active-runid (hiệu lực 60 phút).
 */
export function getRunId(): string {
  if (process.env.E2E_RUN_ID && process.env.E2E_RUN_ID.trim()) {
    return process.env.E2E_RUN_ID.trim();
  }

  const activeFile = path.join(E2E_DIR, '.evidence-counter-active-runid');
  try {
    const stat = fs.statSync(activeFile);
    if (Date.now() - stat.mtimeMs < 60 * 60 * 1000) {
      const saved = fs.readFileSync(activeFile, 'utf8').trim();
      if (saved) return saved;
    }
  } catch {
    // Chưa có file tạm
  }

  const generated = formatDefaultRunId();
  try {
    fs.writeFileSync(activeFile, generated, 'utf8');
  } catch {
    // Bỏ qua nếu không ghi được
  }
  return generated;
}

export function getShortTag(): string {
  const runId = getRunId().replace(/[^a-zA-Z0-9]/g, '');
  return runId.slice(-6) || 'E2E01';
}

export function getEvidenceDir(): string {
  return path.join(REPO_ROOT, 'docs', 'report', 'evidence', getRunId());
}

function getCounterFilePath(): string {
  return path.join(E2E_DIR, `.evidence-counter-${getRunId()}`);
}

function getRunStateFilePath(): string {
  return path.join(E2E_DIR, `.run-state-${getRunId()}.json`);
}

function nextShotNumber(): string {
  const counterFile = getCounterFilePath();
  let current = 0;
  try {
    const raw = fs.readFileSync(counterFile, 'utf8').trim();
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      current = parsed;
    }
  } catch {
    current = 0;
  }
  const next = current + 1;
  fs.writeFileSync(counterFile, String(next), 'utf8');
  return String(next).padStart(2, '0');
}

export interface RunState {
  runId?: string;
  ingredientCode?: string;
  ingredientName?: string;
  recipeId?: string;
  recipeVersionId?: string;
  recipeCode?: string;
  recipeName?: string;
  quizId?: string;
  quizVersion?: number;
  quizCode?: string;
  quizTitle?: string;
  createdUserEmail?: string;
  createdUserName?: string;
}

export function readRunState(): RunState {
  const stateFile = getRunStateFilePath();
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return JSON.parse(raw) as RunState;
  } catch {
    return { runId: getRunId() };
  }
}

export function writeRunState(patch: Partial<RunState>): RunState {
  const stateFile = getRunStateFilePath();
  const next: RunState = {
    ...readRunState(),
    ...patch,
    runId: getRunId(),
  };
  fs.writeFileSync(stateFile, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

async function ensureIndexHeader(indexFile: string): Promise<void> {
  try {
    await fsp.access(indexFile);
  } catch {
    const header = [
      `# Bộ ảnh minh chứng E2E — Lượt chạy \`${getRunId()}\``,
      '',
      '| # | Tên file | Mô tả bước | URL / Nguồn | Spec | Thời điểm |',
      '|---|---|---|---|---|---|',
      '',
    ].join('\n');
    await fsp.writeFile(indexFile, header, 'utf8');
  }
}

async function appendIndexRow(row: {
  num: string;
  fileName: string;
  description: string;
  url: string;
  spec: string;
}): Promise<void> {
  const dir = getEvidenceDir();
  await fsp.mkdir(dir, { recursive: true });
  const indexFile = path.join(dir, 'index.md');
  await ensureIndexHeader(indexFile);

  const timestamp = new Date().toISOString();
  const safeDesc = row.description.replace(/\|/g, '\\|');
  const safeUrl = row.url.replace(/\|/g, '\\|');
  const line = `| ${row.num} | \`${row.fileName}\` | ${safeDesc} | \`${safeUrl}\` | \`${row.spec}\` | \`${timestamp}\` |\n`;
  await fsp.appendFile(indexFile, line, 'utf8');
}

export interface ShotOptions {
  description?: string;
  spec?: string;
  fullPage?: boolean;
  locator?: Locator;
  mask?: Locator[];
}

/**
 * Chụp ảnh màn hình đánh số tự động vào docs/report/evidence/<RUN_ID>/<NN>-<name>.png
 * và ghi chú vào index.md.
 */
export async function shot(
  page: Page,
  name: string,
  opts?: ShotOptions
): Promise<string> {
  const dir = getEvidenceDir();
  await fsp.mkdir(dir, { recursive: true });

  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  // Ẩn con trỏ nhập và tắt caret để ảnh chụp sạch, đồng nhất
  await page
    .evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const styleId = '__e2e_hide_caret__';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = '* { caret-color: transparent !important; }';
        document.head.appendChild(style);
      }
    })
    .catch(() => {});

  const num = nextShotNumber();
  const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `${num}-${cleanName}.png`;
  const filePath = path.join(dir, fileName);

  if (opts?.locator) {
    await opts.locator.screenshot({
      path: filePath,
      animations: 'disabled',
      mask: opts.mask,
    });
  } else {
    await page.screenshot({
      path: filePath,
      fullPage: opts?.fullPage ?? false,
      animations: 'disabled',
      mask: opts?.mask,
    });
  }

  await appendIndexRow({
    num,
    fileName,
    description: opts?.description ?? name,
    url: page.url(),
    spec: opts?.spec ?? 'e2e',
  });

  return filePath;
}

/**
 * Ghi dòng ghi chú vào index.md cho các ảnh chụp tay (IDE) hoặc bước bị skip.
 */
export async function recordManualOrSkipped(opts: {
  name: string;
  description: string;
  source: string;
  spec: string;
}): Promise<void> {
  const num = nextShotNumber();
  const cleanName = opts.name.replace(/[^a-zA-Z0-9_-]/g, '-');
  await appendIndexRow({
    num,
    fileName: `${num}-${cleanName} (chụp tay / ghi chú)`,
    description: opts.description,
    url: opts.source,
    spec: opts.spec,
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Chạy lệnh terminal (bọc try/catch), lưu kết quả ra file .txt và kết xuất lên trang HTML tạm để chụp ảnh .png.
 */
export async function captureCommandEvidence(
  page: Page,
  name: string,
  command: string,
  opts: {
    title: string;
    description: string;
    spec: string;
    transformOutput?: (raw: string) => string;
    timeoutMs?: number;
    env?: Record<string, string>;
    /** Ném lỗi (test fail) nếu lệnh trả mã khác 0 — dùng cho kết quả test/smoke. */
    mustSucceed?: boolean;
  }
): Promise<{ ok: boolean; output: string; pngPath: string; txtPath: string }> {
  const dir = getEvidenceDir();
  await fsp.mkdir(dir, { recursive: true });

  let ok = true;
  let output = '';
  try {
    output = execSync(command, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: opts.timeoutMs ?? 30_000,
      env: opts.env ? { ...process.env, ...opts.env } : process.env,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    ok = false;
    const e = err as { stdout?: string; stderr?: string; message?: string };
    output = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n');
  }

  if (opts.transformOutput) {
    output = opts.transformOutput(output);
  }

  const trimmed = output.trim() || '(Không có dữ liệu đầu ra)';
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    body {
      margin: 0;
      padding: 32px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #334155;
    }
    .title {
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
    }
    .cmd {
      margin-top: 6px;
      font-size: 13px;
      color: #38bdf8;
    }
    pre {
      margin: 0;
      padding: 20px;
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
      color: #bbf7d0;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(opts.title)}</div>
    <div class="cmd">$ ${escapeHtml(command)}</div>
  </div>
  <pre>${escapeHtml(trimmed)}</pre>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const pngPath = await shot(page, name, {
    description: `${opts.description}${ok ? '' : ' (lệnh trả lỗi, cần chụp tay nếu Docker chưa bật)'}`,
    spec: opts.spec,
  });

  const txtPath = pngPath.replace(/\.png$/, '.txt');
  await fsp.writeFile(txtPath, `$ ${command}\n\n${trimmed}\n`, 'utf8');

  if (opts.mustSucceed && !ok) {
    throw new Error(`Lệnh minh chứng thất bại: ${command}\n${trimmed.slice(-2000)}`);
  }
  return { ok, output: trimmed, pngPath, txtPath };
}
