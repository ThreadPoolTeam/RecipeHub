'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function LandingReveal({ children, className = '', delay = 0, pendingClassName = '' }: { children: ReactNode; className?: string; delay?: number; pendingClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches || element.getBoundingClientRect().top <= window.innerHeight) return;
    setPending(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setPending(false);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`${className} ${pending ? pendingClassName : ''} motion-safe:transition-[opacity,transform] motion-safe:duration-500 motion-reduce:!translate-y-0 motion-reduce:!opacity-100 ${pending ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
