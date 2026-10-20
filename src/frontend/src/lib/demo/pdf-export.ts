import { PDFDocument, rgb, degrees, PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { RecipeVersion, DocumentDraft, Ingredient, MediaAsset } from './types';
import { getAll, getById } from './database';

let cachedRegularFontBytes: ArrayBuffer | null = null;
let cachedBoldFontBytes: ArrayBuffer | null = null;

async function getFontBytes(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (cachedRegularFontBytes && cachedBoldFontBytes) {
    return { regular: cachedRegularFontBytes, bold: cachedBoldFontBytes };
  }

  const [resReg, resBold] = await Promise.all([
    fetch('/fonts/Roboto-Regular.ttf'),
    fetch('/fonts/Roboto-Bold.ttf'),
  ]);

  cachedRegularFontBytes = await resReg.arrayBuffer();
  cachedBoldFontBytes = await resBold.arrayBuffer();

  return { regular: cachedRegularFontBytes, bold: cachedBoldFontBytes };
}

async function convertBlobToEmbeddable(
  blob: Blob
): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' } | null> {
  const isJpg = blob.type === 'image/jpeg' || blob.type === 'image/jpg';
  const isPng = blob.type === 'image/png';

  if (isJpg) {
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: 'jpg' };
  }
  if (isPng) {
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: 'png' };
  }

  // If SVG or WebP, rasterize via HTML Canvas in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      const { promise, resolve, reject } = Promise.withResolvers<HTMLImageElement>();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;

      const loaded = await promise;
      const canvas = document.createElement('canvas');
      const w = loaded.naturalWidth || 600;
      const h = loaded.naturalHeight || 400;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return null;
      }
      ctx.drawImage(loaded, 0, 0, w, h);
      URL.revokeObjectURL(url);

      const { promise: blobPromise, resolve: blobResolve } = Promise.withResolvers<Blob | null>();
      canvas.toBlob(blobResolve, 'image/png');
      const outBlob = await blobPromise;
      if (!outBlob) return null;

      return {
        bytes: new Uint8Array(await outBlob.arrayBuffer()),
        type: 'png',
      };
    } catch {
      return null;
    }
  }

  return null;
}

