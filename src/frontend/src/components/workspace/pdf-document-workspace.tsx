'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileDown,
  AlertTriangle,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion } from '@/lib/demo/types';
import {
  getPdfCapabilities,
  previewPdf,
  exportPdf,
} from '@/lib/api/pdf-documents';
import {
  PreviewPdfRequest,
  ExportPdfRequest,
  PreviewPdfItem,
  PreviewPdfStepItem,
  PdfCapabilitiesResponse,
  DocumentType,
} from '@/lib/api/pdf-document-types';
import { Button, Alert } from './fields';
import { useToast } from './toast';
import { PdfDocumentPreview } from './pdf-document-preview';
import { PdfRecipeSelector } from './pdf-recipe-selector';
import { usePublishedRecipeCatalog } from './use-published-recipe-catalog';

export interface GroupedRecipe {
  recipeId: string;
  recipeCode: string;
  recipeName: string;
  creatorEmail?: string;
  versions: RecipeVersion[];
  selectedVersionId: string;
}

export interface SelectedRecipeItem {
  recipeId: string;
  recipeVersionId: string;
  recipeCode: string;
  recipeName: string;
  versionLabel: string;
  status: string;
  versionNumber?: number;
  steps: RecipeVersion['steps'];
  primaryMediaAssetId?: string | null;
  titleOverride?: string;
  coverMediaAssetId?: string | null;
  stepCaptions?: Record<string, string>;
}

interface PdfDocumentWorkspaceProps {
  initialSelectedItems?: Array<{ recipeId: string; recipeVersionId: string }>;
  returnUrl?: string;
  onSuccess?: (fileName: string) => void;
}

