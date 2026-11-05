'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  FileDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Coffee,
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
import { Button, SearchInput, Alert } from './fields';
import { PdfDocumentPreview } from './pdf-document-preview';

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
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  // Export Action State
  const [isExportingDraft, setIsExportingDraft] = useState(false);
  const [isExportingOfficial, setIsExportingOfficial] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);

  // Recipe Catalog State
  const [catalogRecipes, setCatalogRecipes] = useState<GroupedRecipe[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 8;

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

  // Load All Released / Published Recipes
  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    setLoadingCatalog(true);

    repo
      .getRecipes(session)
      .then(async (recipes) => {
        const groups: GroupedRecipe[] = [];
        const recipeList = recipes.items || [];
        for (const r of recipeList) {
          try {
            const versions = await repo.getRecipeVersions(session, r.id);
            const published = versions
              .filter((v) => v.status === 'Published')
              .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));

            if (published.length > 0) {
              const initMatch = initialSelectedItems.find(
                (init) =>
                  init.recipeId === r.id ||
                  published.some((v) => (v.versionId || v.id) === init.recipeVersionId)
              );
              const defaultVersionId = initMatch
                ? published.find((v) => (v.versionId || v.id) === initMatch.recipeVersionId)
                    ?.versionId ||
                  published[0].versionId ||
                  published[0].id
                : published[0].versionId || published[0].id;

              groups.push({
                recipeId: r.id,
                recipeCode: r.code,
                recipeName: r.name,
                creatorEmail: r.creatorEmail,
                versions: published,
                selectedVersionId: defaultVersionId,
              });
            }
          } catch {
            // fallback
          }
        }
        if (isMounted) {
          setCatalogRecipes(groups);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setGeneralError(err instanceof Error ? err.message : 'Không thể nạp danh mục công thức');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingCatalog(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, repo]);

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
  }, []);

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    let list = catalogRecipes;
    if (catalogSearch.trim()) {
      const q = catalogSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.recipeName.toLowerCase().includes(q) ||
          r.recipeCode.toLowerCase().includes(q) ||
          (r.creatorEmail && r.creatorEmail.toLowerCase().includes(q))
      );
    }
    return list;
  }, [catalogRecipes, catalogSearch]);

  const catalogTotalPages = Math.ceil(filteredCatalog.length / catalogPageSize) || 1;
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return filteredCatalog.slice(start, start + catalogPageSize);
  }, [filteredCatalog, catalogPage, catalogPageSize]);

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
        alert(`Số lượng món tối đa cho một tài liệu là ${max}`);
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
    setGeneralSuccess(null);
    if (docType === 'draft') setIsExportingDraft(true);
    else setIsExportingOfficial(true);

    try {
      // Auto-preview if needed to ensure valid snapshotHash
      let validSnapshotHash = snapshotHash;
      if (!validSnapshotHash || isStale) {
        const previewReq: PreviewPdfRequest = {
          documentType: docType,
          title: collectionTitle.trim(),
          subtitle: collectionSubtitle.trim() || null,
          items: buildItemsPayload(),
        };
        const prevResult = await previewPdf(previewReq, session?.userId || null);
        setPreviewBlob(prevResult.blob);
        setSnapshotHash(prevResult.snapshotHash);
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
      setGeneralSuccess(
        `Đã xuất bản thành công tài liệu: "${result.title}". File đã lưu vào kho.`
      );

      if (onSuccess) {
        onSuccess(result.fileName);
      } else if (returnUrl) {
        setTimeout(() => {
          router.push(returnUrl);
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xuất bản tài liệu thất bại';
      setGeneralError(msg);
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
      {generalSuccess && (
        <Alert variant="success" title="Thành công">
          {generalSuccess}
        </Alert>
      )}

      {/* 2-Column Split Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recipe Selection (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-[#B47820]" />
              <h2 className="text-sm font-bold text-[#1A1917] uppercase tracking-wide">
                Chọn công thức
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E8E2D9] text-xs font-medium text-[#706E68]">
                {selectedItems.length > 0 ? `${selectedItems.length} đã chọn` : 'Chưa chọn'}
              </span>
            </div>

            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllSelections}
                className="text-xs text-[#706E68] hover:text-rose-600 transition-colors"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>

          {/* Search Bar */}
          <SearchInput
            value={catalogSearch}
            onChange={(e) => {
              setCatalogSearch(e.target.value);
              setCatalogPage(1);
            }}
            placeholder="Tìm theo tên hoặc mã công thức..."
            onClear={() => {
              setCatalogSearch('');
              setCatalogPage(1);
            }}
          />

          {/* Recipe List */}
          <div className="divide-y divide-[#E8E2D9] border border-[#E8E2D9] rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
            {loadingCatalog ? (
              <div className="p-8 text-center text-[#706E68]">
                <div className="w-5 h-5 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Đang tải công thức...</p>
              </div>
            ) : paginatedCatalog.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#706E68]">
                Không có công thức đã phát hành phù hợp.
              </div>
            ) : (
              paginatedCatalog.map((group) => {
                const isSelected = selectedItems.some((it) => it.recipeId === group.recipeId);
                const selectedItem = selectedItems.find((it) => it.recipeId === group.recipeId);
                const currentVersionId = selectedItem?.recipeVersionId || group.selectedVersionId;

                return (
                  <div
                    key={group.recipeId}
                    className={`px-3 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-amber-50/50 hover:bg-amber-50/70' : 'bg-white hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRecipe(group)}
                        className="rounded text-[#B47820] focus:ring-[#B47820] h-4 w-4 shrink-0 cursor-pointer"
                      />
                      <div className="flex items-baseline gap-2 min-w-0 truncate">
                        <span className="font-medium text-sm text-[#1A1917] truncate">
                          {group.recipeName}
                        </span>
                        <span className="text-[11px] font-mono text-[#8C887F] shrink-0">
                          {group.recipeCode}
                        </span>
                      </div>
                    </label>

                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {group.versions.length > 1 ? (
                        <select
                          value={currentVersionId}
                          onChange={(e) => handleVersionChange(group.recipeId, e.target.value)}
                          className="text-xs font-mono font-medium bg-white border border-[#E8E2D9] rounded-lg px-2 py-1 text-[#1A1917] hover:border-[#D5CEBF] focus:border-[#B47820] focus:ring-0 cursor-pointer"
                          title="Chọn phiên bản công thức"
                        >
                          {group.versions.map((v) => (
                            <option key={v.versionId || v.id} value={v.versionId || v.id}>
                              {v.versionLabel || `v${v.versionNumber || 1}.0`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E8E2D9] text-[#706E68]">
                          {group.versions[0]?.versionLabel || 'v1.0'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Mini Pagination */}
          {catalogTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#706E68] pt-1">
              <span>
                {catalogPage} / {catalogTotalPages} ({filteredCatalog.length} món)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={catalogPage <= 1}
                  onClick={() => setCatalogPage((p) => p - 1)}
                >
                  Trước
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={catalogPage >= catalogTotalPages}
                  onClick={() => setCatalogPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}

          {/* Selected Items Order (Only shown when > 1 recipe selected) */}
          {selectedItems.length > 1 && (
            <div className="pt-3 border-t border-[#E8E2D9] space-y-2">
              <div className="text-xs font-semibold text-[#1A1917]">
                Thứ tự trong tài liệu ({selectedItems.length} món):
              </div>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.recipeVersionId}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#FAF9F5] border border-[#E8E2D9] text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-white border border-[#E8E2D9] flex items-center justify-center font-bold text-[10px] text-[#706E68]">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-[#1A1917] truncate">{item.recipeName}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveItem(idx, -1);
                        }}
                        className="p-1 hover:bg-white rounded text-[#706E68] disabled:opacity-30"
                        title="Đưa lên"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedItems.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveItem(idx, 1);
                        }}
                        className="p-1 hover:bg-white rounded text-[#706E68] disabled:opacity-30"
                        title="Đưa xuống"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.recipeVersionId);
                        }}
                        className="p-1 hover:bg-white rounded text-rose-600 hover:text-rose-700"
                        title="Bỏ chọn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Title + Action Bar + Live Preview (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs space-y-4">
          {/* Top Bar: Clean Editorial Title + Export Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E2D9]">
            <div className="flex-1 min-w-[200px] space-y-0.5">
              <input
                type="text"
                value={collectionTitle}
                onChange={(e) => {
                  setCollectionTitle(e.target.value);
                  setTitleTouched(true);
                  markStale();
                }}
                placeholder="Tên tài liệu PDF..."
                className="w-full text-base font-bold text-[#1A1917] placeholder:text-[#8C887F] bg-transparent border-0 border-b border-transparent hover:border-[#E8E2D9] focus:border-[#B47820] focus:ring-0 px-0 py-0.5 transition-colors"
              />
              <input
                type="text"
                value={collectionSubtitle}
                onChange={(e) => {
                  setCollectionSubtitle(e.target.value);
                  markStale();
                }}
                placeholder="Tiêu đề phụ (tuỳ chọn)..."
                className="w-full text-xs text-[#706E68] placeholder:text-[#8C887F] bg-transparent border-0 border-b border-transparent hover:border-[#E8E2D9] focus:border-[#B47820] focus:ring-0 px-0 py-0.5 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRunPreview}
                isLoading={isPreviewLoading}
                disabled={selectedItems.length === 0 || hasNonPublishedVersions}
              >
                <Eye className="w-4 h-4 mr-1 text-[#B47820]" />
                Xem trước
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('draft')}
                isLoading={isExportingDraft}
                disabled={selectedItems.length === 0 || hasNonPublishedVersions}
                title="Bản nháp có watermark"
              >
                <FileDown className="w-4 h-4 mr-1 text-[#B47820]" />
                Xuất nháp
              </Button>

              <Button
                variant="gold"
                size="sm"
                onClick={() => handleExport('published')}
                isLoading={isExportingOfficial}
                disabled={selectedItems.length === 0 || hasNonPublishedVersions}
                title="Bản chính thức lưu hành"
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                Xuất chính thức
              </Button>
            </div>
          </div>

          {/* Non-published Alert (if any) */}
          {hasNonPublishedVersions && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Chỉ công thức đã phát hành (&quot;Published&quot;) mới được phép xuất tài liệu PDF.</span>
            </div>
          )}

          {/* PDF Preview Frame */}
          <div className="h-[620px] rounded-xl overflow-hidden border border-[#E8E2D9]">
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
        </div>
      </div>
    </div>
  );
}
