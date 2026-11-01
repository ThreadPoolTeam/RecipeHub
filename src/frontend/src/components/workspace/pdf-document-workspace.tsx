'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  FileDown,
  History,
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  Plus,
  ShieldCheck,
  ChevronRight,
  Coffee,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, RecipeStep } from '@/lib/demo/types';
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
import { Button, TextInput, Select, SearchInput, Alert } from './fields';
import { DataTable } from './data-table';
import { StatusBadge } from './status-badge';
import { PdfDocumentPreview } from './pdf-document-preview';
import { PdfDocumentHistory } from './pdf-document-history';
import { Dialog } from './dialog';

export interface SelectedRecipeItem {
  recipeId: string;
  recipeVersionId: string;
  recipeCode: string;
  recipeName: string;
  versionLabel: string;
  status: string;
  versionNumber: number;
  steps: RecipeStep[];
  primaryMediaAssetId?: string;
  titleOverride?: string;
  coverMediaAssetId?: string | null;
  stepCaptions?: Record<string, string>;
}

interface PdfDocumentWorkspaceProps {
  initialSelectedItems?: Array<{ recipeId: string; recipeVersionId: string }>;
  initialTab?: 'composer' | 'history';
}

export function PdfDocumentWorkspace({
  initialSelectedItems = [],
  initialTab = 'composer',
}: PdfDocumentWorkspaceProps) {
  const { session, repo } = useDemo();
  const [activeTab, setActiveTab] = useState<'composer' | 'history'>(initialTab);

  // Capabilities
  const [capabilities, setCapabilities] = useState<PdfCapabilitiesResponse | null>(null);

  // Catalog recipes (for selection)
  const [catalogRecipes, setCatalogRecipes] = useState<RecipeVersion[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 6;

  // Composer Form & Selected Collection
  const [selectedItems, setSelectedItems] = useState<SelectedRecipeItem[]>([]);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionSubtitle, setCollectionSubtitle] = useState('');
  const [templateCode, setTemplateCode] = useState('detailed-landscape');
  const [templateVersion, setTemplateVersion] = useState('1');

  // Preview & Hash state
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [snapshotHash, setSnapshotHash] = useState<string | null>(null);
  const [previewDocumentType, setPreviewDocumentType] = useState<DocumentType | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Submit / Export state
  const [isExportingDraft, setIsExportingDraft] = useState(false);
  const [isExportingOfficial, setIsExportingOfficial] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Active Item in Accordion/Overrides
  const [editingItemIdx, setEditingItemIdx] = useState<number>(0);
  const [isHydratingSteps, setIsHydratingSteps] = useState<boolean>(false);
  // Load Capabilities
  useEffect(() => {
    let isMounted = true;
    getPdfCapabilities(session?.userId || null)
      .then((caps) => {
        if (!isMounted) return;
        setCapabilities(caps);
        if (caps.allowedTemplates && caps.allowedTemplates.length > 0) {
          setTemplateCode(caps.allowedTemplates[0].code);
          setTemplateVersion(caps.allowedTemplates[0].version);
        }
      })
      .catch(() => {
        // Fallback default capabilities if endpoint not ready
        if (isMounted) {
          setCapabilities({
            allowedTemplates: [
              {
                code: 'detailed-landscape',
                version: '1',
                name: 'Chi tiết ngang A4 (Landscape)',
                description: 'Định dạng chuẩn trang ngang có bảng định lượng và quy trình SOP',
              },
            ],
            orientation: 'landscape',
            maxItems: 50,
            maxPdfBytes: 52428800,
            maxMediaBytes: 15728640,
            maxMediaPixels: 16777216,
            maxConcurrentExports: 2,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  // Load All Catalog Recipes
  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    setLoadingCatalog(true);

    repo
      .getRecipes(session, { status: 'Published' })
      .then((recipes) => {
        if (!isMounted) return;
        setCatalogRecipes((recipes.items || []).filter((recipe) => recipe.status === 'Published'));
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách công thức';
          setGeneralError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingCatalog(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, repo]);

  // Hydrate initial items from prop or session
  useEffect(() => {
    if (!catalogRecipes.length || !initialSelectedItems.length) return;

    const itemsToAdd: SelectedRecipeItem[] = [];
    for (const init of initialSelectedItems) {
      const match = catalogRecipes.find(
        (r) => (r.versionId || r.id) === init.recipeVersionId || r.id === init.recipeId
      );
      if (match) {
        const vId = match.versionId || match.id;
        itemsToAdd.push({
          recipeId: match.recipeId || match.id,
          recipeVersionId: vId,
          recipeCode: match.code,
          recipeName: match.name,
          versionLabel: match.versionLabel,
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
        setCollectionTitle('Bộ hướng dẫn công thức pha chế');
      }
    }
  }, [catalogRecipes, initialSelectedItems]);

  // Enrich selected items with real step details (genuine UUIDs) for exact version
  useEffect(() => {
    if (!session || !selectedItems.length) return;
    const itemsNeedingDetail = selectedItems.filter(
      (it) => it.steps.length > 0 && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.steps[0].id)
    );
    if (!itemsNeedingDetail.length) {
      setIsHydratingSteps(false);
      return;
    }

    let isMounted = true;
    setIsHydratingSteps(true);

    Promise.all(
      itemsNeedingDetail.map(async (it) => {
        try {
          const detail = await repo.getRecipeVersion(session, it.recipeId, it.recipeVersionId);
          if (detail?.steps?.length) {
            return { versionId: it.recipeVersionId, steps: detail.steps, primaryMedia: detail.primaryMediaAssetId };
          }
        } catch {
          // silent fallback
        }
        return null;
      })
    ).then((results) => {
      if (!isMounted) return;
      setIsHydratingSteps(false);
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

  // Mark preview as stale whenever inputs or items change
  const markStale = useCallback(() => {
    setIsStale(true);
    setSnapshotHash(null);
  }, []);

  // Filter Catalog Recipes
  const filteredCatalog = useMemo(() => {
    let list = catalogRecipes;
    if (catalogSearch.trim()) {
      const q = catalogSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.creatorEmail.toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalogRecipes, catalogSearch]);

  const catalogTotalPages = Math.ceil(filteredCatalog.length / catalogPageSize) || 1;
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return filteredCatalog.slice(start, start + catalogPageSize);
  }, [filteredCatalog, catalogPage, catalogPageSize]);

  // Handle Add Recipe to Collection
  const handleToggleSelectRecipe = (rec: RecipeVersion) => {
    const versionId = rec.versionId || rec.id;
    const recipeId = rec.recipeId || rec.id;
    const exists = selectedItems.some((it) => it.recipeVersionId === versionId);

    if (exists) {
      setSelectedItems((prev) => prev.filter((it) => it.recipeVersionId !== versionId));
      markStale();
    } else {
      const max = capabilities?.maxItems || 50;
      if (selectedItems.length >= max) {
        alert(`Số lượng món tối đa cho một tài liệu là ${max}`);
        return;
      }
      const newItem: SelectedRecipeItem = {
        recipeId,
        recipeVersionId: versionId,
        recipeCode: rec.code,
        recipeName: rec.name,
        versionLabel: rec.versionLabel,
        status: rec.status,
        versionNumber: rec.versionNumber,
        steps: rec.steps || [],
        primaryMediaAssetId: rec.primaryMediaAssetId,
        titleOverride: '',
        coverMediaAssetId: rec.primaryMediaAssetId || null,
        stepCaptions: {},
      };
      const next = [...selectedItems, newItem];
      setSelectedItems(next);
      if (next.length === 1 && !collectionTitle) {
        setCollectionTitle(newItem.recipeName);
      } else if (next.length > 1 && (!collectionTitle || collectionTitle === selectedItems[0]?.recipeName)) {
        setCollectionTitle('Bộ hướng dẫn công thức pha chế');
      }
      markStale();
    }
  };

  // Select all visible on current page
  const handleSelectAllCurrentPage = () => {
    const max = capabilities?.maxItems || 50;
    const toAdd: SelectedRecipeItem[] = [];

    for (const rec of paginatedCatalog) {
      const vId = rec.versionId || rec.id;
      if (!selectedItems.some((it) => it.recipeVersionId === vId)) {
        if (selectedItems.length + toAdd.length < max) {
          toAdd.push({
            recipeId: rec.recipeId || rec.id,
            recipeVersionId: vId,
            recipeCode: rec.code,
            recipeName: rec.name,
            versionLabel: rec.versionLabel,
            status: rec.status,
            versionNumber: rec.versionNumber,
            steps: rec.steps || [],
            primaryMediaAssetId: rec.primaryMediaAssetId,
            titleOverride: '',
            coverMediaAssetId: rec.primaryMediaAssetId || null,
            stepCaptions: {},
          });
        }
      }
    }

    if (toAdd.length > 0) {
      setSelectedItems((prev) => [...prev, ...toAdd]);
      markStale();
    }
  };

  // Clear all selections
  const handleClearAllSelections = () => {
    setSelectedItems([]);
    setCollectionTitle('');
    setCollectionSubtitle('');
    markStale();
  };

  // Order item movements
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const list = [...selectedItems];
    const temp = list[index - 1];
    list[index - 1] = list[index];
    list[index] = temp;
    setSelectedItems(list);
    if (editingItemIdx === index) setEditingItemIdx(index - 1);
    else if (editingItemIdx === index - 1) setEditingItemIdx(index);
    markStale();
  };

  const handleMoveDown = (index: number) => {
    if (index >= selectedItems.length - 1) return;
    const list = [...selectedItems];
    const temp = list[index + 1];
    list[index + 1] = list[index];
    list[index] = temp;
    setSelectedItems(list);
    if (editingItemIdx === index) setEditingItemIdx(index + 1);
    else if (editingItemIdx === index + 1) setEditingItemIdx(index);
    markStale();
  };

  const handleRemoveItem = (index: number) => {
    const list = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(list);
    if (editingItemIdx >= list.length) {
      setEditingItemIdx(Math.max(0, list.length - 1));
    }
    markStale();
  };

  // Build Payload
  const buildItemsPayload = (): PreviewPdfItem[] => {
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
  };

  // Run Preview
  const handleRunPreview = async () => {
    if (selectedItems.length === 0) {
      setPreviewError('Vui lòng chọn ít nhất một công thức để xem trước PDF.');
      return;
    }
    if (!collectionTitle.trim()) {
      setPreviewError('Tiêu đề tài liệu không được để trống.');
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
        templateCode,
        templateVersion,
        items: buildItemsPayload(),
      };

      const result = await previewPdf(request, session?.userId || null);
      setPreviewBlob(result.blob);
      setSnapshotHash(result.snapshotHash);
      setPreviewDocumentType(request.documentType);
      setIsStale(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kết xuất xem trước thất bại';
      setPreviewError(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Check if any version is not published
  const hasDraftVersions = useMemo(() => {
    return selectedItems.some((it) => it.status !== 'Published');
  }, [selectedItems]);

  // Handle Export (Draft or Published)
  const handleExport = async (docType: DocumentType) => {
    if (!snapshotHash) {
      setGeneralError('Vui lòng kết xuất xem trước tài liệu trước khi xuất bản.');
      return;
    }
    if (isStale) {
      setGeneralError('Nội dung đã thay đổi. Vui lòng cập nhật xem trước để lấy snapshot hash mới.');
      return;
    }
    if (docType === 'published' && hasDraftVersions) {
      setGeneralError('Chỉ công thức đã phát hành mới được phép xuất bản tài liệu chính thức.');
      return;
    }

    if (docType === 'draft') setIsExportingDraft(true);
    else setIsExportingOfficial(true);

    setGeneralError(null);
    setGeneralSuccess(null);

    try {
      let expectedSnapshotHash = snapshotHash;
      if (previewDocumentType !== docType) {
        const previewRequest: PreviewPdfRequest = {
          documentType: docType,
          title: collectionTitle.trim(),
          subtitle: collectionSubtitle.trim() || null,
          templateCode,
          templateVersion,
          items: buildItemsPayload(),
        };
        const result = await previewPdf(previewRequest, session?.userId || null);
        if (!result.snapshotHash) {
          throw new Error('Bản xem trước thiếu snapshot hash. Vui lòng kết xuất lại trước khi xuất bản.');
        }
        setPreviewBlob(result.blob);
        setSnapshotHash(result.snapshotHash);
        setPreviewDocumentType(docType);
        expectedSnapshotHash = result.snapshotHash;
        setIsStale(false);
      }
      const request: ExportPdfRequest = {
        expectedSnapshotHash,
        documentType: docType,
        title: collectionTitle.trim(),
        subtitle: collectionSubtitle.trim() || null,
        templateCode,
        templateVersion,
        items: buildItemsPayload(),
      };

      const result = await exportPdf(request, session?.userId || null);
      setGeneralSuccess(
        `Đã xuất bản ${docType === 'published' ? 'chính thức' : 'nháp'} thành công: ${result.fileName}`
      );
      setHistoryRefreshKey((k) => k + 1);
      // Switch to history tab to view artifact
      setActiveTab('history');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xuất bản PDF thất bại';
      setGeneralError(msg);
    } finally {
      if (docType === 'draft') setIsExportingDraft(false);
      else setIsExportingOfficial(false);
    }
  };

  const currentEditingItem = selectedItems[editingItemIdx] || null;

  return (
    <div className="space-y-6">
      {/* Top Tab Navigator */}
      <div className="flex items-center gap-3 border-b border-[#E8E2D9] pb-3">
        <button
          onClick={() => setActiveTab('composer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-150 ${
            activeTab === 'composer'
              ? 'bg-[#1A1917] text-white shadow-xs'
              : 'text-[#706E68] hover:text-[#1A1917] hover:bg-[#FAF9F5]'
          }`}
        >
          <FileText className="w-4 h-4 text-[#B47820]" />
          <span>Biên Tập &amp; Xuất PDF</span>
          {selectedItems.length > 0 && (
            <span className="ml-1 px-2 py-0.2 rounded-full bg-[#B47820] text-white text-[11px] font-mono">
              {selectedItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-150 ${
            activeTab === 'history'
              ? 'bg-[#1A1917] text-white shadow-xs'
              : 'text-[#706E68] hover:text-[#1A1917] hover:bg-[#FAF9F5]'
          }`}
        >
          <History className="w-4 h-4 text-[#B47820]" />
          <span>Lịch Sử Xuất Bản</span>
        </button>
      </div>

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

      {/* COMPOSER TAB */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Selection & Configuration */}
          <div className="xl:col-span-7 space-y-6">
            {/* Step 1: Document Meta */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1917] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#B47820]" /> 1. Thông Tin Ấn Phẩm
                  </h3>
                  <p className="text-xs text-[#706E68] mt-0.5">
                    Định dạng trang ngang chuẩn A4, đầy đủ định lượng và quy trình SOP.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#E8E2D9] text-[11px] font-medium text-[#706E68]">
                  Khổ Ngang A4 (Fixed)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Tiêu đề ấn phẩm / Bộ công thức"
                  required
                  value={collectionTitle}
                  onChange={(e) => {
                    setCollectionTitle(e.target.value);
                    markStale();
                  }}
                  placeholder="Ví dụ: Bộ Hướng Dẫn Pha Chế Cà Phê Mùa Thu"
                />

                <TextInput
                  label="Tiêu đề phụ (Subtitle)"
                  value={collectionSubtitle}
                  onChange={(e) => {
                    setCollectionSubtitle(e.target.value);
                    markStale();
                  }}
                  placeholder="Ví dụ: Tài liệu chuẩn SOP lưu hành nội bộ"
                />
              </div>
            </div>

            {/* Step 2: Recipe Selection Table */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D9] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1917] uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#B47820]" /> 2. Chọn Nguồn Công Thức ({selectedItems.length}/
                    {capabilities?.maxItems || 50})
                  </h3>
                  <p className="text-xs text-[#706E68] mt-0.5">
                    Chỉ chọn phiên bản công thức đã phát hành để tạo tài liệu đơn hoặc bộ sưu tập.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllCurrentPage}
                    title="Chọn tất cả công thức trang này"
                  >
                    Chọn trang này
                  </Button>
                  {selectedItems.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllSelections}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      Bỏ chọn tất cả
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <SearchInput
                  value={catalogSearch}
                  onChange={(e) => {
                    setCatalogSearch(e.target.value);
                    setCatalogPage(1);
                  }}
                  placeholder="Tìm mã hoặc tên công thức..."
                  onClear={() => setCatalogSearch('')}
                  className="flex-1"
                />
              </div>

              {/* Table */}
              <div className="border border-[#E8E2D9] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-[#1A1917]">
                  <thead className="bg-[#FAF9F5] border-b border-[#E8E2D9] text-[#706E68] uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Mã / Tên công thức</th>
                      <th className="py-2.5 px-3">Phiên bản</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3 text-right">Chọn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D9]">
                    {loadingCatalog ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#706E68]">
                          <div className="w-5 h-5 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Đang tải danh mục công thức...
                        </td>
                      </tr>
                    ) : paginatedCatalog.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#706E68]">
                          Không có công thức đã phát hành phù hợp.
                        </td>
                      </tr>
                    ) : (
                      paginatedCatalog.map((rec) => {
                        const vId = rec.versionId || rec.id;
                        const isSelected = selectedItems.some((it) => it.recipeVersionId === vId);
                        return (
                          <tr
                            key={vId}
                            className={`hover:bg-[#FAF9F5] transition-colors ${
                              isSelected ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRecipe(rec)}
                                className="rounded text-[#B47820] focus:ring-[#B47820] h-4 w-4"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-[#1A1917]">{rec.name}</div>
                              <div className="text-[11px] text-[#706E68] font-mono">{rec.code}</div>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#706E68]">
                              {rec.versionLabel}
                            </td>
                            <td className="py-2 px-3">
                              <StatusBadge status={rec.status} />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <Button
                                variant={isSelected ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => handleToggleSelectRecipe(rec)}
                              >
                                {isSelected ? 'Bỏ' : 'Thêm'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mini Pagination */}
              {catalogTotalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-[#706E68] pt-2">
                  <span>
                    Trang {catalogPage} / {catalogTotalPages} ({filteredCatalog.length} món)
                  </span>
                  <div className="flex items-center gap-1">
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
            </div>

            {/* Step 3: Collection Order & Item Overrides */}
            {selectedItems.length > 0 && (
              <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="border-b border-[#E8E2D9] pb-3">
                  <h3 className="text-sm font-bold text-[#1A1917] uppercase tracking-wider flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-[#B47820]" /> 3. Thứ Tự &amp; Tùy Chỉnh Trình Bày (
                    {selectedItems.length} món)
                  </h3>
                  <p className="text-xs text-[#706E68] mt-0.5">
                    Kéo chỉnh thứ tự xuất hiện trong ấn phẩm và tùy biến chú thích ảnh từng bước nếu cần.
                  </p>
                </div>

                {/* Ordered Items List */}
                <div className="space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={item.recipeVersionId}
                      className={`p-3 rounded-xl border transition-all ${
                        editingItemIdx === idx
                          ? 'border-[#B47820] bg-amber-50/30 ring-1 ring-[#B47820]/30'
                          : 'border-[#E8E2D9] bg-[#FAF9F5]'
                      } flex flex-wrap items-center justify-between gap-3 text-xs`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#B47820] text-sm w-6">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-[#1A1917] flex items-center gap-2">
                            <span>{item.titleOverride || item.recipeName}</span>
                            <span className="text-[11px] font-mono text-[#706E68]">
                              ({item.recipeCode} {item.versionLabel})
                            </span>
                          </div>
                          {item.titleOverride && (
                            <div className="text-[11px] text-[#706E68]">
                              Gốc: {item.recipeName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          title="Chuyển lên trước"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={idx === selectedItems.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          title="Chuyển xuống sau"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant={editingItemIdx === idx ? 'gold' : 'secondary'}
                          size="sm"
                          onClick={() => setEditingItemIdx(idx)}
                        >
                          Tùy biến
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-700"
                          title="Bỏ khỏi bộ xuất"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sub-Editor for Active Item */}
                {currentEditingItem && (
                  <div className="mt-4 p-4 bg-white border border-[#E8E2D9] rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-2">
                      <span className="text-xs font-bold text-[#1A1917] uppercase tracking-wider">
                        Đang cấu hình: #{editingItemIdx + 1} {currentEditingItem.recipeName}
                      </span>
                      <span className="text-xs text-[#706E68] font-mono">
                        {currentEditingItem.recipeCode}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <TextInput
                        label="Tiêu đề hiển thị thay thế (Ghi đè tên món trong tài liệu)"
                        value={currentEditingItem.titleOverride || ''}
                        placeholder={currentEditingItem.recipeName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedItems((prev) =>
                            prev.map((it, i) =>
                              i === editingItemIdx ? { ...it, titleOverride: val } : it
                            )
                          );
                          markStale();
                        }}
                      />

                      {/* Step Captions */}
                      {currentEditingItem.steps && currentEditingItem.steps.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[#E8E2D9]">
                          <label className="block text-xs font-semibold text-[#1A1917] uppercase tracking-wider">
                            Chú thích kỹ thuật dưới ảnh bước thực hiện:
                          </label>
                          {currentEditingItem.steps.map((st) => (
                            <div
                              key={st.id}
                              className="p-2.5 bg-[#FAF9F5] border border-[#E8E2D9] rounded-lg space-y-1 text-xs"
                            >
                              <div className="font-medium text-[#1A1917]">
                                Bước {st.stepNumber}: {st.title}
                              </div>
                              <TextInput
                                value={currentEditingItem.stepCaptions?.[st.id] || ''}
                                placeholder="Nhập chú thích kỹ thuật hiển thị dưới ảnh trong tài liệu..."
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedItems((prev) =>
                                    prev.map((it, i) => {
                                      if (i !== editingItemIdx) return it;
                                      return {
                                        ...it,
                                        stepCaptions: {
                                          ...(it.stepCaptions || {}),
                                          [st.id]: val,
                                        },
                                      };
                                    })
                                  );
                                  markStale();
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Preview & Action Box */}
          <div className="xl:col-span-5 space-y-6">
            {/* Actions Card */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-[#E8E2D9] pb-3">
                <h4 className="text-sm font-bold text-[#1A1917] uppercase tracking-wider">
                  Tác vụ xuất bản tài liệu PDF
                </h4>
                <p className="text-xs text-[#706E68] mt-0.5">
                  Tài liệu xuất bản sẽ được lưu vào kho bảo mật Cloudinary và kiểm soát qua xác thực.
                </p>
              </div>

              {/* Status Notice */}
              {hasDraftVersions ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Có công thức ở trạng thái nháp:</span>
                    <p className="mt-0.5 text-[#706E68]">
                      Chỉ có thể xuất bản thử nghiệm (có đóng dấu Watermark). Để xuất bản chính thức, mọi công thức nguồn phải ở trạng thái &quot;Đã phát hành&quot;.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tất cả công thức nguồn đã phát hành. Đủ điều kiện xuất bản chính thức.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={handleRunPreview}
                  isLoading={isPreviewLoading}
                  disabled={selectedItems.length === 0}
                >
                  <Eye className="w-4 h-4 mr-1.5 text-[#B47820]" />
                  {previewBlob ? 'Cập nhật bản xem trước' : 'Xem thử tài liệu (Preview)'}
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={() => handleExport('draft')}
                    isLoading={isExportingDraft}
                    disabled={!snapshotHash || isStale || selectedItems.length === 0}
                    title={
                      isStale
                        ? 'Cần bấm xem thử để cập nhật snapshot trước khi xuất'
                        : 'Xuất bản nháp có watermark'
                    }
                  >
                    <FileDown className="w-3.5 h-3.5 mr-1 text-[#B47820]" /> Xuất bản nháp
                  </Button>

                  <Button
                    variant="gold"
                    size="md"
                    className="w-full"
                    onClick={() => handleExport('published')}
                    isLoading={isExportingOfficial}
                    disabled={
                      !snapshotHash || isStale || hasDraftVersions || selectedItems.length === 0
                    }
                    title={
                      hasDraftVersions
                        ? 'Chưa thể xuất chính thức vì có công thức nháp'
                        : 'Xuất bản chính thức không watermark'
                    }
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Xuất bản chính thức
                  </Button>
                </div>
              </div>
            </div>

            {/* Live Native PDF Preview Frame */}
            <div className="h-[600px]">
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
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <PdfDocumentHistory
          actorId={session?.userId || null}
          refreshKey={historyRefreshKey}
        />
      )}
    </div>
  );
}
