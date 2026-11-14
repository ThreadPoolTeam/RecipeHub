import Link from 'next/link';
import { Coffee } from 'lucide-react';

export function BrandLogo({ href }: { href?: string }) {
  const content = <><Coffee aria-hidden="true" className="h-7 w-7 text-primary" strokeWidth={1.5} /><span><span className="block font-display text-lg font-medium leading-5">RecipeHub</span><span className="block text-[10px] tracking-wide text-muted-foreground">BEVERAGE R&amp;D</span></span></>;
  const className = 'flex shrink-0 items-center gap-2 text-foreground';
  return href ? <Link href={href} className={`${className} rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}>{content}</Link> : <div className={className}>{content}</div>;
}
