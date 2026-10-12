'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ManifestData } from './frame-sequence';

interface ScrollFrameStoryProps {
  manifest: ManifestData;
}

export function ScrollFrameStory({ manifest }: ScrollFrameStoryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scene overlay DOM refs for zero-re-render 60fps transform/opacity updates
  const scene0Ref = useRef<HTMLDivElement>(null);
  const scene1Ref = useRef<HTMLDivElement>(null);
  const scene2Ref = useRef<HTMLDivElement>(null);
  const scene3Ref = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Memory image cache & prefetch controller
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const pendingRequestsRef = useRef<Set<number>>(new Set());
  const lastDrawnIndexRef = useRef<number>(-1);
  const currentTargetIndexRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const isIntersectingRef = useRef<boolean>(true);
  const rafIdRef = useRef<number | null>(null);

  const isMobileRef = useRef<boolean>(false);

  // Lấy đường dẫn ảnh theo frame index
  const getFrameUrl = useCallback((index: number, isMobile: boolean) => {
    const pad = String(index + 1).padStart(4, '0');
    const folder = isMobile ? 'mobile' : 'desktop';
    return `/landing/phe-la/${folder}/frame-${pad}.webp`;
  }, []);

  // Vẽ frame lên canvas theo tỉ lệ cover
  const drawImageToCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    if (cw === 0 || ch === 0) return;

    const iw = img.naturalWidth || 1920;
    const ih = img.naturalHeight || 1080;

    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const dx = (cw - sw) / 2;
    const dy = (ch - sh) / 2;

    ctx.drawImage(img, dx, dy, sw, sh);
  }, []);

  // Prefetch một frame cụ thể vào cache
  const prefetchFrame = useCallback(
    (index: number, totalFrames: number, isMobile: boolean) => {
      if (index < 0 || index >= totalFrames) return;
      if (imageCacheRef.current.has(index) || pendingRequestsRef.current.has(index)) return;

      pendingRequestsRef.current.add(index);
      const img = new window.Image();
      img.src = getFrameUrl(index, isMobile);

      img.onload = () => {
        pendingRequestsRef.current.delete(index);
        imageCacheRef.current.set(index, img);

        // Nếu frame vừa tải xong chính là target hiện tại hoặc sát target, vẽ ngay
        if (Math.abs(index - currentTargetIndexRef.current) <= 1) {
          lastDrawnIndexRef.current = index;
          drawImageToCanvas(img);
        }
      };

      img.onerror = () => {
        pendingRequestsRef.current.delete(index);
      };
    },
    [getFrameUrl, drawImageToCanvas]
  );

  // Quản lý prefetch theo hướng cuộn (directional prefetch window)
  const prefetchAround = useCallback(
    (target: number, isScrollingDown: boolean, totalFrames: number, isMobile: boolean) => {
      const windowAhead = isMobile ? 10 : 16;
      const windowBehind = 4;

      if (isScrollingDown) {
        for (let i = target; i <= Math.min(totalFrames - 1, target + windowAhead); i++) {
          prefetchFrame(i, totalFrames, isMobile);
        }
        for (let i = target - 1; i >= Math.max(0, target - windowBehind); i--) {
          prefetchFrame(i, totalFrames, isMobile);
        }
      } else {
        for (let i = target; i >= Math.max(0, target - windowAhead); i--) {
          prefetchFrame(i, totalFrames, isMobile);
        }
        for (let i = target + 1; i <= Math.min(totalFrames - 1, target + windowBehind); i++) {
          prefetchFrame(i, totalFrames, isMobile);
        }
      }
    },
    [prefetchFrame]
  );

  // Resize canvas đồng bộ với DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const newWidth = Math.floor(rect.width * dpr);
      const newHeight = Math.floor(rect.height * dpr);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        // Vẽ lại frame hiện tại nếu có
        const currentImg = imageCacheRef.current.get(lastDrawnIndexRef.current);
        if (currentImg) {
          drawImageToCanvas(currentImg);
        }
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawImageToCanvas]);

  // Khởi tạo: kiểm tra reduced-motion & nạp các frame đầu tiên
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(motionQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    const isMobile = window.innerWidth < 768;
    isMobileRef.current = isMobile;
    const totalFrames = isMobile ? manifest.profiles.mobile.count : manifest.profiles.desktop.count;

    // Nạp ngay frame 0 và vẽ lên canvas
    const firstImg = new window.Image();
    firstImg.src = getFrameUrl(0, isMobile);
    firstImg.onload = () => {
      imageCacheRef.current.set(0, firstImg);
      lastDrawnIndexRef.current = 0;
      setIsReady(true);
      drawImageToCanvas(firstImg);

      // Preload ngay 20 frame tiếp theo để khi vừa lăn chuột là có sẵn
      for (let i = 1; i <= Math.min(24, totalFrames - 1); i++) {
        prefetchFrame(i, totalFrames, isMobile);
      }
    };

    const cache = imageCacheRef.current;
    const pending = pendingRequestsRef.current;
    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      cache.clear();
      pending.clear();
    };
  }, []);

  // IntersectionObserver để tắt RAF khi scroll ra ngoài track
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        isIntersectingRef.current = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );

    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  // Cập nhật vị trí & độ trong suốt của các phân cảnh theo progress
  const updateScenes = (progress: number) => {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    // Helper tính transform & opacity cho cảnh
    const applyScene = (
      el: HTMLDivElement | null,
      enterStart: number,
      enterEnd: number,
      exitStart: number,
      exitEnd: number
    ) => {
      if (!el) return;
      if (progress < enterStart || progress > exitEnd) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      // Đang trượt vào
      if (progress < enterEnd) {
        const t = clamp01((progress - enterStart) / (enterEnd - enterStart));
        const ease = 1 - Math.pow(1 - t, 3);
        el.style.opacity = String(ease);
        el.style.transform = `translate3d(0, ${(1 - ease) * 40}px, 0)`;
        el.style.pointerEvents = t > 0.5 ? 'auto' : 'none';
        return;
      }

      // Đang giữ ghim trung tâm (đọc rõ)
      if (progress <= exitStart) {
        el.style.opacity = '1';
        el.style.transform = 'translate3d(0, 0, 0)';
        el.style.pointerEvents = 'auto';
        return;
      }

      // Đang trượt ra
      const t = clamp01((progress - exitStart) / (exitEnd - exitStart));
      el.style.opacity = String(1 - t);
      el.style.transform = `translate3d(0, ${-t * 40}px, 0)`;
      el.style.pointerEvents = t < 0.5 ? 'auto' : 'none';
    };

    // 1. Hero: [0.00, 0.16] (Pin: 0.00 -> 0.10, Exit: 0.10 -> 0.16)
    applyScene(scene0Ref.current, -0.05, 0.00, 0.10, 0.16);

    // 2. Chương I (Nguyên liệu): [0.16, 0.44] (Enter: 0.16 -> 0.22, Pin: 0.22 -> 0.36, Exit: 0.36 -> 0.44)
    applyScene(scene1Ref.current, 0.16, 0.22, 0.36, 0.44);

    // 3. Chương II (Thao tác): [0.44, 0.72] (Enter: 0.44 -> 0.50, Pin: 0.50 -> 0.64, Exit: 0.64 -> 0.72)
    applyScene(scene2Ref.current, 0.44, 0.50, 0.64, 0.72);

    // 4. Chương III (Thành phẩm): [0.72, 0.95] (Enter: 0.72 -> 0.78, Pin: 0.78 -> 0.90, Exit: 0.90 -> 0.95)
    applyScene(scene3Ref.current, 0.72, 0.78, 0.90, 0.95);

    // Cập nhật dots chỉ số bên hông
    const activeDot =
      progress < 0.16 ? 0 : progress < 0.44 ? 1 : progress < 0.72 ? 2 : 3;

    dotRefs.current.forEach((dot, idx) => {
      if (!dot) return;
      if (idx === activeDot) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  };

  // Scroll listener: Lăn chuột tới đâu -> video tua tới đó!
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;
  const drawImageRef = useRef(drawImageToCanvas);
  drawImageRef.current = drawImageToCanvas;
  const prefetchAroundRef = useRef(prefetchAround);
  prefetchAroundRef.current = prefetchAround;

  // Scroll listener: Lăn chuột tới đâu -> video tua tới đó!
  useEffect(() => {
    if (isReducedMotion) return;

    const handleScroll = () => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      // Bỏ qua nếu hoàn toàn ngoài màn hình
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const curTrack = trackRef.current;
        if (!curTrack) return;

        const currentY = window.scrollY;
        const isScrollingDown = currentY >= lastScrollYRef.current;
        lastScrollYRef.current = currentY;

        const trackRect = curTrack.getBoundingClientRect();
        const scrollable = trackRect.height - window.innerHeight;
        const rawProgress = scrollable > 0 ? -trackRect.top / scrollable : 0;
        const progress = Math.max(0, Math.min(1, rawProgress));

        // 1. Cập nhật text cảnh xuất hiện/biến mất mượt mà
        updateScenes(progress);

        // 2. Tính frame index tương ứng với vị trí cuộn
        const currentManifest = manifestRef.current;
        const isMobile = isMobileRef.current;
        const totalFrames = isMobile
          ? currentManifest.profiles.mobile.count
          : currentManifest.profiles.desktop.count;

        const targetFrame = Math.min(
          totalFrames - 1,
          Math.max(0, Math.floor(progress * totalFrames))
        );
        currentTargetIndexRef.current = targetFrame;

        // 3. Kích hoạt prefetch đón đầu theo hướng cuộn
        prefetchAroundRef.current(targetFrame, isScrollingDown, totalFrames, isMobile);

        // 4. Vẽ frame: nếu có sẵn frame mục tiêu -> vẽ ngay!
        const cache = imageCacheRef.current;
        if (cache.has(targetFrame)) {
          if (lastDrawnIndexRef.current !== targetFrame) {
            lastDrawnIndexRef.current = targetFrame;
            drawImageRef.current(cache.get(targetFrame)!);
          }
        } else {
          // Nếu frame mục tiêu chưa kịp nạp: tìm frame đã nạp GẦN NHẤT để vẽ
          let nearestIdx = -1;
          let minDiff = Infinity;
          cache.forEach((_, idx) => {
            const diff = Math.abs(idx - targetFrame);
            if (diff < minDiff) {
              minDiff = diff;
              nearestIdx = idx;
            }
          });

          if (nearestIdx !== -1 && lastDrawnIndexRef.current !== nearestIdx) {
            lastDrawnIndexRef.current = nearestIdx;
            drawImageRef.current(cache.get(nearestIdx)!);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isReducedMotion]);

  return (
    <section id="story" className="story-track" ref={trackRef} aria-label="Hành trình sáng tạo công thức">
      {/* 1. Canvas Sticky Stage (Full-bleed video scrubbing) */}
      {!isReducedMotion && (
        <div className="story-sticky-stage">
          {/* Poster nền có sẵn ngay lập tức */}
          <div
            className="story-canvas absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/landing/phe-la/poster.webp')" }}
            aria-hidden="true"
          />

          {/* Canvas chính nhận từng frame video khi người dùng cuộn */}
          <canvas
            ref={canvasRef}
            className="story-canvas absolute inset-0 z-10 w-full h-full object-cover"
            aria-hidden="true"
          />

          {/* Lớp gradient tinh tế làm nổi bật chữ trắng ngà */}
          <div className="story-canvas-overlay absolute inset-0 z-20 pointer-events-none" />

          {/* Narrative Text Overlay: Chữ nổi tự nhiên trên video */}
          <div className="story-narrative-overlay absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-6">
            {/* Phân cảnh 0: Hero Mở Đầu */}
            <div
              ref={scene0Ref}
              className="story-chapter-card will-change-transform opacity-100 pointer-events-auto"
            >
              <span className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold">
                TỪ Ý TƯỞNG ĐẾN HƯƠNG VỊ
              </span>
              <h1 className="landing-heading-hero font-bold tracking-tight text-[#F2F0EB]">
                Một hương vị <br />
                <span className="text-[#C9A84C]">bắt đầu từ đâu?</span>
              </h1>
              <p className="landing-subheading max-w-2xl text-[#9E9A90]">
                RecipeHub — quản lý công thức và hành trình phát triển đồ uống.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-[#9E9A90] uppercase tracking-widest animate-pulse">
                <span>&darr;</span> Cuộn để khám phá
              </div>
            </div>

            {/* Phân cảnh 1: Chương I (Nguyên liệu) */}
            <div
              ref={scene1Ref}
              className="story-chapter-card will-change-transform opacity-0 pointer-events-none"
            >
              <span className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold">
                01 — NGUYÊN LIỆU
              </span>
              <h2 className="landing-heading-chapter font-bold tracking-tight text-[#F2F0EB]">
                Bắt đầu từ nguyên liệu.
              </h2>
              <p className="landing-subheading max-w-xl text-[#9E9A90]">
                Mỗi thành phần mở đầu một câu chuyện.
              </p>
            </div>

            {/* Phân cảnh 2: Chương II (Thao tác & Chế biến) */}
            <div
              ref={scene2Ref}
              className="story-chapter-card will-change-transform opacity-0 pointer-events-none"
            >
              <span className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold">
                02 — CHẾ BIẾN
              </span>
              <h2 className="landing-heading-chapter font-bold tracking-tight text-[#F2F0EB]">
                Hương vị qua từng thao tác.
              </h2>
              <p className="landing-subheading max-w-xl text-[#9E9A90]">
                Có những bước cần được ghi lại.
              </p>
            </div>

            {/* Phân cảnh 3: Chương III (Thành phẩm) */}
            <div
              ref={scene3Ref}
              className="story-chapter-card will-change-transform opacity-0 pointer-events-none"
            >
              <span className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold">
                03 — THÀNH PHẨM
              </span>
              <h2 className="landing-heading-chapter font-bold tracking-tight text-[#F2F0EB]">
                Một ly ngon. Cả một quá trình phía sau.
              </h2>
              <p className="landing-subheading max-w-xl text-[#9E9A90]">
                Giữ lại hương vị — và cả cách tạo nên nó.
              </p>
            </div>
          </div>

          {/* Dots chỉ số tiến trình cuộn */}
          <div className="story-progress-indicator relative z-40" aria-label="Tiến trình câu chuyện">
            {manifest.chapters.map((ch, idx) => (
              <div
                key={ch.id}
                ref={(el) => {
                  dotRefs.current[idx] = el;
                }}
                className={`story-progress-dot ${idx === 0 ? 'active' : ''}`}
                title={ch.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. Reduced Motion Fallback */}
      {isReducedMotion && (
        <div className="max-w-6xl mx-auto px-4 py-16 space-y-24">
          <div className="text-center space-y-4">
            <span className="text-xs tracking-widest uppercase text-[#C9A84C] font-semibold">
              TỪ Ý TƯỞNG ĐẾN HƯƠNG VỊ
            </span>
            <h1 className="landing-heading-hero font-bold text-[#F2F0EB]">
              Một hương vị <span className="text-[#C9A84C]">bắt đầu từ đâu?</span>
            </h1>
            <p className="landing-subheading max-w-2xl mx-auto text-[#9E9A90]">
              RecipeHub — quản lý công thức và hành trình phát triển đồ uống.
            </p>
            <div className="mt-8 rounded-xl overflow-hidden border border-[#26262B]">
              <Image
                src="/landing/phe-la/poster.webp"
                alt="Khởi nguồn nguyên liệu tự nhiên"
                width={1920}
                height={1080}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl space-y-4">
              <span className="text-xs uppercase text-[#C9A84C] tracking-wider font-semibold">
                01 — NGUYÊN LIỆU
              </span>
              <h2 className="text-2xl font-bold text-[#F2F0EB]">Bắt đầu từ nguyên liệu.</h2>
              <p className="text-sm text-[#9E9A90]">Mỗi thành phần mở đầu một câu chuyện.</p>
              <div className="rounded-lg overflow-hidden border border-[#26262B]">
                <Image
                  src="/landing/phe-la/chapters/ingredients.webp"
                  alt="Nguyên liệu trà và trân châu"
                  width={640}
                  height={360}
                  className="w-full h-auto"
                />
              </div>
            </div>

            <div className="p-6 rounded-xl space-y-4">
              <span className="text-xs uppercase text-[#C9A84C] tracking-wider font-semibold">
                02 — CHẾ BIẾN
              </span>
              <h2 className="text-2xl font-bold text-[#F2F0EB]">Hương vị qua từng thao tác.</h2>
              <p className="text-sm text-[#9E9A90]">Có những bước cần được ghi lại.</p>
              <div className="rounded-lg overflow-hidden border border-[#26262B]">
                <Image
                  src="/landing/phe-la/chapters/process.webp"
                  alt="Thao tác chế biến và khuấy trân châu"
                  width={640}
                  height={360}
                  className="w-full h-auto"
                />
              </div>
            </div>

            <div className="p-6 rounded-xl space-y-4">
              <span className="text-xs uppercase text-[#C9A84C] tracking-wider font-semibold">
                03 — THÀNH PHẨM
              </span>
              <h2 className="text-2xl font-bold text-[#F2F0EB]">
                Một ly ngon. Cả một quá trình phía sau.
              </h2>
              <p className="text-sm text-[#9E9A90]">
                Giữ lại hương vị — và cả cách tạo nên nó.
              </p>
              <div className="rounded-lg overflow-hidden border border-[#26262B]">
                <Image
                  src="/landing/phe-la/chapters/drink.webp"
                  alt="Ly đồ uống hoàn thiện"
                  width={640}
                  height={360}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Noscript Fallback */}
      <noscript>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-8">
          <h1 className="text-4xl font-bold text-[#F2F0EB]">Một hương vị bắt đầu từ đâu?</h1>
          <p className="text-[#9E9A90]">
            RecipeHub — quản lý công thức và hành trình phát triển đồ uống.
          </p>
          <div className="border border-[#26262B] rounded-xl overflow-hidden">
            <Image
              src="/landing/phe-la/poster.webp"
              alt="Hành trình sáng tạo công thức"
              width={1920}
              height={1080}
              className="w-full h-auto"
            />
          </div>
        </div>
      </noscript>
    </section>
  );
}
