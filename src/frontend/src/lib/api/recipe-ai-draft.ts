import type { SessionInfo } from '@/lib/demo/types';
import { ApiError, requestJson } from './client';

export type AiDraftStatus = 'pending' | 'running' | 'succeeded' | 'failed';
export type AiDraftOutcome = 'generated' | 'cannot_generate';

export interface AiDraftYield {
  quantity: number;
  unitId: string;
  unitCode: string;
  note: string | null;
}

export interface AiDraftIngredient {
  ingredientId: string;
  ingredientCode: string;
  name: string;
  quantity: number;
  unitId: string;
  unitCode: string;
  stageName: string | null;
  note: string | null;
  purpose: string;
}

export interface AiDraftStep {
  order: number;
  title: string;
  description: string;
  durationSeconds: number | null;
  temperatureCelsius: number | null;
  ingredientCodes: string[];
  equipment: string[];
  completionCriteria: string;
  safetyNote: string | null;
}

export interface AiRecipeDraft {
  name: string;
  description: string;
  beverageFamily: string;
  servingStyle: string;
  servings: number;
  estimatedTotalVolumeMl: number;
  yield: AiDraftYield;
  ingredients: AiDraftIngredient[];
  steps: AiDraftStep[];
  qualityChecks: string[];
  servingInstructions: string;
}

export interface AiDraftCannotGenerate {
  errorCode: string;
  missingRequirements: string[];
}

export interface AiDraftJob {
  status: AiDraftStatus;
  outcome: AiDraftOutcome | null;
  draft: AiRecipeDraft | null;
  cannotGenerate: AiDraftCannotGenerate | null;
  errorMessage: string | null;
}

export interface CreateAiDraftInput {
  recipeName: string;
  description: string | null;
}

type JsonRecord = Record<string, unknown>;

const STATUSES: AiDraftStatus[] = ['pending', 'running', 'succeeded', 'failed'];
const OUTCOMES: AiDraftOutcome[] = ['generated', 'cannot_generate'];

export const BEVERAGE_FAMILY_LABELS: Record<string, string> = {
  tea: 'Trà',
  coffee: 'Cà phê',
  juice: 'Nước ép',
  smoothie: 'Sinh tố',
  milk_based: 'Đồ uống nền sữa',
  yogurt_based: 'Đồ uống nền yogurt',
  cocoa_chocolate: 'Cacao hoặc chocolate',
  soda: 'Soda',
  mocktail: 'Đồ uống pha chế không cồn',
  cocktail: 'Đồ uống pha chế có cồn',
  blended: 'Đồ uống xay',
  hot_drink: 'Đồ uống nóng',
  infused: 'Đồ uống ngâm hoặc ủ',
  other: 'Nhóm khác',
};

export const SERVING_STYLE_LABELS: Record<string, string> = {
  hot: 'Phục vụ nóng',
  warm: 'Phục vụ ấm',
  cold: 'Phục vụ lạnh',
  iced: 'Phục vụ với đá',
  frozen: 'Phục vụ đông lạnh',
  room_temperature: 'Phục vụ ở nhiệt độ phòng',
};

const CANNOT_GENERATE_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'Yêu cầu chưa đủ rõ để AI hiểu đúng món bạn muốn tạo. Hãy bổ sung tên món hoặc mô tả cụ thể hơn.',
  MISSING_CATALOG: 'Kho nguyên liệu chưa sẵn sàng nên AI không có dữ liệu để tạo công thức.',
  MISSING_DEFINING_INGREDIENT: 'Kho thiếu nguyên liệu quyết định tạo nên món này, nên AI không thể giữ đúng tên món.',
  MISSING_BEVERAGE_BASE: 'Kho chưa có nguyên liệu nền phù hợp để làm ra món này.',
  MISSING_REQUIRED_UNIT: 'Kho chưa có đơn vị đo phù hợp để định lượng món này.',
  AMBIGUOUS_CATALOG_MATCH: 'Kho có nhiều nguyên liệu gần giống nhau nên AI không dám tự chọn.',
  UNSAFE_REQUEST: 'Yêu cầu xung đột với quy tắc an toàn nên AI không tạo công thức.',
  UNSUPPORTED_WITH_AVAILABLE_CATALOG: 'Kho nguyên liệu hiện tại chưa đủ để tạo đúng món này.',
};

