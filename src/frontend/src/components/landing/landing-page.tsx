import { LandingNav } from './landing-nav';
import { LandingHero } from './landing-hero';
import { LandingCategories } from './landing-categories';
import { LandingFeatured } from './landing-featured';
import { LandingFeatures } from './landing-features';
import { LandingCta } from './landing-cta';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingCategories />
        <LandingFeatured />
        <LandingFeatures />
        <LandingCta />
      </main>
    </div>
  );
}
