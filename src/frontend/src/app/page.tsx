import fs from 'fs';
import path from 'path';
import { LandingPage } from '@/components/landing/landing-page';
import { ManifestData } from '@/components/landing/frame-sequence';

function getManifest(): ManifestData {
  const candidates = [
    path.join(process.cwd(), 'public/landing/phe-la/manifest.json'),
    path.join(process.cwd(), 'src/frontend/public/landing/phe-la/manifest.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, 'utf-8'));
    }
  }
  throw new Error('Manifest file not found in candidates');
}

export default function HomePage() {
  const manifest = getManifest();
  return <LandingPage manifest={manifest} />;
}