export function describeCannotGenerateCode(errorCode: string): string {
  return CANNOT_GENERATE_MESSAGES[errorCode] ?? 'AI hiểu yêu cầu nhưng danh mục nguyên liệu hiện tại chưa đủ để tạo công thức.';
}

export function labelBeverageFamily(value: string): string {
  return BEVERAGE_FAMILY_LABELS[value] ?? 'Chưa xác định';
}

export function labelServingStyle(value: string): string {
  return SERVING_STYLE_LABELS[value] ?? 'Chưa xác định';
}

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} phải là một JSON object.`);
  }
  return value as JsonRecord;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} phải là một JSON array.`);
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label} phải là chuỗi.`);
  return value;
}

function nullableText(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  return text(value, label);
}

function numberValue(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} phải là số hợp lệ.`);
  }
  return value;
}

function nullableNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  return numberValue(value, label);
}

function textArray(value: unknown, label: string): string[] {
  return array(value, label).map((entry, index) => text(entry, `${label}[${index}]`));
}

function mapYield(value: unknown): AiDraftYield {
  const item = record(value, 'ai draft.draft.yield');
  return {
    quantity: numberValue(item.quantity, 'ai draft.draft.yield.quantity'),
    unitId: text(item.unitId, 'ai draft.draft.yield.unitId'),
    unitCode: text(item.unitCode, 'ai draft.draft.yield.unitCode'),
    note: nullableText(item.note, 'ai draft.draft.yield.note'),
  };
}

function mapIngredient(value: unknown, label: string): AiDraftIngredient {
  const item = record(value, label);
  return {
    ingredientId: text(item.ingredientId, `${label}.ingredientId`),
    ingredientCode: text(item.ingredientCode, `${label}.ingredientCode`),
    name: text(item.name, `${label}.name`),
    quantity: numberValue(item.quantity, `${label}.quantity`),
    unitId: text(item.unitId, `${label}.unitId`),
    unitCode: text(item.unitCode, `${label}.unitCode`),
    stageName: nullableText(item.stageName, `${label}.stageName`),
    note: nullableText(item.note, `${label}.note`),
    purpose: text(item.purpose, `${label}.purpose`),
  };
}

function mapStep(value: unknown, label: string): AiDraftStep {
  const item = record(value, label);
  return {
    order: numberValue(item.order, `${label}.order`),
    title: text(item.title, `${label}.title`),
    description: text(item.description, `${label}.description`),
    durationSeconds: nullableNumber(item.durationSeconds, `${label}.durationSeconds`),
    temperatureCelsius: nullableNumber(item.temperatureCelsius, `${label}.temperatureCelsius`),
    ingredientCodes: textArray(item.ingredientCodes, `${label}.ingredientCodes`),
    equipment: textArray(item.equipment, `${label}.equipment`),
    completionCriteria: text(item.completionCriteria, `${label}.completionCriteria`),
    safetyNote: nullableText(item.safetyNote, `${label}.safetyNote`),
  };
}

function mapDraft(value: unknown): AiRecipeDraft {
  const item = record(value, 'ai draft.draft');
  return {
    name: text(item.name, 'ai draft.draft.name'),
    description: nullableText(item.description, 'ai draft.draft.description') ?? '',
    beverageFamily: text(item.beverageFamily, 'ai draft.draft.beverageFamily'),
    servingStyle: text(item.servingStyle, 'ai draft.draft.servingStyle'),
    servings: numberValue(item.servings, 'ai draft.draft.servings'),
    estimatedTotalVolumeMl: numberValue(
      item.estimatedTotalVolumeMl,
      'ai draft.draft.estimatedTotalVolumeMl'
    ),
    yield: mapYield(item.yield),
    ingredients: array(item.ingredients, 'ai draft.draft.ingredients').map((entry, index) =>
      mapIngredient(entry, `ai draft.draft.ingredients[${index}]`)
    ),
    steps: array(item.steps, 'ai draft.draft.steps').map((entry, index) =>
      mapStep(entry, `ai draft.draft.steps[${index}]`)
    ),
    qualityChecks: textArray(item.qualityChecks, 'ai draft.draft.qualityChecks'),
    servingInstructions: text(item.servingInstructions, 'ai draft.draft.servingInstructions'),
  };
}

