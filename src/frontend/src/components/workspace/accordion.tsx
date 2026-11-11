'use client';

import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

interface AccordionProps extends Omit<ComponentProps<'details'>, 'title'> {
  title: ReactNode;
  children: ReactNode;
}

export function Accordion({ title, children, className = '', ...props }: AccordionProps) {
  return (
    <details {...props} className={`group rounded-lg border border-border bg-card ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-5 text-body-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="px-4 pb-5 text-body text-muted-foreground">{children}</div>
    </details>
  );
}
