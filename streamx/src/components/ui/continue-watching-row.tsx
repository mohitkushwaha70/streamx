'use client';

import { useState, useEffect } from 'react';
import { ContentRow } from '@/components/ui/content-row';
import type { ContentItem } from '@/types';

interface HistoryItem extends ContentItem {
  progress?: number;
  completed?: boolean;
}

export function ContinueWatchingRow() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/user/history');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const incomplete = data.data
              .filter((item: HistoryItem) => item.progress != null && item.progress > 0 && !item.completed)
              .slice(0, 20);
            setItems(incomplete);
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading || items.length === 0) return null;

  const progressMap = new Map<string, number>();
  items.forEach((item) => {
    if (item.progress != null) {
      progressMap.set(item.id, item.progress);
    }
  });

  return (
    <ContentRow
      title="Continue Watching"
      items={items}
      progressMap={progressMap}
    />
  );
}
