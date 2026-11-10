import type { Dispatch, SetStateAction } from 'react';
import { AlertCircle, Check, Clock, History, Image as ImageIcon, Sparkles, Trash2 } from 'lucide-react';
import { Button, TextArea } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';
import type { AiCandidate, RecipeStep } from '@/lib/demo/types';
import type { PersistentAiDraft } from '@/lib/ai-draft-storage';

const PROMPT_CHIPS = ['Ly thủy tinh cao cấp', 'Tách sứ bọt kem latte art', 'Góc chụp cận cảnh 45°',
  'Ánh sáng studio ấm áp', 'Phân tầng màu sắc nghệ thuật',
  'Trang trí lát cam sấy & lá hương thảo', 'Đá viên pha lê trong suốt', 'Bọt kem cheese bồng bềnh'];

type Props = {
  isAiImageModalOpen: boolean; setIsAiImageModalOpen: Dispatch<SetStateAction<boolean>>; isGeneratingAiImage: boolean;
  aiTargetType: 'hero' | 'step'; activeStepForImage: RecipeStep | null; generatedCandidate: AiCandidate | null;
  handleAcceptCandidate: () => void; imagePrompt: string;
  setImagePrompt: Dispatch<SetStateAction<string>>; generateSuggestedPrompt: (target: 'hero' | 'step', step?: RecipeStep | null) => string;
  handleGenerateAiImage: () => void; aiProgressStatus: { attempt: number; state: string; message: string } | null;
  candidateAssetUrl: string | null; handleDiscardCandidate: (id?: string) => void;
  getRemainingMinutes: (expiresAt?: string) => number; activeDrafts: PersistentAiDraft[]; handleSelectDraft: (draft: PersistentAiDraft) => void;
  draftErrors: Record<string, boolean>; retryDraft: (draft: PersistentAiDraft) => void;
};
export function EditRecipeAiDialog({ isAiImageModalOpen, setIsAiImageModalOpen, isGeneratingAiImage, aiTargetType, activeStepForImage, generatedCandidate, handleAcceptCandidate, imagePrompt, setImagePrompt, generateSuggestedPrompt, handleGenerateAiImage, aiProgressStatus, candidateAssetUrl, handleDiscardCandidate, getRemainingMinutes, activeDrafts, handleSelectDraft, draftErrors, retryDraft }: Props) {
  return (
      <Dialog
        isOpen={isAiImageModalOpen}
        onClose={() => {
          if (!isGeneratingAiImage) setIsAiImageModalOpen(false);
        }}
        title={aiTargetType === 'hero' ? '✨ Tạo Ảnh Bìa Thành Phẩm Bằng AI' : '✨ Tạo Ảnh Minh Họa Concept Bằng AI'}
        description={
          aiTargetType === 'hero'
            ? 'Mô phỏng hình ảnh đồ uống thành phẩm hoàn chỉnh để làm ảnh đại diện công thức.'
            : `Mô phỏng ảnh thao tác cho bước: "${activeStepForImage?.title || 'bước'}". Ảnh lưu tạm 30 phút, tự động xóa khi hết hạn.`
        }
        confirmLabel={aiTargetType === 'hero' ? 'Chấp Nhận & Đặt Làm Ảnh Bìa' : 'Chấp Nhận & Gắn Ảnh Này'}
        confirmVariant="gold"
        isConfirming={isGeneratingAiImage}
        onConfirm={generatedCandidate ? handleAcceptCandidate : undefined}
        maxWidth="4xl"
      >
        <div className="py-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-1">
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-foreground">
                    Mô Tả Bối Cảnh Ảnh Cần Tạo (Prompt)
                  </label>
                  <button
                    type="button"
                    onClick={() => setImagePrompt(generateSuggestedPrompt(aiTargetType, activeStepForImage))}
                    className="text-xs text-primary hover:text-primary font-medium flex items-center gap-1 hover:underline transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Gợi ý từ công thức
                  </button>
                </div>                 <TextArea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={4}
                  placeholder="Nhập mô tả bối cảnh hình ảnh..."
                />
              </div>               <div>
                <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <span>Gợi ý chi tiết thêm:</span>
                </div>                 <div className="flex flex-wrap gap-1.5">
                  {PROMPT_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setImagePrompt((prev) => (prev.trim() ? `${prev.trim()}, ${chip}` : chip));
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-muted hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>               </div>               <Button
                variant="gold"
                size="md"
                isLoading={isGeneratingAiImage}
                onClick={handleGenerateAiImage}
                className="w-full flex items-center justify-center font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Bắt Đầu Tạo Ảnh Với AI
              </Button>
              {isGeneratingAiImage && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-900 flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                      </span>
                      {aiProgressStatus?.message || 'Đang gửi yêu cầu vào hàng đợi Redis Streams...'}
                    </span>
                    <span className="font-mono text-primary font-bold">{aiProgressStatus?.attempt || 0}s / 100s</span>
                  </div>                   <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(8, (aiProgressStatus?.attempt || 1)))}%` }}
                    />
                  </div>                   <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Đang chạy qua Redis Streams & Worker. Tối đa 100 giây. Bạn có thể giữ mở hoặc refresh lại mà không mất ảnh đề xuất.
                  </p>
                </div>               )}
            </div>             <div className="lg:col-span-7 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Xem Trước Ảnh Đề Xuất
                </span>
                {generatedCandidate && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-primary font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Còn lại ~{getRemainingMinutes(generatedCandidate.expiresAt)} phút (auto xóa khi hết hạn)
                  </span>
                )}
              </div>               <div className="rounded-xl border border-border bg-muted p-3 overflow-hidden min-h-[260px] flex flex-col justify-center items-center relative">
                {candidateAssetUrl ? (
                  <div className="w-full space-y-2.5">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-zinc-950 flex items-center justify-center shadow-inner">
                      <img
                        src={candidateAssetUrl}
                        alt="AI Concept"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        AI Concept • Chưa áp dụng
                      </div>                     </div>                     <div className="flex items-start justify-between gap-3 pt-1">
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        &quot;{generatedCandidate?.prompt || imagePrompt}&quot;
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDiscardCandidate(generatedCandidate?.id)}
                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 shrink-0 font-medium hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Bỏ đề xuất này
                      </button>
                    </div>                   </div>                 ) : isGeneratingAiImage ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center animate-bounce">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>                     <div>
                      <div className="text-sm font-semibold text-foreground">AI đang phác thảo hình ảnh...</div>                       <div className="text-xs text-muted-foreground mt-0.5">Worker đang kết xuất chi tiết theo prompt</div>                     </div>                   </div>                 ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-muted-foreground">
                    <ImageIcon className="w-10 h-10 opacity-40 stroke-1" />
                    <p className="text-xs max-w-xs">
                      Chưa có ảnh đề xuất nào cho mục này. Nhập prompt bên trái và bấm <strong>&quot;Bắt Đầu Tạo Ảnh Với AI&quot;</strong> để sinh ảnh mới.
                    </p>
                  </div>                 )}
              </div>               {activeDrafts.length > 0 && (
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-primary" />
                      Kho ảnh đề xuất tạm thời ({activeDrafts.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Lưu giữ 30 phút • Click để chọn
                    </span>
                  </div>                   <div className="flex gap-2.5 overflow-x-auto py-1">
                    {activeDrafts.map((d) => {
                      const isSelected = candidateAssetUrl === d.previewUrl || generatedCandidate?.id === d.id;
                      const mins = getRemainingMinutes(d.expiresAt);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => draftErrors[d.id] ? retryDraft(d) : handleSelectDraft(d)}
                          className={`w-20 h-16 rounded-xl border overflow-hidden shrink-0 transition cursor-pointer relative group ${
                            isSelected
                              ? 'ring-2 ring-primary border-primary shadow-sm'
                              : 'border-border hover:border-primary opacity-80 hover:opacity-100'
                          }`}
                          title={draftErrors[d.id] ? 'Không tải được. Bấm để thử lại.' : `Prompt: ${d.prompt}\nCòn lại: ~${mins} phút`}
                        >
                          {d.previewUrl ? (
                            <img src={d.previewUrl} alt="" loading="eager" decoding="async" className="w-full h-full object-cover" />
                          ) : draftErrors[d.id] ? (
                            <span className="flex h-full flex-col items-center justify-center gap-1 bg-secondary p-1 text-xs text-destructive"><AlertCircle className="h-4 w-4" />Không tải được</span>
                          ) : (
                            <span aria-label="Đang tải ảnh" className="block h-full w-full bg-secondary motion-safe:animate-pulse" />
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-mono py-0.5 text-center">
                            {mins}p
                          </div>                           {isSelected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-primary text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </div>                           )}
                        </button>
                      );
                    })}
                  </div>                 </div>               )}
            </div>           </div>         </div>
      </Dialog>
  );
}
