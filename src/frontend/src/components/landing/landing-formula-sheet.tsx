'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LandingReveal } from './landing-reveal';

const versions = [
  { name: 'Matcha latte', note: 'Vị trà xanh đậm, sữa tươi', milk: 150, grams: 84, status: 'Bản nháp', live: 'Đang xem v1.0, Matcha latte: Matcha 4 g, Sữa 150 ml, Đá 80 g. Bỏ cà phê và kem sữa.' },
  { name: 'Cà phê sữa đá', note: 'Thêm lớp kem sữa béo', milk: 90, grams: 80, status: 'Đã phát hành', live: 'Đang xem v2.0, Cà phê sữa đá: Cà phê 30 ml, Sữa 90 ml, Kem sữa 30 ml, Đá 80 g. Bỏ matcha.' },
] as const;

export function LandingFormulaSheet() {
  const [version, setVersion] = useState<0 | 1>(0);
  const [amounts, setAmounts] = useState({ milk: 150, grams: 84 });
  const [changed, setChanged] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const amountsRef = useRef(amounts);
  const frame = useRef(0);
  const timeout = useRef<number | undefined>(undefined);
  const item = versions[version];

  useEffect(() => () => {
    cancelAnimationFrame(frame.current);
    clearTimeout(timeout.current);
  }, []);

  function toggle() {
    const next = version === 0 ? 1 : 0;
    const target = versions[next];
    const from = amountsRef.current;
    cancelAnimationFrame(frame.current);
    clearTimeout(timeout.current);
    setVersion(next);
    setAnnouncement(target.live);
    setChanged(true);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const values = { milk: target.milk, grams: target.grams };
      amountsRef.current = values;
      setAmounts(values);
      return;
    }
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / 500);
      const eased = 1 - Math.pow(1 - progress, 3);
      const values = { milk: Math.round(from.milk + (target.milk - from.milk) * eased), grams: Math.round(from.grams + (target.grams - from.grams) * eased) };
      amountsRef.current = values;
      setAmounts(values);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    timeout.current = window.setTimeout(() => setChanged(false), 2500);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  }

  const rowClass = `landing-motion-formulaRow flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm md:min-h-16 md:text-base`;
  const deltaClass = 'landing-motion-delta';

  return (
    <section id="workspace" className="bg-secondary px-4 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <h2 className="font-display text-h2 font-medium text-foreground">Mỗi công thức, rõ từng lớp.</h2>
        <LandingReveal>
          <div
            role="button"
            tabIndex={0}
            aria-label={`Đang xem v${version + 1}.0, bấm để chuyển sang v${version === 0 ? 2 : 1}.0`}
            onClick={() => { if (window.getSelection()?.isCollapsed !== false) toggle(); }}
            onKeyDown={onKeyDown}
            className={`landing-motion-formulaCard cursor-pointer rounded-lg border border-border bg-card shadow-soft`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 md:px-6 md:py-5">
              <div className="space-y-1">
                <h3 className="font-display text-base font-medium text-foreground">Phiếu công thức · {item.name}</h3>
                <p className="text-xs text-muted-foreground">{item.note}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>v{version + 1}.0</span><span key={item.status} className={`landing-motion-status rounded-md px-2.5 py-1 text-[11px] font-medium ${version === 0 ? 'bg-info-soft text-info' : 'bg-success-soft text-success'}`}>{item.status}</span></div>
              </div>
              <div aria-hidden="true" className={`landing-motion-versionTabs ${version === 1 ? 'landing-motion-versionSecond' : ''} text-xs`}>
                <span className={'landing-motion-versionIndicator'} />
                <span className={`landing-motion-versionTab ${version === 0 ? 'landing-motion-versionSelected' : ''}`}>v1.0</span><span className={`landing-motion-versionTab ${version === 1 ? 'landing-motion-versionSelected' : ''}`}>v2.0</span>
              </div>
            </div>
            <div className="grid min-h-[610px] gap-6 p-4 md:min-h-[406px] md:grid-cols-[45%_1fr] md:items-center md:gap-10 md:p-6">
              <div className={`landing-motion-formulaImageFrame relative aspect-[4/3] overflow-hidden rounded-lg bg-card`}>
                <Image src="/landing/figma/tile-matcha-latte.jpg" alt={version === 0 ? 'Ly matcha latte' : ''} aria-hidden={version !== 0} fill sizes="(max-width: 768px) 100vw, 560px" className={`landing-motion-formulaImage ${version === 0 ? 'landing-motion-activeImage' : ''} object-contain ${version === 0 ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'} motion-reduce:translate-y-0`} />
                <Image src="/landing/figma/tile-ca-phe-sua-da.jpg" alt={version === 1 ? 'Ly cà phê sữa đá' : ''} aria-hidden={version !== 1} fill sizes="(max-width: 768px) 100vw, 560px" className={`landing-motion-formulaImage ${version === 1 ? 'landing-motion-activeImage' : ''} object-contain ${version === 1 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} motion-reduce:translate-y-0`} />
              </div>
              <div className="tabular-nums">
                <h4 className="mb-2 font-display text-panel font-medium">Nguyên liệu {changed && <span key={version} className={deltaClass}>bỏ {version === 1 ? 'Matcha' : 'Cà phê, Kem sữa'}</span>}</h4>
                <div className="grid">
                  <div aria-hidden={version !== 0} className={`col-start-1 row-start-1 ${rowClass} motion-safe:transition-[opacity,transform] motion-safe:duration-300 ${version === 0 ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'} motion-reduce:translate-y-0`}><span>Matcha {changed && <span className={deltaClass}>{version === 0 ? 'mới' : 'bỏ'}</span>}</span><b>4 g</b></div>
                  <div aria-hidden={version !== 1} className={`col-start-1 row-start-1 ${rowClass} motion-safe:transition-[opacity,transform] motion-safe:duration-300 ${version === 1 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} motion-reduce:translate-y-0`}><span>Cà phê {changed && <span className={deltaClass}>{version === 1 ? 'mới' : 'bỏ'}</span>}</span><b>30 ml</b></div>
                </div>
                <div className={rowClass}><span>Sữa {changed && <span className={deltaClass}>{version === 1 ? '−60 ml' : '+60 ml'}</span>}</span><b>{amounts.milk} ml</b></div>
                <div className={rowClass}><span>Đá</span><b>80 g</b></div>
                <div className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 ${version === 1 ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} aria-hidden={version !== 1}><div className="overflow-hidden"><div className={`${rowClass} motion-safe:transition-[opacity,transform] motion-safe:duration-300 ${version === 1 ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'} motion-reduce:translate-y-0`}><span>Kem sữa {changed && <span className={deltaClass}>{version === 1 ? 'mới' : 'bỏ'}</span>}</span><b>30 ml</b></div></div></div>
                <div className={`${rowClass} border-b-0 font-semibold`}><span>Tổng</span><span>150 ml + {amounts.grams} g</span></div>
              </div>
            </div>
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
        </LandingReveal>
      </div>
    </section>
  );
}