export function PdfDocumentWorkspace({
  initialSelectedItems = [],
  returnUrl,
  onSuccess,
}: PdfDocumentWorkspaceProps) {
  const router = useRouter();
  const { session, repo } = useDemo();
  const { toast } = useToast();

  // Capabilities
  const [capabilities, setCapabilities] = useState<PdfCapabilitiesResponse | null>(null);

  // Document Metadata
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionSubtitle, setCollectionSubtitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  // Selected Recipes State
  const [selectedItems, setSelectedItems] = useState<SelectedRecipeItem[]>([]);

  // Preview State
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [snapshotHash, setSnapshotHash] = useState<string | null>(null);
  const [snapshotDocumentType, setSnapshotDocumentType] = useState<DocumentType | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  // Export Action State
  const [isExportingDraft, setIsExportingDraft] = useState(false);
  const [isExportingOfficial, setIsExportingOfficial] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Recipe Catalog State (tìm kiếm ở server, tải thêm khi cuộn)
  const catalog = usePublishedRecipeCatalog(initialSelectedItems);
  const { recipes: catalogRecipes, setRecipes: setCatalogRecipes } = catalog;
  useEffect(() => {
    if (catalog.error) setGeneralError(catalog.error);
  }, [catalog.error]);

  // Load Capabilities
  useEffect(() => {
    let isMounted = true;
    getPdfCapabilities(session?.userId || null)
      .then((caps) => {
        if (isMounted) setCapabilities(caps);
      })
      .catch(() => {
        // Fallback default
        if (isMounted) {
          setCapabilities({
            orientation: 'landscape',
            maxItems: 50,
            maxPdfBytes: 104857600,
            maxMediaBytes: 10485760,
            maxMediaPixels: 4096 * 4096,
            maxConcurrentExports: 5,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  // Handle Initial Items
  useEffect(() => {
    if (!catalogRecipes.length || !initialSelectedItems.length || selectedItems.length > 0) {
      return;
    }

    const itemsToAdd: SelectedRecipeItem[] = [];
    for (const init of initialSelectedItems) {
      const group = catalogRecipes.find(
        (g) =>
          g.recipeId === init.recipeId ||
          g.versions.some((v) => (v.versionId || v.id) === init.recipeVersionId)
      );
      if (group && !itemsToAdd.some((it) => it.recipeId === group.recipeId)) {
        const match =
          group.versions.find((v) => (v.versionId || v.id) === init.recipeVersionId) ||
          group.versions[0];
        const vId = match.versionId || match.id;
        itemsToAdd.push({
          recipeId: group.recipeId,
          recipeVersionId: vId,
          recipeCode: group.recipeCode,
          recipeName: group.recipeName,
          versionLabel: match.versionLabel || `v${match.versionNumber || 1}.0`,
          status: match.status,
          versionNumber: match.versionNumber,
          steps: match.steps || [],
          primaryMediaAssetId: match.primaryMediaAssetId,
          titleOverride: '',
          coverMediaAssetId: match.primaryMediaAssetId || null,
          stepCaptions: {},
        });
      }
    }

    if (itemsToAdd.length > 0) {
      setSelectedItems(itemsToAdd);
      if (itemsToAdd.length === 1) {
        setCollectionTitle(itemsToAdd[0].recipeName);
      } else {
        setCollectionTitle(`Bộ công thức SOP (${itemsToAdd.length} món)`);
      }
    }
  }, [catalogRecipes, initialSelectedItems, selectedItems.length]);

  // Hydrate Steps with UUIDs
  useEffect(() => {
    if (!session || !selectedItems.length) return;
    const itemsNeedingDetail = selectedItems.filter(
      (it) =>
        it.steps.length > 0 &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.steps[0].id)
    );
    if (!itemsNeedingDetail.length) return;

    let isMounted = true;
    Promise.all(
      itemsNeedingDetail.map(async (it) => {
        try {
          const detail = await repo.getRecipeVersion(session, it.recipeId, it.recipeVersionId);
          if (detail?.steps?.length) {
            return {
              versionId: it.recipeVersionId,
              steps: detail.steps,
              primaryMedia: detail.primaryMediaAssetId,
            };
          }
        } catch {
          // silent fallback
        }
        return null;
      })
    ).then((results) => {
      if (!isMounted) return;
      const updates = results.filter((r): r is NonNullable<typeof r> => r !== null);
      if (!updates.length) return;

      setSelectedItems((prev) =>
        prev.map((item) => {
          const match = updates.find((u) => u.versionId === item.recipeVersionId);
          if (!match) return item;
          return {
            ...item,
            steps: match.steps,
            primaryMediaAssetId: match.primaryMedia || item.primaryMediaAssetId,
          };
        })
      );
    });

    return () => {
      isMounted = false;
    };
  }, [session, selectedItems, repo]);

  const markStale = useCallback(() => {
    setIsStale(true);
    setSnapshotHash(null);
    setSnapshotDocumentType(null);
  }, []);

  // Toggle Recipe Selection (One version per recipe)
  const handleToggleSelectRecipe = (group: GroupedRecipe) => {
    const isSelected = selectedItems.some((it) => it.recipeId === group.recipeId);

    if (isSelected) {
      const next = selectedItems.filter((it) => it.recipeId !== group.recipeId);
      setSelectedItems(next);
      if (!titleTouched) {
        if (next.length === 1) {
          setCollectionTitle(next[0].recipeName);
        } else if (next.length === 0) {
          setCollectionTitle('');
        } else {
          setCollectionTitle(`Bộ công thức SOP (${next.length} món)`);
        }
      }
      markStale();
    } else {
      const max = capabilities?.maxItems || 50;
      if (selectedItems.length >= max) {
        toast({
          type: 'info',
          title: 'Đã đạt giới hạn công thức',
          description: `Mỗi tài liệu chỉ chứa tối đa ${max} công thức.`,
        });
        return;
      }

      const activeVersion =
        group.versions.find((v) => (v.versionId || v.id) === group.selectedVersionId) ||
        group.versions[0];
      const versionId = activeVersion.versionId || activeVersion.id;

      const newItem: SelectedRecipeItem = {
        recipeId: group.recipeId,
        recipeVersionId: versionId,
        recipeCode: group.recipeCode,
        recipeName: group.recipeName,
        versionLabel: activeVersion.versionLabel || `v${activeVersion.versionNumber || 1}.0`,
        status: activeVersion.status,
        versionNumber: activeVersion.versionNumber,
        steps: activeVersion.steps || [],
        primaryMediaAssetId: activeVersion.primaryMediaAssetId,
        titleOverride: '',
        coverMediaAssetId: activeVersion.primaryMediaAssetId || null,
        stepCaptions: {},
      };

      const next = [...selectedItems, newItem];
      setSelectedItems(next);
      if (!titleTouched) {
        if (next.length === 1) {
          setCollectionTitle(newItem.recipeName);
        } else {
          setCollectionTitle(`Bộ công thức SOP (${next.length} món)`);
        }
      }
      markStale();
    }
  };

  // Change Version for a Recipe
  const handleVersionChange = (recipeId: string, newVersionId: string) => {
    setCatalogRecipes((prev) =>
      prev.map((g) => (g.recipeId === recipeId ? { ...g, selectedVersionId: newVersionId } : g))
    );

    const isSelected = selectedItems.some((it) => it.recipeId === recipeId);
    if (isSelected) {
      const group = catalogRecipes.find((g) => g.recipeId === recipeId);
      if (!group) return;
      const newVersion = group.versions.find((v) => (v.versionId || v.id) === newVersionId);
      if (!newVersion) return;

      setSelectedItems((prev) =>
        prev.map((it) => {
          if (it.recipeId !== recipeId) return it;
          return {
            ...it,
            recipeVersionId: newVersion.versionId || newVersion.id,
            versionLabel: newVersion.versionLabel || `v${newVersion.versionNumber || 1}.0`,
            versionNumber: newVersion.versionNumber,
            steps: newVersion.steps || [],
            primaryMediaAssetId: newVersion.primaryMediaAssetId,
            coverMediaAssetId: newVersion.primaryMediaAssetId || null,
          };
        })
      );
      markStale();
    }
  };
  const handleClearAllSelections = () => {
    setSelectedItems([]);
    setCollectionTitle('');
    setCollectionSubtitle('');
    setTitleTouched(false);
    setPreviewBlob(null);
    setSnapshotHash(null);
    markStale();
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedItems.length) return;
    const list = [...selectedItems];
    const temp = list[targetIndex];
    list[targetIndex] = list[index];
    list[index] = temp;
    setSelectedItems(list);
    markStale();
  };

  const handleRemoveItem = (versionId: string) => {
    const next = selectedItems.filter((it) => it.recipeVersionId !== versionId);
    setSelectedItems(next);
    if (!titleTouched) {
      if (next.length === 1) {
        setCollectionTitle(next[0].recipeName);
      } else if (next.length === 0) {
        setCollectionTitle('');
      }
    }
    markStale();
  };

  // Build Payload
  const buildItemsPayload = useCallback((): PreviewPdfItem[] => {
    return selectedItems.map((it) => {
      const stepItems: PreviewPdfStepItem[] = (it.steps || [])
        .filter((s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id))
        .map((s) => {
          const mediaList: Array<{ assetId: string; caption: string | null }> = [];
          if (s.mediaAssetIds && s.mediaAssetIds.length > 0) {
            for (const aId of s.mediaAssetIds) {
              const cap = it.stepCaptions?.[s.id] || s.mediaCaptions?.[aId] || null;
              mediaList.push({ assetId: aId, caption: cap });
            }
          } else if (s.coverMediaAssetId) {
            const cap = it.stepCaptions?.[s.id] || s.mediaCaptions?.[s.coverMediaAssetId] || null;
            mediaList.push({ assetId: s.coverMediaAssetId, caption: cap });
          }
          return {
            stepId: s.id,
            media: mediaList,
          };
        })
        .filter((s) => s.media.length > 0);

      return {
        recipeId: it.recipeId,
        recipeVersionId: it.recipeVersionId,
        titleOverride: it.titleOverride?.trim() || null,
        coverMediaAssetId: it.coverMediaAssetId || null,
        steps: stepItems,
      };
    });
  }, [selectedItems]);

  const nonPublishedItems = useMemo(() => {
    return selectedItems.filter((it) => it.status !== 'Published');
  }, [selectedItems]);
  const hasNonPublishedVersions = nonPublishedItems.length > 0;

  // Run Preview
  const handleRunPreview = async () => {
    if (selectedItems.length === 0) {
      setPreviewError('Vui lòng chọn ít nhất một công thức.');
      return;
    }
    if (!collectionTitle.trim()) {
      setPreviewError('Vui lòng nhập tên tài liệu.');
      return;
    }
    if (hasNonPublishedVersions) {
      setPreviewError('Chỉ công thức đã phát hành mới được phép tạo tài liệu PDF.');
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);
    setGeneralError(null);

    try {
      const request: PreviewPdfRequest = {
        documentType: 'draft',
        title: collectionTitle.trim(),
        subtitle: collectionSubtitle.trim() || null,
        items: buildItemsPayload(),
      };

      const result = await previewPdf(request, session?.userId || null);
      setPreviewBlob(result.blob);
      setSnapshotHash(result.snapshotHash);
      setSnapshotDocumentType(request.documentType);
      setIsStale(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kết xuất xem trước thất bại';
      setPreviewError(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Handle Export (Draft or Published)
  const handleExport = async (docType: DocumentType) => {
    if (selectedItems.length === 0) {
      setGeneralError('Vui lòng chọn ít nhất một công thức.');
      return;
    }
    if (!collectionTitle.trim()) {
      setGeneralError('Vui lòng nhập tên tài liệu.');
      return;
    }
    if (hasNonPublishedVersions) {
      setGeneralError('Chỉ công thức đã phát hành mới đủ điều kiện xuất bản.');
      return;
    }

    setGeneralError(null);
    if (docType === 'draft') setIsExportingDraft(true);
    else setIsExportingOfficial(true);

    try {
      // Auto-preview if needed to ensure valid snapshotHash
      let validSnapshotHash = snapshotHash;
      if (!validSnapshotHash || isStale || snapshotDocumentType !== docType) {
        const previewReq: PreviewPdfRequest = {
          documentType: docType,
          title: collectionTitle.trim(),
          subtitle: collectionSubtitle.trim() || null,
          items: buildItemsPayload(),
        };
        const prevResult = await previewPdf(previewReq, session?.userId || null);
        if (docType === 'draft') setPreviewBlob(prevResult.blob);
        setSnapshotHash(prevResult.snapshotHash);
        setSnapshotDocumentType(docType);
        setIsStale(false);
        validSnapshotHash = prevResult.snapshotHash;
      }

      if (!validSnapshotHash) {
        throw new Error('Không nhận được mã băm (snapshot hash) hợp lệ từ bản xem trước.');
      }

      const request: ExportPdfRequest = {
        documentType: docType,
        title: collectionTitle.trim(),
        subtitle: collectionSubtitle.trim() || null,
        expectedSnapshotHash: validSnapshotHash,
        items: buildItemsPayload(),
      };

      const result = await exportPdf(request, session?.userId || null);
      toast({
        type: 'success',
        title: docType === 'draft' ? 'Đã xuất bản nháp' : 'Đã xuất bản chính thức',
        description: result.title,
      });

      if (onSuccess) {
        onSuccess(result.fileName);
      } else if (returnUrl) {
        setTimeout(() => {
          router.push(returnUrl);
        }, 1200);
      }
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: 'Không thể xuất tài liệu',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      if (docType === 'draft') setIsExportingDraft(false);
      else setIsExportingOfficial(false);
    }
  };

  return (
    <div className="space-y-4">
      {generalError && (
        <Alert variant="error" title="Lỗi thao tác">
          {generalError}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.7fr)] xl:grid-cols-[minmax(260px,1fr)_minmax(0,1.7fr)_minmax(220px,0.75fr)]">
        <div className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-soft space-y-4">
          <PdfRecipeSelector
            selectedItems={selectedItems}
            loadingCatalog={catalog.loading}
            loadingMore={catalog.loadingMore}
            hasMore={catalog.hasMore}
            catalogRecipes={catalogRecipes}
            totalCount={catalog.total}
            catalogSearch={catalog.query}
            setCatalogSearch={catalog.setQuery}
            onLoadMore={catalog.loadMore}
            onClear={handleClearAllSelections}
            onToggle={handleToggleSelectRecipe}
            onVersionChange={handleVersionChange}
            onMove={handleMoveItem}
            onRemove={handleRemoveItem}
          />
          <div className="space-y-4 border-t border-border pt-4">
            <h2 className="text-lg font-medium text-foreground font-display">2 · Thiết lập tài liệu</h2>
            <label className="block space-y-1.5 text-xs font-medium text-foreground">
              <span>Tiêu đề</span>
              <input
                type="text"
                value={collectionTitle}
                onChange={(e) => {
                  setCollectionTitle(e.target.value);
                  setTitleTouched(true);
                  markStale();
                }}
                placeholder="Tên tài liệu PDF..."
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-medium text-foreground">
              <span>Phụ đề</span>
              <input
                type="text"
                value={collectionSubtitle}
                onChange={(e) => {
                  setCollectionSubtitle(e.target.value);
                  markStale();
                }}
                placeholder="Tiêu đề phụ (tuỳ chọn)..."
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
        </div>

        <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-secondary p-4">
          <div className="flex items-center justify-between gap-3 pb-4 text-sm">
            <h2 className="font-medium text-foreground font-display">Xem trước</h2>
            <span className="text-xs text-muted-foreground">A4 ngang</span>
          </div>
          <div className="h-[620px] overflow-hidden rounded-lg border border-border">
            <PdfDocumentPreview
              blob={previewBlob}
              fileName={`${collectionTitle || 'document'}.pdf`}
              isStale={isStale}
              isLoading={isPreviewLoading}
              error={previewError}
              onRefreshPreview={handleRunPreview}
              isSavedHistory={false}
            />
          </div>
        </section>

        <aside className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-soft lg:col-span-2 xl:col-span-1">
          <h2 className="text-lg font-medium text-foreground font-display">Tóm tắt xuất bản</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Công thức</dt><dd className="font-medium">{selectedItems.length}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Khổ giấy</dt><dd className="font-medium">A4 ngang</dd></div>
          </dl>
          <p className="rounded-lg bg-info-soft p-3 text-xs text-info">Bản chính thức chỉ gồm công thức đã phát hành. Nội dung được chốt tại thời điểm xuất.</p>
          {hasNonPublishedVersions && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive-border bg-destructive-tint p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>Chỉ công thức đã phát hành (&quot;Published&quot;) mới được phép xuất tài liệu PDF.</span>
            </div>
          )}
          <div className="grid gap-2">
            <Button variant="secondary" onClick={handleRunPreview} isLoading={isPreviewLoading} disabled={selectedItems.length === 0 || hasNonPublishedVersions}>
              <Eye className="mr-1 h-4 w-4" strokeWidth={1.5} /> Cập nhật xem trước
            </Button>
            <Button variant="secondary" onClick={() => handleExport('draft')} isLoading={isExportingDraft} disabled={selectedItems.length === 0 || hasNonPublishedVersions} title="Bản nháp có watermark">
              <FileDown className="mr-1 h-4 w-4" strokeWidth={1.5} /> Xuất bản nháp
            </Button>
            <Button variant="primary" onClick={() => handleExport('published')} isLoading={isExportingOfficial} disabled={selectedItems.length === 0 || hasNonPublishedVersions || isStale} title="Bản chính thức lưu hành">
              <ShieldCheck className="mr-1 h-4 w-4" strokeWidth={1.5} /> Xuất chính thức
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
