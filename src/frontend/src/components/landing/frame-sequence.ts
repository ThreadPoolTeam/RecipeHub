/**
 * RecipeHub Frame Sequence & Bounded Cache Controller
 * Quản lý nạp frame tuần tự/nhảy cóc, giới hạn bộ nhớ đệm, dọn dẹp bitmap.
 */

export interface ChapterInfo {
  id: string;
  name: string;
  time: number;
  startProgress: number;
  endProgress: number;
  desktopIndex: number;
  mobileIndex: number;
}

export interface ProfileInfo {
  count: number;
  pattern: string;
  fps: number;
  quality: number;
  totalBytes: number;
}

export interface ManifestData {
  source: string;
  dimensions: { width: number; height: number };
  profiles: {
    desktop: ProfileInfo;
    mobile: ProfileInfo;
  };
  chapters: ChapterInfo[];
  fallbacks: {
    poster: string;
    chapters: {
      ingredients: string;
      process: string;
      drink: string;
    };
  };
}

export class FrameSequenceManager {
  private baseDir: string;
  private isMobile: boolean;
  public readonly profile: ProfileInfo;
  public readonly frameCount: number;
  private manifest: ManifestData;
  private cache: Map<number, ImageBitmap | HTMLImageElement> = new Map();
  private maxCacheSize: number;
  private inFlightRequests: Map<number, AbortController> = new Map();
  private maxConcurrent = 4;
  private currentTargetIndex = 0;
  private disposed = false;

  constructor(manifest: ManifestData, isMobile: boolean, baseDir = '/landing/phe-la') {
    this.manifest = manifest;
    this.isMobile = isMobile;
    this.baseDir = baseDir;
    this.profile = isMobile ? manifest.profiles.mobile : manifest.profiles.desktop;
    this.frameCount = this.profile.count;
    this.maxCacheSize = isMobile ? 8 : 12;
  }

  public getFramePath(index: number): string {
    const clamped = Math.max(0, Math.min(this.profile.count - 1, index));
    const padIndex = String(clamped + 1).padStart(4, '0');
    const subDir = this.isMobile ? 'mobile' : 'desktop';
    return `${this.baseDir}/${subDir}/frame-${padIndex}.webp`;
  }

  /**
   * Ánh xạ progress [0, 1] sang frame index theo piecewise chapter ranges
   */
  public progressToIndex(progress: number): number {
    const clamped = Math.max(0, Math.min(1, progress));
    const chapters = this.manifest.chapters;

    // Piecewise interpolation giữa các mốc chương để text và hình đồng bộ
    for (let i = 0; i < chapters.length; i++) {
      const cur = chapters[i];
      const next = chapters[i + 1];

      const startProg = cur.startProgress;
      const endProg = next ? next.startProgress : 1.0;

      if (clamped >= startProg && clamped <= endProg) {
        const segProgress = (clamped - startProg) / Math.max(0.0001, endProg - startProg);
        const startIndex = this.isMobile ? cur.mobileIndex : cur.desktopIndex;
        const endIndex = next
          ? (this.isMobile ? next.mobileIndex : next.desktopIndex)
          : this.profile.count - 1;

        const mapped = Math.round(startIndex + segProgress * (endIndex - startIndex));
        return Math.max(0, Math.min(this.profile.count - 1, mapped));
      }
    }

    return Math.round(clamped * (this.profile.count - 1));
  }

  /**
   * Lấy frame từ cache nếu có
   */
  public getCachedFrame(index: number): ImageBitmap | HTMLImageElement | null {
    return this.cache.get(index) || null;
  }

