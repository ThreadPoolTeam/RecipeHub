import Image from 'next/image';
import Link from 'next/link';

const categories = [
  { label: 'Cà phê', count: 4, image: '/landing/figma/cat-ca-phe.png' },
  { label: 'Trà & matcha', count: 5, image: '/landing/figma/cat-tra-matcha.png' },
  { label: 'Trái cây', count: 3, image: '/landing/figma/cat-trai-cay.png' },
  { label: 'Tất cả menu', count: 12, image: '/landing/figma/cat-tat-ca-menu.png' },
];

export function LandingCategories() {
  return (
    <section id="workspace" className="px-4 pb-20 md:px-10">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <h2 className="font-display text-h2 font-medium text-foreground">Một thư viện hương vị</h2>
        <div className="grid max-w-[696px] grid-cols-2 gap-8 sm:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.label} href="/viewer" className="flex flex-col items-center text-center text-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Image src={category.image} alt="" width={150} height={150} className="aspect-square w-full max-w-[150px] rounded-full object-cover" />
              <span className="mt-4 font-display text-lg font-medium">{category.label}</span>
              <span className="mt-2 text-xs text-muted-foreground">{category.count} công thức</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