function mapCannotGenerate(value: unknown): AiDraftCannotGenerate {
  const item = record(value, 'ai draft.cannotGenerate');
  return {
    errorCode: text(item.errorCode, 'ai draft.cannotGenerate.errorCode'),
    missingRequirements: textArray(
      item.missingRequirements,
      'ai draft.cannotGenerate.missingRequirements'
    ),
  };
}

export function describeAiDraftError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return 'Trợ lý AI chưa sẵn sàng. Vui lòng thử lại sau ít phút.';
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.status === 403) return 'Chỉ chuyên viên R&D được tạo bản nháp bằng AI.';
    if (error.status === 404) return 'Bản nháp đã hết hạn hoặc không còn khả dụng. Vui lòng tạo lại.';
    if (error.status === 400) return error.message || 'Thông tin chưa hợp lệ. Vui lòng kiểm tra tên món và mô tả.';
    return error.message || 'Trợ lý AI đang gặp sự cố. Vui lòng thử lại.';
  }
  if (error instanceof TypeError) {
    return 'Không kết nối được trợ lý AI hoặc dữ liệu trả về không hợp lệ. Vui lòng thử lại.';
  }
  return 'Không tạo được bản nháp. Vui lòng thử lại.';
}

export function describeDescriptionSuggestionError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Tên món chưa hợp lệ để gợi ý mô tả. Vui lòng kiểm tra lại.';
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.status === 403) return 'Chỉ chuyên viên R&D được dùng gợi ý mô tả.';
    if (error.status === 502) return 'Trợ lý AI đang gặp sự cố. Bạn vẫn có thể tự viết mô tả và tạo công thức.';
    if (error.status === 503) return 'Trợ lý AI chưa sẵn sàng. Bạn vẫn có thể tự viết mô tả và tạo công thức.';
    return error.message || 'Chưa gợi ý được mô tả. Bạn vẫn có thể tự viết mô tả và tạo công thức.';
  }
  if (error instanceof TypeError) {
    return 'Dữ liệu gợi ý trả về không hợp lệ. Bạn vẫn có thể tự viết mô tả và tạo công thức.';
  }
  return 'Chưa gợi ý được mô tả. Bạn vẫn có thể tự viết mô tả và tạo công thức.';
}

export async function suggestAiDraftDescription(
  actor: SessionInfo,
  recipeName: string
): Promise<string> {
  const response = record(
    await requestJson('api/v1/recipe/ai-drafts/description-suggestions', actor.userId, {
      method: 'POST',
      body: JSON.stringify({ recipeName }),
    }),
    'description suggestion'
  );
  return text(response.description, 'description suggestion.description');
}

export async function createAiDraft(actor: SessionInfo, input: CreateAiDraftInput): Promise<string> {
  const response = record(
    await requestJson('api/v1/recipe/ai-drafts', actor.userId, {
      method: 'POST',
      body: JSON.stringify({ recipeName: input.recipeName, description: input.description }),
    }),
    'ai draft'
  );
  return text(response.jobId, 'ai draft.jobId');
}

export async function getAiDraft(actor: SessionInfo, jobId: string): Promise<AiDraftJob> {
  const response = record(
    await requestJson(`api/v1/recipe/ai-drafts/${jobId}`, actor.userId, { method: 'GET' }),
    'ai draft job'
  );
  const status = text(response.status, 'ai draft job.status');
  if (!STATUSES.includes(status as AiDraftStatus)) {
    throw new TypeError(`Trạng thái bản nháp không được hỗ trợ: ${status}`);
  }
  const rawOutcome = nullableText(response.outcome, 'ai draft job.outcome');
  if (rawOutcome !== null && !OUTCOMES.includes(rawOutcome as AiDraftOutcome)) {
    throw new TypeError(`Kết quả bản nháp không được hỗ trợ: ${rawOutcome}`);
  }
  return {
    status: status as AiDraftStatus,
    outcome: rawOutcome as AiDraftOutcome | null,
    draft: response.draft === null || response.draft === undefined ? null : mapDraft(response.draft),
    cannotGenerate:
      response.cannotGenerate === null || response.cannotGenerate === undefined
        ? null
        : mapCannotGenerate(response.cannotGenerate),
    errorMessage: nullableText(response.errorMessage, 'ai draft job.errorMessage'),
  };
}
