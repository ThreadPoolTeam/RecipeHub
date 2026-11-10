'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  title?: string;
}

export function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);

  useLayoutEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!menu || !trigger) return;

    const positionMenu = () => {
      const anchor = trigger.getBoundingClientRect();
      const bounds = menu.getBoundingClientRect();
      const top = anchor.bottom + 4 + bounds.height <= window.innerHeight
        ? anchor.bottom + 4
        : Math.max(4, anchor.top - bounds.height - 4);
      setPosition({ top, left: Math.max(4, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 4)) });
    };
    const closeOutside = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node) && !trigger.contains(event.target as Node)) {
        setOpen(false);
        trigger.focus();
      }
    };
    positionMenu();
    const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)');
    items[focusLast.current ? items.length - 1 : 0]?.focus();
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open]);

  const openMenu = (last = false) => {
    focusLast.current = last;
    setOpen(true);
  };
  const select = (action: () => void) => {
    setOpen(false);
    triggerRef.current?.focus();
    action();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  };
  const itemClass = 'w-full rounded-md px-3 py-2 text-left text-sm focus:bg-secondary focus:outline-none hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Thao tác"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openMenu(event.key === 'ArrowUp');
          }
        }}
        className="rounded-md p-2 text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Thao tác"
          onKeyDown={handleKeyDown}
          style={{ top: position.top, left: position.left }}
          className="fixed z-[9999] max-h-[calc(100vh-8px)] w-44 overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lift"
        >
          {items.map((item) => (
            <React.Fragment key={item.label}>
              {item.separator && <div role="separator" className="my-1 border-t border-border" />}
              <button type="button" role="menuitem" disabled={item.disabled} title={item.title} onClick={() => select(item.onSelect)} className={`${itemClass} ${item.danger ? 'text-destructive' : ''}`}>{item.label}</button>
            </React.Fragment>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
