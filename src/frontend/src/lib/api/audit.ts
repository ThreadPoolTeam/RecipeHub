import { requestJson } from './client';

export interface AuditLogDto {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  source: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  occurredAt: string;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  actorQuery?: string;
  actorId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
}

export interface AuditLogListResponse {
  items: AuditLogDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const AUDIT_ACTIONS = [
  { value: 'all', label: 'Tất cả thao tác' },
  { value: 'user.created', label: 'Tạo tài khoản' },
  { value: 'user.updated', label: 'Cập nhật tài khoản' },
  { value: 'user.role_changed', label: 'Đổi vai trò tài khoản' },
  { value: 'user.locked', label: 'Khóa tài khoản' },
  { value: 'user.unlocked', label: 'Mở khóa tài khoản' },
  { value: 'user.password_reset', label: 'Đặt lại mật khẩu' },
  { value: 'recipe.created', label: 'Tạo công thức' },
  { value: 'recipe.version_created', label: 'Tạo phiên bản công thức' },
  { value: 'recipe.updated', label: 'Cập nhật công thức' },
  { value: 'recipe.published', label: 'Xuất bản công thức' },
  { value: 'recipe.archived', label: 'Lưu trữ công thức' },
  { value: 'recipe.activated', label: 'Kích hoạt lại công thức' },
  { value: 'quiz.created', label: 'Tạo bài kiểm tra' },
  { value: 'quiz.updated', label: 'Cập nhật bài kiểm tra' },
  { value: 'quiz.published', label: 'Xuất bản bài kiểm tra' },
  { value: 'quiz.archived', label: 'Lưu trữ bài kiểm tra' },
  { value: 'quiz.deleted', label: 'Xóa bài kiểm tra' },
  { value: 'quiz.version_deleted', label: 'Xóa bản nháp bài kiểm tra' },
  { value: 'quiz.version_cloned', label: 'Nhân bản bài kiểm tra' },
  { value: 'quiz.attempt_submitted', label: 'Nộp bài thi đánh giá' },
] as const;

export const AUDIT_TARGET_TYPES = [
  { value: 'all', label: 'Tất cả đối tượng' },
  { value: 'user', label: 'Tài khoản' },
  { value: 'recipe', label: 'Công thức' },
  { value: 'recipe_version', label: 'Phiên bản công thức' },
  { value: 'quiz', label: 'Bài kiểm tra' },
  { value: 'quiz_version', label: 'Bản nháp bài kiểm tra' },
  { value: 'quiz_attempt', label: 'Lượt thi' },
] as const;

export function getActionLabel(action: string): string {
  if (!action) return 'Thao tác không xác định';

  const exact = AUDIT_ACTIONS.find((a) => a.value === action);
  if (exact) return exact.label;

  const normalized = action.toLowerCase();
  if (normalized.startsWith('recipe.created')) return 'Tạo công thức';
  if (normalized.startsWith('recipe.version_created')) return 'Tạo phiên bản công thức';
  if (normalized.startsWith('recipe.updated')) return 'Cập nhật công thức';
  if (normalized.startsWith('recipe.published')) return 'Xuất bản công thức';
  if (normalized.startsWith('recipe.archived')) return 'Lưu trữ công thức';
  if (normalized.startsWith('recipe.activated')) return 'Kích hoạt công thức';
  if (normalized.startsWith('user.created')) return 'Tạo tài khoản';
  if (normalized.startsWith('user.updated')) return 'Cập nhật tài khoản';
  if (normalized.startsWith('user.role_changed')) return 'Đổi vai trò';
  if (normalized.startsWith('user.locked')) return 'Khóa tài khoản';
  if (normalized.startsWith('user.unlocked')) return 'Mở khóa tài khoản';
  if (normalized.startsWith('user.password_reset')) return 'Đặt lại mật khẩu';
  if (normalized.startsWith('quiz.created')) return 'Tạo bài kiểm tra';
  if (normalized.startsWith('quiz.updated')) return 'Cập nhật bài kiểm tra';
  if (normalized.startsWith('quiz.published')) return 'Xuất bản bài kiểm tra';
  if (normalized.startsWith('quiz.archived')) return 'Lưu trữ bài kiểm tra';
  if (normalized.startsWith('quiz.deleted')) return 'Xóa bài kiểm tra';
  if (normalized.startsWith('quiz.attempt_submitted')) return 'Nộp bài thi';

  const parts = normalized.split('.');
  if (parts.length >= 2) {
    const verbMap: Record<string, string> = {
      created: 'Tạo',
      updated: 'Cập nhật',
      deleted: 'Xóa',
      published: 'Xuất bản',
      archived: 'Lưu trữ',
      activated: 'Kích hoạt',
      submitted: 'Nộp',
      locked: 'Khóa',
      unlocked: 'Mở khóa',
    };
    const entityMap: Record<string, string> = {
      recipe: 'công thức',
      user: 'tài khoản',
      quiz: 'bài kiểm tra',
      content: 'nội dung',
      pdf: 'tài liệu PDF',
    };
    const verb = verbMap[parts[1]] || parts[1];
    const entity = entityMap[parts[0]] || parts[0];
    return `${verb} ${entity}`;
  }

  return action;
}

export function getTargetTypeLabel(targetType: string): string {
  if (!targetType) return 'Không xác định';

  const exact = AUDIT_TARGET_TYPES.find((t) => t.value === targetType);
  if (exact) return exact.label;

  const normalized = targetType.toLowerCase();
  if (normalized === 'user') return 'Tài khoản';
  if (normalized === 'recipe') return 'Công thức';
  if (normalized === 'recipe_version') return 'Phiên bản công thức';
  if (normalized === 'quiz') return 'Bài kiểm tra';
  if (normalized === 'quiz_version') return 'Bản nháp bài thi';
  if (normalized === 'quiz_attempt') return 'Lượt thi';
  if (normalized === 'content') return 'Nội dung';
  if (normalized === 'pdf' || normalized === 'pdf_document') return 'Tài liệu PDF';

  return targetType;
}

export async function listAuditLogs(
  query?: AuditLogQuery,
  signal?: AbortSignal
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams();
  if (query?.page && query.page > 0) params.set('page', query.page.toString());
  if (query?.pageSize && query.pageSize > 0) params.set('pageSize', query.pageSize.toString());
  if (query?.actorQuery && query.actorQuery.trim()) params.set('actorQuery', query.actorQuery.trim());
  if (query?.actorId) params.set('actorId', query.actorId);
  if (query?.action && query.action !== 'all') params.set('action', query.action);
  if (query?.targetType && query.targetType !== 'all') params.set('targetType', query.targetType);
  if (query?.targetId) params.set('targetId', query.targetId);
  if (query?.from) params.set('from', query.from);
  if (query?.to) params.set('to', query.to);

  const qs = params.toString();
  const path = qs ? `api/v1/audit/logs?${qs}` : 'api/v1/audit/logs';
  const data = await requestJson(path, null, { method: 'GET', signal });
  return data as AuditLogListResponse;
}
