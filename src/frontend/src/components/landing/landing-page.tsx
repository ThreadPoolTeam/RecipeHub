'use client';

import './landing.css';
import { useEffect, useRef, useState } from 'react';
import { ManifestData } from './frame-sequence';
import { ScrollFrameStory } from './scroll-frame-story';
import { LandingNav } from './landing-nav';
import { LandingHero } from './landing-hero';
import { LandingCategories } from './landing-categories';
import { LandingFeatured } from './landing-featured';
import { LandingFeatures } from './landing-features';
import { LandingCta } from './landing-cta';
import { LandingFooter } from './landing-footer';

interface LandingPageProps {
  manifest: ManifestData;
}

export function LandingPage({ manifest }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [tone, setTone] = useState<'dark' | 'light'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const lightMarkerRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateToneAndScroll = () => {
      setScrolled(window.scrollY > 40);
      if (lightMarkerRef.current && headerRef.current) {
        const headerBottom = headerRef.current.getBoundingClientRect().bottom;
        const markerTop = lightMarkerRef.current.getBoundingClientRect().top;
        const isLight = markerTop <= headerBottom;
        setTone((prev) => (prev !== (isLight ? 'light' : 'dark') ? (isLight ? 'light' : 'dark') : prev));
      }
    };
    updateToneAndScroll();
    window.addEventListener('scroll', updateToneAndScroll, { passive: true });
    window.addEventListener('resize', updateToneAndScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateToneAndScroll);
      window.removeEventListener('resize', updateToneAndScroll);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="landing flex min-h-screen flex-col">
      <LandingNav headerRef={headerRef} mobileToggleRef={mobileToggleRef} tone={tone} scrolled={scrolled} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="w-full flex-1">
        <div id="story" className="scroll-mt-20"><ScrollFrameStory manifest={manifest} /></div>
        <div ref={lightMarkerRef} className="h-0 w-full" aria-hidden="true" />
        <LandingHero />
        <LandingCategories />
        <LandingFeatured />
        <LandingFeatures />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
