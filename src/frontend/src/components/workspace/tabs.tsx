'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  'aria-label': string;
  className?: string;
}

export function Tabs({ items, value, onValueChange, 'aria-label': label, className = '' }: TabsProps) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.map((item, index) => !item.disabled ? index : -1).filter(index => index >= 0);
  const selected = items.findIndex(item => item.value === value && !item.disabled);
  const active = selected >= 0 ? selected : enabled[0];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const position = enabled.indexOf(index);
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = enabled[(position + 1) % enabled.length];
    else if (event.key === 'ArrowLeft') next = enabled[(position - 1 + enabled.length) % enabled.length];
    else if (event.key === 'Home') next = enabled[0];
    else if (event.key === 'End') next = enabled[enabled.length - 1];
    else return;
    event.preventDefault();
    if (next !== undefined) {
      refs.current[next]?.focus();
      onValueChange(items[next].value);
    }
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex overflow-x-auto border-b border-border">
        {items.map((item, index) => (
          <button key={item.value} ref={node => { refs.current[index] = node; }} type="button"
            role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`}
            aria-selected={index === active} tabIndex={index === active ? 0 : -1}
            disabled={item.disabled} onClick={() => onValueChange(item.value)}
            onKeyDown={event => onKeyDown(event, index)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-body-sm font-medium disabled:opacity-50 ${index === active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div key={item.value} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`}
          hidden={index !== active} tabIndex={0}>
          {index === active && item.content}
        </div>
      ))}
    </div>
  );
}