export async function generateRecipePdf(
  recipe: RecipeVersion,
  draft: DocumentDraft,
  isDraftWatermark: boolean
): Promise<Blob> {
  const { regular, bold } = await getFontBytes();

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const fontRegular = await doc.embedFont(regular);
  const fontBold = await doc.embedFont(bold);

  const ingredients = await getAll<Ingredient>('ingredients');
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  const pageWidth = 595.28; // A4 points
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const drawHeader = (p: typeof page) => {
    p.drawRectangle({
      x: margin,
      y: pageHeight - margin - 35,
      width: contentWidth,
      height: 35,
      color: rgb(0.1, 0.12, 0.14),
    });

    p.drawText('RECIPEHUB — TIÊU CHUẨN ĐỒ UỐNG R&D', {
      x: margin + 12,
      y: pageHeight - margin - 22,
      size: 11,
      font: fontBold,
      color: rgb(0.9, 0.78, 0.45),
    });

    p.drawText(`Mã: ${recipe.code} | Phiên bản: ${recipe.versionLabel}`, {
      x: margin + contentWidth - 190,
      y: pageHeight - margin - 22,
      size: 9,
      font: fontRegular,
      color: rgb(0.95, 0.95, 0.95),
    });
  };

  const drawFooter = (p: typeof page, pageNum: number, totalPagesPlaceholder: number) => {
    p.drawLine({
      start: { x: margin, y: margin + 15 },
      end: { x: pageWidth - margin, y: margin + 15 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    p.drawText(`RecipeHub R&D Platform © 2026 — Tài liệu phát hành chính thức`, {
      x: margin,
      y: margin + 4,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    p.drawText(`Trang ${pageNum} / ${totalPagesPlaceholder}`, {
      x: pageWidth - margin - 60,
      y: margin + 4,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY - neededHeight < margin + 40) {
      page = doc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
      drawHeader(page);
      currentY -= 50;
    }
  };

  drawHeader(page);
  currentY -= 50;

  // Title
  const docTitle = draft.titleOverride || recipe.name;
  page.drawText(docTitle, {
    x: margin,
    y: currentY,
    size: 18,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.08),
  });
  currentY -= 20;

  // Metadata Row
  const statusLabel = recipe.status === 'Published' ? 'ĐÃ PHÁT HÀNH' : 'BẢN NHÁP';
  const yieldLabel = recipe.targetYield !== null && recipe.yieldUnit
    ? `${recipe.targetYield} ${recipe.yieldUnit}`
    : 'Chưa thiết lập';
  const metaText = `Trạng thái: ${statusLabel}  |  Sản lượng: ${yieldLabel}  |  Tác giả: ${recipe.creatorEmail}`;
  page.drawText(metaText, {
    x: margin,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });
  currentY -= 15;

  // Cover Image (from draft override or first step cover)
  const coverMediaId = draft.coverMediaIdOverride || recipe.steps[0]?.coverMediaAssetId;
  if (coverMediaId) {
    const coverMedia = await getById<MediaAsset>('media', coverMediaId);
    if (coverMedia && coverMedia.blob) {
      const converted = await convertBlobToEmbeddable(coverMedia.blob);
      if (converted) {
        checkPageBreak(130);
        let embedded: PDFImage;
        if (converted.type === 'jpg') {
          embedded = await doc.embedJpg(converted.bytes);
        } else {
          embedded = await doc.embedPng(converted.bytes);
        }
        const imgW = 180;
        const imgH = 100;
        page.drawImage(embedded, {
          x: margin,
          y: currentY - imgH,
          width: imgW,
          height: imgH,
        });

        const sourceLabel = coverMedia.source === 'AiIllustration' ? 'AI Concept Illustration' : 'Ảnh chụp thực tế';
        page.drawText(`[Ảnh bìa SOP - ${sourceLabel}]: ${coverMedia.name}`, {
          x: margin + imgW + 15,
          y: currentY - 20,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
        });

        currentY -= imgH + 20;
      }
    }
  }

  // Description
  if (recipe.description) {
    checkPageBreak(25);
    page.drawText(`Mô tả: ${recipe.description}`, {
      x: margin,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    currentY -= 20;
  }

  // Section 1: Ingredients Table
  checkPageBreak(80);
  page.drawText('1. ĐỊNH LƯỢNG NGUYÊN LIỆU (RECIPE FORMULA)', {
    x: margin,
    y: currentY,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  currentY -= 18;

  // Table Header
  page.drawRectangle({
    x: margin,
    y: currentY - 5,
    width: contentWidth,
    height: 20,
    color: rgb(0.93, 0.94, 0.96),
  });

  page.drawText('STT', { x: margin + 8, y: currentY + 1, size: 8.5, font: fontBold });
  page.drawText('Tên Nguyên Liệu', { x: margin + 40, y: currentY + 1, size: 8.5, font: fontBold });
  page.drawText('Mã NL', { x: margin + 220, y: currentY + 1, size: 8.5, font: fontBold });
  page.drawText('Định Lượng', { x: margin + 300, y: currentY + 1, size: 8.5, font: fontBold });
  page.drawText('Ghi Chú Kỹ Thuật', { x: margin + 380, y: currentY + 1, size: 8.5, font: fontBold });
  currentY -= 24;

  let stt = 1;
  for (const item of recipe.ingredients) {
    checkPageBreak(22);
    const ing = ingMap.get(item.ingredientId);
    const ingName = ing ? ing.name : 'Nguyên liệu khác';
    const ingCode = ing ? ing.code : '-';
    const qtyStr = `${item.quantity} ${item.unit}`;
    const noteStr = item.notes || item.stageNote || '-';

    page.drawText(`${stt++}`, { x: margin + 8, y: currentY, size: 8.5, font: fontRegular });
    page.drawText(ingName.slice(0, 36), { x: margin + 40, y: currentY, size: 8.5, font: fontRegular });
    page.drawText(ingCode, { x: margin + 220, y: currentY, size: 8, font: fontRegular });
    page.drawText(qtyStr, { x: margin + 300, y: currentY, size: 8.5, font: fontBold });
    page.drawText(noteStr.slice(0, 30), { x: margin + 380, y: currentY, size: 8, font: fontRegular });

    page.drawLine({
      start: { x: margin, y: currentY - 4 },
      end: { x: margin + contentWidth, y: currentY - 4 },
      thickness: 0.3,
      color: rgb(0.85, 0.85, 0.85),
    });
    currentY -= 18;
  }

  currentY -= 15;

  // Section 2: SOP Steps
  checkPageBreak(60);
  page.drawText('2. QUY TRÌNH THỰC HIỆN CHUẨN (STANDARD OPERATING PROCEDURE)', {
    x: margin,
    y: currentY,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  currentY -= 20;

  for (const step of recipe.steps) {
    checkPageBreak(85);

    // Step Header Box
    page.drawRectangle({
      x: margin,
      y: currentY - 6,
      width: contentWidth,
      height: 22,
      color: rgb(0.96, 0.95, 0.93),
    });

    page.drawText(`BƯỚC ${step.stepNumber}: ${step.title}`, {
      x: margin + 10,
      y: currentY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    const params: string[] = [];
    if (step.durationSeconds) params.push(`Thời gian: ${step.durationSeconds}s`);
    if (step.temperatureCelsius) params.push(`Nhiệt độ: ${step.temperatureCelsius}°C`);
    if (step.equipment) params.push(`Dụng cụ: ${step.equipment}`);

    if (params.length > 0) {
      page.drawText(params.join(' | '), {
        x: margin + contentWidth - 220,
        y: currentY,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    currentY -= 22;

    // Instruction Text
    page.drawText(`Hướng dẫn: ${step.instruction}`, {
      x: margin + 12,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 16;

    // Completion criteria
    if (step.completionCriteria) {
      page.drawText(`Tiêu chí hoàn thành: ${step.completionCriteria}`, {
        x: margin + 12,
        y: currentY,
        size: 8,
        font: fontRegular,
        color: rgb(0.1, 0.5, 0.2),
      });
      currentY -= 14;
    }

    // Embed step cover image if present
    if (step.coverMediaAssetId) {
      const stepMedia = await getById<MediaAsset>('media', step.coverMediaAssetId);
      if (stepMedia && stepMedia.blob) {
        const converted = await convertBlobToEmbeddable(stepMedia.blob);
        if (converted) {
          checkPageBreak(100);
          let embedded: PDFImage;
          if (converted.type === 'jpg') {
            embedded = await doc.embedJpg(converted.bytes);
          } else {
            embedded = await doc.embedPng(converted.bytes);
          }
          const sW = 120;
          const sH = 75;
          page.drawImage(embedded, {
            x: margin + 12,
            y: currentY - sH,
            width: sW,
            height: sH,
          });

          const caption =
            draft.stepCaptionOverrides?.[step.id] ||
            step.mediaCaptions?.[step.coverMediaAssetId] ||
            stepMedia.name;
          const sourceBadge = stepMedia.source === 'AiIllustration' ? 'AI Concept' : 'Real SOP';
          page.drawText(`[${sourceBadge}] ${caption}`, {
            x: margin + sW + 25,
            y: currentY - 20,
            size: 8,
            font: fontRegular,
            color: rgb(0.4, 0.4, 0.4),
          });

          currentY -= sH + 12;
        }
      }
    }

    currentY -= 10;
  }

  // Draw footers & watermarks across all pages
  const totalPages = doc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = doc.getPage(i);
    drawFooter(p, i + 1, totalPages);

    if (isDraftWatermark) {
      p.drawText('BẢN NHÁP — CHƯA PHÁT HÀNH', {
        x: 60,
        y: 260,
        size: 32,
        font: fontBold,
        color: rgb(0.9, 0.2, 0.2),
        opacity: 0.18,
        rotate: degrees(35),
      });
    }
  }

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  if (typeof window !== 'undefined') {
    interface WindowWithDownloadedBlob extends Window {
      __LAST_DOWNLOADED_BLOB__?: Blob;
    }
    const win = window as WindowWithDownloadedBlob;
    win.__LAST_DOWNLOADED_BLOB__ = blob;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
