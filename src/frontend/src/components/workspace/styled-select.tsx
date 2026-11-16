'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type StyledSelectOption = { value: string | number; label: string; disabled?: boolean };

type Props = {
  id?: string;
  value: string;
  options: StyledSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  name?: string;
  title?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};

export function StyledSelect({ id, value, options, onChange, disabled, required, error, name, title, ...aria }: Props) {
  const generatedId = useId();
  const listId = `${generatedId}-list`;
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef('');
  const searchTime = useRef(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 240, flip: false });
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
  const selectedIndex = options.findIndex((option) => String(option.value) === value);
  const current = selectedIndex;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const height = Math.min(240, options.length * 40 + 8);
      const flip = below < height && above > below;
      const maxHeight = Math.max(0, Math.min(240, flip ? above : below));
      setPosition({ left: rect.left, top: flip ? rect.top - Math.min(height, maxHeight) - 4 : rect.bottom + 4, width: rect.width, maxHeight, flip });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !list.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId, open]);

  const show = () => { if (!disabled && enabled.length) { setPortalTarget(trigger.current?.closest('[role="dialog"]') ?? document.body); setActive(current >= 0 ? current : enabled[0]); setOpen(true); } };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    setOpen(false);
    if (String(option.value) !== value) onChange(String(option.value));
    trigger.current?.focus();
  };
  const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!enabled.length) return;
      const index = open ? active : current;
      const offset = enabled.indexOf(index);
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled[enabled.length - 1] : enabled[(Math.max(offset, 0) + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length];
      if (!open) setPortalTarget(trigger.current?.closest('[role="dialog"]') ?? document.body);
      setActive(open ? next : (current >= 0 ? current : enabled[0])); setOpen(true); return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active); else show();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      search.current = (now - searchTime.current > 700 ? '' : search.current) + event.key.toLocaleLowerCase('vi');
      searchTime.current = now;
      const match = options.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase('vi').startsWith(search.current));
      if (match >= 0) { if (!open) setPortalTarget(trigger.current?.closest('[role="dialog"]') ?? document.body); setActive(match); setOpen(true); }
    }
  };

  return <>
    <button ref={trigger} id={id || generatedId} type="button" role="combobox" disabled={disabled} aria-expanded={open} aria-controls={open ? listId : undefined}
      aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} aria-required={required || undefined} aria-invalid={error || undefined}
      title={title} {...aria} onClick={() => open ? setOpen(false) : show()} onKeyDown={keyDown}
      className={`flex h-[var(--role-control-height,40px)] w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-card px-3 text-left text-sm text-foreground shadow-inset focus-visible:!outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-destructive focus-visible:ring-destructive' : 'border-input focus-visible:ring-ring'}`}>
      <span className="truncate">{options[current]?.label ?? ''}</span><ChevronDown aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
    </button>
    {required ? <input aria-hidden="true" tabIndex={-1} className="pointer-events-none absolute h-px w-px opacity-0" value={value} name={name} disabled={disabled} required
      onChange={() => {}} onInvalid={(event) => { event.preventDefault(); requestAnimationFrame(() => trigger.current?.focus()); }} /> : name && <input type="hidden" name={name} value={value} disabled={disabled} />}
    {open && portalTarget && createPortal(<div ref={list} id={listId} role="listbox" aria-label={aria['aria-label'] || title} aria-labelledby={aria['aria-labelledby'] || (aria['aria-label'] || title ? undefined : id || generatedId)}
      className={`fixed z-[100] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lift animate-[workspace-select-enter_140ms_ease-out] motion-reduce:animate-none ${position.flip ? 'origin-bottom' : 'origin-top'}`}
      style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight, '--select-enter-offset': position.flip ? '4px' : '-4px' } as React.CSSProperties}>
      {options.map((option, index) => <div key={`${option.value}-${index}`} id={`${listId}-${index}`} role="option" aria-selected={index === current} aria-disabled={option.disabled || undefined}
        onMouseMove={() => !option.disabled && setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}
        className={`flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${index === current ? 'bg-primary/10' : index === active ? 'bg-[color:color-mix(in_srgb,var(--color-border)_60%,transparent)]' : ''}`}>
        <span className="min-w-0 flex-1 break-words">{option.label}</span>{index === current && <Check aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0 text-primary" />}
      </div>)}
    </div>, portalTarget)}
  </>;
}
