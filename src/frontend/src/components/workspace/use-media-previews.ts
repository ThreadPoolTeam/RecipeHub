'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDemo } from '@/lib/demo/provider';

export function useMediaPreviews() {
  const { repo } = useDemo();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const objectUrls = useRef(new Set<string>());

  const addPreview = useCallback((id: string, url: string) => {
    if (url.startsWith('blob:')) objectUrls.current.add(url);
    setPreviews(current => ({ ...current, [id]: url }));
  }, []);

  useEffect(() => {
    let active = true;
    const urls = objectUrls.current;
    repo.getMedia().then(items => {
      if (!active) return;
      const loaded: Record<string, string> = {};
      for (const item of items) {
        if (item.blob && item.blob.size > 0) {
          const url = URL.createObjectURL(item.blob);
          urls.add(url);
          loaded[item.id] = url;
        } else if (item.deliveryUrl) {
          loaded[item.id] = item.deliveryUrl;
        }
      }
      setPreviews(current => ({ ...loaded, ...current }));
    }).catch(() => {});
    return () => {
      active = false;
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [repo]);

  return { previews, addPreview };
}
