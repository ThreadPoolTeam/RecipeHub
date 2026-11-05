import fontkit from '@pdf-lib/fontkit';
import { degrees, PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';
import type { DocumentDraft, Ingredient, MediaAsset, RecipeVersion } from './types';

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;

const palette = {
  ink: rgb(0.13, 0.10, 0.08),
  coffee: rgb(0.28, 0.14, 0.07),
  caramel: rgb(0.70, 0.43, 0.13),
  tea: rgb(0.20, 0.34, 0.25),
  cream: rgb(0.96, 0.91, 0.82),
  paper: rgb(0.99, 0.98, 0.95),
  sand: rgb(0.87, 0.76, 0.62),
  muted: rgb(0.43, 0.39, 0.35),
  line: rgb(0.84, 0.78, 0.69),
  white: rgb(1, 1, 1),
  warning: rgb(0.73, 0.18, 0.10),
  cocoa: rgb(0.24, 0.08, 0.10),
  coral: rgb(0.94, 0.31, 0.28),
  peach: rgb(1, 0.78, 0.60),
  mango: rgb(0.98, 0.66, 0.12),
  berry: rgb(0.47, 0.08, 0.28),
  blush: rgb(1, 0.91, 0.87),
  navy: rgb(0.04, 0.14, 0.23),
  mint: rgb(0.42, 0.82, 0.66),
  lime: rgb(0.82, 0.91, 0.30),
  sky: rgb(0.72, 0.88, 0.93),
};

interface VisualTheme {
  background: ReturnType<typeof rgb>;
  surface: ReturnType<typeof rgb>;
  dark: ReturnType<typeof rgb>;
  accent: ReturnType<typeof rgb>;
  highlight: ReturnType<typeof rgb>;
  soft: ReturnType<typeof rgb>;
}

const themes: Record<LayoutVariant, VisualTheme> = {
  editorial: {
    background: palette.paper,
    surface: palette.white,
    dark: palette.cocoa,
    accent: palette.coral,
    highlight: palette.peach,
    soft: palette.blush,
  },
  gallery: {
    background: palette.blush,
    surface: palette.paper,
    dark: palette.berry,
    accent: palette.mango,
    highlight: palette.coral,
    soft: palette.peach,
  },
  columns: {
    background: rgb(0.93, 0.97, 0.95),
    surface: palette.white,
    dark: palette.navy,
    accent: palette.mint,
    highlight: palette.lime,
    soft: palette.sky,
  },
};

interface PdfFonts {
  regular: PDFFont;
  semibold: PDFFont;
  bold: PDFFont;
}

interface EmbeddedMedia {
  asset: MediaAsset;
  image: PDFImage;
}

export interface RecipePdfEntry {
  recipe: RecipeVersion;
  draft: DocumentDraft;
  mediaAssets: MediaAsset[];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FittedText {
  lines: string[];
  size: number;
  lineHeight: number;
}

type LayoutVariant = 'editorial' | 'gallery' | 'columns';

let cachedFontBytes: Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]> | null = null;

async function fetchFont(path: string): Promise<ArrayBuffer> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Không thể tải font PDF '${path}': HTTP ${response.status}.`);
  return response.arrayBuffer();
}

function getFontBytes(): Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]> {
  if (!cachedFontBytes) {
    cachedFontBytes = Promise.all([
      fetchFont('/fonts/BeVietnamPro-Regular.ttf'),
      fetchFont('/fonts/BeVietnamPro-SemiBold.ttf'),
      fetchFont('/fonts/BeVietnamPro-Bold.ttf'),
    ]);
  }
  return cachedFontBytes;
}

async function rasterizeImage(blob: Blob): Promise<Uint8Array> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Không thể đọc ảnh có MIME type '${blob.type}'.`));
    });
    image.src = objectUrl;
    const source = await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ Canvas 2D để chuyển đổi ảnh PDF.');
    context.drawImage(source, 0, 0);
    const output = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error(`Không thể chuyển ảnh '${blob.type}' sang PNG.`));
      }, 'image/png');
    });
    return new Uint8Array(await output.arrayBuffer());
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function embedMedia(doc: PDFDocument, asset: MediaAsset): Promise<EmbeddedMedia> {
  const bytes = new Uint8Array(await asset.blob.arrayBuffer());
  if (asset.blob.type === 'image/jpeg' || asset.blob.type === 'image/jpg') {
    return { asset, image: await doc.embedJpg(bytes) };
  }
  if (asset.blob.type === 'image/png') return { asset, image: await doc.embedPng(bytes) };
  return { asset, image: await doc.embedPng(await rasterizeImage(asset.blob)) };
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  text.replace(/\r/g, '').split('\n').forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    let line = words[0];
    words.slice(1).forEach((word) => {
      const candidate = `${line} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    });
    lines.push(line);
  });
  return lines;
}

function fitText(
  text: string,
  font: PDFFont,
  maxWidth: number,
  maxHeight: number,
  preferredSize: number,
  minimumSize: number
): FittedText {
  for (let size = preferredSize; size >= minimumSize; size -= 0.5) {
    const lines = wrapText(text, font, size, maxWidth);
    const lineHeight = size * 1.35;
    if (lines.length * lineHeight <= maxHeight) return { lines, size, lineHeight };
  }
  throw new Error(
    `Nội dung công thức quá dài để trình bày rõ ràng trên một trang. Hãy rút gọn mô tả, ghi chú hoặc các bước thực hiện.`
  );
}

function drawLines(
  page: PDFPage,
  fitted: FittedText,
  x: number,
  y: number,
  font: PDFFont,
  color = palette.ink
): void {
  fitted.lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * fitted.lineHeight, font, size: fitted.size, color });
  });
}

function drawContainedImage(page: PDFPage, media: EmbeddedMedia, rect: Rect): void {
  page.drawRectangle({ ...rect, color: palette.cream });
  const natural = media.image.scale(1);
  const scale = Math.min(rect.width / natural.width, rect.height / natural.height);
  const width = natural.width * scale;
  const height = natural.height * scale;
  page.drawImage(media.image, {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  });
}

function drawBeverageMotif(page: PDFPage, fonts: PdfFonts, rect: Rect, theme: VisualTheme): void {
  page.drawRectangle({ ...rect, color: theme.soft });
  page.drawEllipse({
    x: rect.x + rect.width * 0.72,
    y: rect.y + rect.height * 0.78,
    xScale: rect.width * 0.34,
    yScale: rect.width * 0.34,
    color: theme.highlight,
    opacity: 0.72,
  });
  page.drawEllipse({
    x: rect.x + rect.width * 0.18,
    y: rect.y + rect.height * 0.18,
    xScale: rect.width * 0.22,
    yScale: rect.width * 0.22,
    color: theme.accent,
    opacity: 0.20,
  });
  const cupWidth = Math.min(rect.width * 0.34, 96);
  const cupHeight = Math.min(rect.height * 0.48, 142);
  const cupX = rect.x + (rect.width - cupWidth) / 2;
  const cupY = rect.y + (rect.height - cupHeight) / 2 - 3;
  page.drawRectangle({
    x: cupX,
    y: cupY,
    width: cupWidth,
    height: cupHeight,
    color: palette.white,
    opacity: 0.92,
    borderColor: theme.dark,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: cupX + 5,
    y: cupY + 5,
    width: cupWidth - 10,
    height: cupHeight * 0.60,
    color: theme.accent,
    opacity: 0.72,
  });
  page.drawEllipse({
    x: cupX + cupWidth / 2,
    y: cupY + cupHeight,
    xScale: cupWidth / 2,
    yScale: 7,
    color: palette.white,
    borderColor: theme.dark,
    borderWidth: 2,
  });
  page.drawLine({
    start: { x: cupX + cupWidth * 0.70, y: cupY + cupHeight - 2 },
    end: { x: cupX + cupWidth * 0.83, y: cupY + cupHeight + 42 },
    thickness: 5,
    color: theme.dark,
  });
  [
    [0.22, 0.74, 7],
    [0.80, 0.42, 5],
    [0.16, 0.46, 4],
  ].forEach(([x, y, radius]) => {
    page.drawEllipse({
      x: rect.x + rect.width * x,
      y: rect.y + rect.height * y,
      xScale: radius,
      yScale: radius,
      color: theme.highlight,
    });
  });
  page.drawText('SIGNATURE', {
    x: rect.x + 16,
    y: rect.y + 24,
    size: 7,
    font: fonts.semibold,
    color: theme.dark,
  });
  page.drawText('BEVERAGE', {
    x: rect.x + 16,
    y: rect.y + 13,
    size: 7,
    font: fonts.semibold,
    color: theme.dark,
  });
}

function drawImageGallery(
  page: PDFPage,
  fonts: PdfFonts,
  media: EmbeddedMedia[],
  rect: Rect,
  theme: VisualTheme
): void {
  page.drawRectangle({ ...rect, color: theme.soft, borderColor: theme.highlight, borderWidth: 1.5 });
  if (media.length === 0) {
    drawBeverageMotif(page, fonts, rect, theme);
    return;
  }
  if (media.length === 1) {
    drawContainedImage(page, media[0], rect);
    return;
  }
  const gap = 7;
  if (media.length === 2) {
    const width = (rect.width - gap) / 2;
    drawContainedImage(page, media[0], { ...rect, width });
    drawContainedImage(page, media[1], { x: rect.x + width + gap, y: rect.y, width, height: rect.height });
    return;
  }
  const heroHeight = rect.height * 0.64;
  drawContainedImage(page, media[0], {
    x: rect.x,
    y: rect.y + rect.height - heroHeight,
    width: rect.width,
    height: heroHeight,
  });
  const smallWidth = (rect.width - gap) / 2;
  const smallHeight = rect.height - heroHeight - gap;
  drawContainedImage(page, media[1], { x: rect.x, y: rect.y, width: smallWidth, height: smallHeight });
  drawContainedImage(page, media[2], { x: rect.x + smallWidth + gap, y: rect.y, width: smallWidth, height: smallHeight });
}

function drawPanel(page: PDFPage, rect: Rect, theme: VisualTheme): void {
  page.drawRectangle({ ...rect, color: theme.surface, borderColor: theme.highlight, borderWidth: 0.8 });
  page.drawRectangle({
    x: rect.x,
    y: rect.y + rect.height - 32,
    width: rect.width,
    height: 32,
    color: theme.accent,
  });
}

function drawSectionLabel(page: PDFPage, fonts: PdfFonts, label: string, x: number, y: number): void {
  page.drawText(label.toUpperCase(), { x, y, font: fonts.bold, size: 8, color: palette.white });
}

function ingredientText(recipe: RecipeVersion, ingredientMap: ReadonlyMap<string, Ingredient>): string {
  return recipe.ingredients
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item, index) => {
      const name = ingredientMap.get(item.ingredientId)?.name ?? `Nguyên liệu ${item.ingredientId}`;
      const note = item.notes || item.stageNote;
      return `${String(index + 1).padStart(2, '0')}  ${name}  •  ${item.quantity} ${item.unit}${note ? `  (${note})` : ''}`;
    })
    .join('\n');
}

function stepsText(recipe: RecipeVersion, draft: DocumentDraft): string {
  const steps = recipe.steps
    .slice()
    .sort((left, right) => left.stepNumber - right.stepNumber)
    .map((step) => {
      const details = [
        step.durationSeconds ? `${step.durationSeconds}s` : null,
        step.temperatureCelsius ? `${step.temperatureCelsius}°C` : null,
        step.equipment || null,
      ].filter((value): value is string => Boolean(value));
      const suffix = details.length ? ` [${details.join(' • ')}]` : '';
      const criteria = step.completionCriteria ? ` Đạt: ${step.completionCriteria}` : '';
      const warning = step.notes ? ` Lưu ý: ${step.notes}` : '';
      const caption = draft.stepCaptionOverrides?.[step.id]
        || (step.coverMediaAssetId ? step.mediaCaptions?.[step.coverMediaAssetId] : undefined);
      const imageNote = caption ? ` Ảnh: ${caption}` : '';
      return `${String(step.stepNumber).padStart(2, '0')}  ${step.title}: ${step.instruction}${suffix}${criteria}${warning}${imageNote}`;
    });
  if (draft.customNotes?.trim()) steps.push(`LƯU Ý CHUNG: ${draft.customNotes.trim()}`);
  return steps.join('\n');
}

function drawTextPanel(
  page: PDFPage,
  fonts: PdfFonts,
  rect: Rect,
  label: string,
  text: string,
  preferredSize: number,
  minimumSize: number,
  theme: VisualTheme
): void {
  drawPanel(page, rect, theme);
  drawSectionLabel(page, fonts, label, rect.x + 14, rect.y + rect.height - 21);
  const fitted = fitText(text || 'Chưa có dữ liệu.', fonts.regular, rect.width - 28, rect.height - 58, preferredSize, minimumSize);
  drawLines(page, fitted, rect.x + 14, rect.y + rect.height - 51, fonts.regular, theme.dark);
}

function drawTitleBlock(
  page: PDFPage,
  fonts: PdfFonts,
  recipe: RecipeVersion,
  draft: DocumentDraft,
  rect: Rect,
  inverse: boolean,
  theme: VisualTheme
): void {
  const title = (draft.titleOverride?.trim() || recipe.name).toUpperCase();
  const titleColor = inverse ? palette.white : theme.dark;
  const metaColor = inverse ? theme.highlight : theme.accent;
  page.drawText('RECIPEHUB  /  CÔNG THỨC PHA CHẾ', {
    x: rect.x,
    y: rect.y + rect.height - 13,
    font: fonts.semibold,
    size: 7.5,
    color: metaColor,
  });
  const fittedTitle = fitText(title, fonts.bold, rect.width, rect.height - 58, 25, 16);
  drawLines(page, fittedTitle, rect.x, rect.y + rect.height - 42, fonts.bold, titleColor);
  const yieldLabel = recipe.targetYield !== null && recipe.yieldUnit ? `${recipe.targetYield} ${recipe.yieldUnit}` : 'Chưa đặt';
  page.drawText(`${recipe.code}  •  ${recipe.versionLabel}  •  SẢN LƯỢNG ${yieldLabel.toUpperCase()}`, {
    x: rect.x,
    y: rect.y + 5,
    font: fonts.semibold,
    size: 7.5,
    color: metaColor,
  });
}

function layoutVariant(recipeCode: string): LayoutVariant {
  const hash = Array.from(recipeCode).reduce((total, character) => total + character.charCodeAt(0), 0);
  return (['editorial', 'gallery', 'columns'] as const)[hash % 3];
}

export function getRecipePdfMediaIds(recipe: RecipeVersion, draft: DocumentDraft): string[] {
  const ids: string[] = [
    draft.coverMediaIdOverride,
    recipe.primaryMediaAssetId,
    ...recipe.steps.flatMap((step) => [step.coverMediaAssetId, ...(step.mediaAssetIds ?? [])]),
  ].filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

function referencedMedia(recipe: RecipeVersion, draft: DocumentDraft, mediaMap: ReadonlyMap<string, EmbeddedMedia>): EmbeddedMedia[] {
  return getRecipePdfMediaIds(recipe, draft)
    .map((id) => mediaMap.get(id))
    .filter((item): item is EmbeddedMedia => Boolean(item))
    .slice(0, 3);
}

function drawEditorialLayout(
  page: PDFPage,
  fonts: PdfFonts,
  recipe: RecipeVersion,
  draft: DocumentDraft,
  ingredientMap: ReadonlyMap<string, Ingredient>,
  media: EmbeddedMedia[]
): void {
  const theme = themes.editorial;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: theme.background });
  page.drawRectangle({ x: 0, y: 0, width: 316, height: PAGE_HEIGHT, color: theme.dark });
  page.drawEllipse({ x: 302, y: 548, xScale: 62, yScale: 62, color: theme.accent });
  page.drawEllipse({ x: 22, y: 24, xScale: 46, yScale: 46, color: theme.highlight, opacity: 0.45 });
  drawImageGallery(page, fonts, media, { x: 28, y: 54, width: 260, height: 292 }, theme);
  drawTitleBlock(page, fonts, recipe, draft, { x: 28, y: 386, width: 250, height: 162 }, true, theme);
  const rightX = 342;
  page.drawText('TỪ PHÒNG R&D ĐẾN QUẦY PHA CHẾ', {
    x: rightX,
    y: 548,
    size: 7,
    font: fonts.bold,
    color: theme.accent,
  });
  drawTextPanel(page, fonts, { x: rightX, y: 326, width: 464, height: 202 }, '01  Thành phần', ingredientText(recipe, ingredientMap), 9.5, 6, theme);
  drawTextPanel(page, fonts, { x: rightX, y: 54, width: 464, height: 250 }, '02  Quy trình thực hiện', stepsText(recipe, draft), 8.8, 5.5, theme);
}

function drawGalleryLayout(
  page: PDFPage,
  fonts: PdfFonts,
  recipe: RecipeVersion,
  draft: DocumentDraft,
  ingredientMap: ReadonlyMap<string, Ingredient>,
  media: EmbeddedMedia[]
): void {
  const theme = themes.gallery;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: theme.background });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 16, width: PAGE_WIDTH, height: 16, color: theme.accent });
  page.drawEllipse({ x: 812, y: 564, xScale: 86, yScale: 86, color: theme.highlight, opacity: 0.68 });
  page.drawEllipse({ x: 16, y: 290, xScale: 50, yScale: 50, color: theme.accent, opacity: 0.30 });
  drawTitleBlock(page, fonts, recipe, draft, { x: MARGIN, y: 432, width: 378, height: 120 }, false, theme);
  drawImageGallery(page, fonts, media, { x: 444, y: 322, width: 362, height: 230 }, theme);
  drawTextPanel(page, fonts, { x: MARGIN, y: 48, width: 290, height: 344 }, 'Thành phần định lượng', ingredientText(recipe, ingredientMap), 9, 5.5, theme);
  drawTextPanel(page, fonts, { x: 346, y: 48, width: 460, height: 244 }, 'Từng bước pha chế', stepsText(recipe, draft), 8.5, 5.5, theme);
  const description = recipe.description?.trim();
  if (description) {
    const fitted = fitText(description, fonts.regular, 390, 42, 9, 7);
    drawLines(page, fitted, MARGIN, 424, fonts.regular, palette.muted);
  }
}

function drawColumnsLayout(
  page: PDFPage,
  fonts: PdfFonts,
  recipe: RecipeVersion,
  draft: DocumentDraft,
  ingredientMap: ReadonlyMap<string, Ingredient>,
  media: EmbeddedMedia[]
): void {
  const theme = themes.columns;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: theme.background });
  page.drawRectangle({ x: 0, y: 458, width: PAGE_WIDTH, height: 137, color: theme.dark });
  page.drawRectangle({ x: 0, y: 458, width: 18, height: 137, color: theme.highlight });
  page.drawEllipse({ x: 770, y: 530, xScale: 96, yScale: 96, color: theme.accent, opacity: 0.18 });
  drawTitleBlock(page, fonts, recipe, draft, { x: 42, y: 480, width: 720, height: 86 }, true, theme);
  drawTextPanel(page, fonts, { x: MARGIN, y: 48, width: 228, height: 382 }, 'Thành phần', ingredientText(recipe, ingredientMap), 8.6, 5.5, theme);
  drawImageGallery(page, fonts, media, { x: 282, y: 48, width: 246, height: 382 }, theme);
  drawTextPanel(page, fonts, { x: 548, y: 48, width: 258, height: 382 }, 'Thực hiện', stepsText(recipe, draft), 8.2, 5.2, theme);
}

function drawFooter(
  page: PDFPage,
  fonts: PdfFonts,
  recipe: RecipeVersion,
  pageNumber: number,
  totalPages: number,
  theme: VisualTheme
): void {
  page.drawText('RECIPEHUB BEVERAGE R&D  •  TÀI LIỆU NỘI BỘ', {
    x: MARGIN,
    y: 18,
    font: fonts.semibold,
    size: 6.5,
    color: theme.dark,
    opacity: 0.62,
  });
  const label = recipe.status === 'Published' ? 'ĐÃ PHÁT HÀNH' : 'BẢN NHÁP';
  const width = fonts.semibold.widthOfTextAtSize(label, 6.5);
  page.drawText(label, {
    x: PAGE_WIDTH - MARGIN - width,
    y: 18,
    font: fonts.semibold,
    size: 6.5,
    color: theme.dark,
    opacity: 0.62,
  });
  const pageLabel = `${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;
  const pageLabelWidth = fonts.bold.widthOfTextAtSize(pageLabel, 7);
  page.drawRectangle({
    x: PAGE_WIDTH / 2 - pageLabelWidth / 2 - 10,
    y: 9,
    width: pageLabelWidth + 20,
    height: 18,
    color: theme.highlight,
  });
  page.drawText(pageLabel, {
    x: PAGE_WIDTH / 2 - pageLabelWidth / 2,
    y: 15,
    font: fonts.bold,
    size: 7,
    color: theme.dark,
  });
}

async function createRecipePdf(
  entries: RecipePdfEntry[],
  ingredients: Ingredient[],
  shouldDrawWatermark: (recipe: RecipeVersion) => boolean,
  title: string,
  subject: string
): Promise<Blob> {
  if (entries.length === 0) {
    throw new Error('Phải chọn ít nhất một công thức để tạo PDF.');
  }
  const [regularBytes, semiboldBytes, boldBytes] = await getFontBytes();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts: PdfFonts = {
    regular: await doc.embedFont(regularBytes, { subset: true }),
    semibold: await doc.embedFont(semiboldBytes, { subset: true }),
    bold: await doc.embedFont(boldBytes, { subset: true }),
  };
  doc.setTitle(title);
  doc.setAuthor('RecipeHub Beverage R&D System');
  doc.setSubject(subject);
  doc.setCreator('RecipeHub');

  const uniqueAssets = Array.from(
    new Map(entries.flatMap((entry) => entry.mediaAssets).map((asset) => [asset.id, asset])).values()
  );
  const mediaEntries = await Promise.all(uniqueAssets.map((asset) => embedMedia(doc, asset)));
  const mediaMap = new Map(mediaEntries.map((entry) => [entry.asset.id, entry]));
  const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  entries.forEach(({ recipe, draft }, index) => {
    const media = referencedMedia(recipe, draft, mediaMap);
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const variant = layoutVariant(recipe.code);

    if (variant === 'editorial') drawEditorialLayout(page, fonts, recipe, draft, ingredientMap, media);
    else if (variant === 'gallery') drawGalleryLayout(page, fonts, recipe, draft, ingredientMap, media);
    else drawColumnsLayout(page, fonts, recipe, draft, ingredientMap, media);

    drawFooter(page, fonts, recipe, index + 1, entries.length, themes[variant]);
    if (shouldDrawWatermark(recipe)) {
      page.drawText('BẢN NHÁP  •  CHƯA PHÁT HÀNH', {
        x: 180,
        y: 255,
        size: 30,
        font: fonts.bold,
        color: palette.warning,
        opacity: 0.10,
        rotate: degrees(22),
      });
    }
  });

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
}

export async function generateRecipePdf(
  recipe: RecipeVersion,
  draft: DocumentDraft,
  ingredients: Ingredient[],
  mediaAssets: MediaAsset[],
  isDraftWatermark: boolean
): Promise<Blob> {
  return createRecipePdf(
    [{ recipe, draft, mediaAssets }],
    ingredients,
    () => isDraftWatermark,
    draft.titleOverride?.trim() || recipe.name,
    `Công thức một trang ${recipe.code} ${recipe.versionLabel}`
  );
}

export async function generateRecipeBookPdf(
  entries: RecipePdfEntry[],
  ingredients: Ingredient[]
): Promise<Blob> {
  return createRecipePdf(
    entries,
    ingredients,
    (recipe) => recipe.status !== 'Published',
    'Bộ công thức RecipeHub',
    `${entries.length} công thức, mỗi công thức một trang`
  );
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
