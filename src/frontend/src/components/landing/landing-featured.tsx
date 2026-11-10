import Image from 'next/image';
import Link from 'next/link';
import { StatusBadge } from '@/components/workspace/status-badge';

const recipes = [
  { code: 'CF-001', category: 'Cà phê', title: 'Cà phê sữa đá', owner: 'Minh Anh', version: 'v3', image: '/landing/figma/tile-ca-phe-sua-da.jpg' },
  { code: 'TR-002', category: 'Trà & matcha', title: 'Matcha latte', owner: 'Thanh Huyền', version: 'v2', image: '/landing/figma/tile-matcha-latte.jpg' },
  { code: 'TR-003', category: 'Trà & matcha', title: 'Trà đào cam sả', owner: 'Quang Minh', version: 'v2', image: '/landing/figma/tile-tra-dao-cam-sa.jpg' },
];

export function LandingFeatured() {
  return (
    <section className="px-4 pb-20 md:px-10 md:pb-[72px]">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <h2 className="font-display text-h2 font-medium text-foreground">Đang phục vụ tại quầy</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {recipes.map((recipe) => (
            <Link key={recipe.code} href="/viewer" className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Image src={recipe.image} alt="" width={408} height={320} className="h-auto w-full aspect-[408/320] object-cover" />
              <div className="space-y-2 p-[22px]">
                <p className="text-xs text-muted-foreground">{recipe.code} · {recipe.category}</p>
                <h3 className="font-display text-lg font-medium text-foreground">{recipe.title}</h3>
                <div className="flex flex-wrap items-center gap-3"><StatusBadge status="Published" dot /><span className="text-xs text-muted-foreground">{recipe.owner} · {recipe.version}</span></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