  /**
   * Lấy frame gần nhất đã có trong cache để vẽ mượt khi cuộn nhanh
   */
  public getNearestCachedFrame(targetIndex: number): ImageBitmap | HTMLImageElement | null {
    let nearest: ImageBitmap | HTMLImageElement | null = null;
    let minDiff = Infinity;
    this.cache.forEach((img, idx) => {
      const diff = Math.abs(idx - targetIndex);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = img;
      }
    });
    return nearest;
  }

  /**
   * Tải một frame cụ thể, hỗ trợ createImageBitmap nếu môi trường cho phép
   */
  public async loadFrame(index: number): Promise<ImageBitmap | HTMLImageElement> {
    if (this.disposed) throw new Error('SequenceManager disposed');

    if (this.cache.has(index)) {
      return this.cache.get(index)!;
    }

    const controller = new AbortController();
    this.inFlightRequests.set(index, controller);

    try {
      const url = this.getFramePath(index);
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} loading frame ${index}`);

      const blob = await res.blob();
      let decoded: ImageBitmap | HTMLImageElement;

      if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
        try {
          decoded = await createImageBitmap(blob);
        } catch {
          decoded = await this.fallbackDecodeImage(blob);
        }
      } else {
        decoded = await this.fallbackDecodeImage(blob);
      }

      if (!this.disposed) {
        this.insertToCache(index, decoded);
      }
      return decoded;
    } finally {
      this.inFlightRequests.delete(index);
    }
  }

  /**
   * Preload ưu tiên target frame, sau đó tới các frame lân cận
   */
  public prioritizeAndPreload(targetIndex: number) {
    if (this.disposed) return;
    this.currentTargetIndex = targetIndex;

    // Hủy các request ở xa target (khoảng cách > 6) để nhường băng thông cho target mới khi cuộn nhanh
    this.inFlightRequests.forEach((controller, idx) => {
      if (Math.abs(idx - targetIndex) > 6) {
        controller.abort();
        this.inFlightRequests.delete(idx);
      }
    });

    const queue: number[] = [targetIndex];
    const lookahead = this.isMobile ? 3 : 5;

    for (let offset = 1; offset <= lookahead; offset++) {
      const forward = targetIndex + offset;
      if (forward < this.profile.count && !this.cache.has(forward)) {
        queue.push(forward);
      }
      const backward = targetIndex - offset;
      if (backward >= 0 && !this.cache.has(backward)) {
        queue.push(backward);
      }
    }

    // Thực thi tối đa 4 request song song
    const toFetch = queue.filter((idx) => !this.cache.has(idx) && !this.inFlightRequests.has(idx));
    const activeCount = this.inFlightRequests.size;
    const canLaunch = Math.max(0, this.maxConcurrent - activeCount);

    for (let i = 0; i < Math.min(canLaunch, toFetch.length); i++) {
      const idx = toFetch[i];
      this.loadFrame(idx).catch(() => {
        // Lỗi một frame được bỏ qua, giữ hình trước đó
      });
    }
  }

  private insertToCache(index: number, img: ImageBitmap | HTMLImageElement) {
    if (this.cache.has(index)) return;

    // Kiểm tra dung lượng cache
    if (this.cache.size >= this.maxCacheSize) {
      // Tìm frame xa targetIndex nhất để evict
      let furthestIndex = -1;
      let maxDist = -1;

      this.cache.forEach((_, cachedIdx) => {
        const dist = Math.abs(cachedIdx - this.currentTargetIndex);
        if (dist > maxDist) {
          maxDist = dist;
          furthestIndex = cachedIdx;
        }
      });

      if (furthestIndex !== -1) {
        const evicted = this.cache.get(furthestIndex);
        if (evicted && 'close' in evicted && typeof (evicted as ImageBitmap).close === 'function') {
          (evicted as ImageBitmap).close();
        }
        this.cache.delete(furthestIndex);
      }
    }

    this.cache.set(index, img);
  }

  private fallbackDecodeImage(blob: Blob): Promise<HTMLImageElement> {
    const { promise, resolve, reject } = Promise.withResolvers<HTMLImageElement>();
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image decode error'));
    };
    img.src = url;
    return promise;
  }

  public dispose() {
    this.disposed = true;
    this.inFlightRequests.forEach((controller) => {
      controller.abort();
    });
    this.inFlightRequests.clear();

    this.cache.forEach((img) => {
      if ('close' in img && typeof (img as ImageBitmap).close === 'function') {
        (img as ImageBitmap).close();
      }
    });
    this.cache.clear();
  }
}
