import { LandingNav } from './landing-nav';
import { LandingHero } from './landing-hero';
import { LandingFormulaSheet } from './landing-formula-sheet';
import { LandingJourney } from './landing-journey';
import { LandingFeatures } from './landing-features';
import { LandingCta } from './landing-cta';
import { LandingFooter } from './landing-footer';
import './landing.css';

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-background">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingFormulaSheet />
        <LandingJourney />
        <LandingFeatures />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
