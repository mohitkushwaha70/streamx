'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ContentItem, PaginatedResponse } from '@/types';

interface UseContentOptions {
  type?: string;
  genre?: string;
  sort?: string;
  featured?: boolean;
  trending?: boolean;
  limit?: number;
  page?: number;
}

export function useContent(options: UseContentOptions = {}) {
  const [data, setData] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(options.page || 1);
  const [pages, setPages] = useState(0);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (options.type) params.set('type', options.type);
      if (options.genre) params.set('genre', options.genre);
      if (options.sort) params.set('sort', options.sort);
      if (options.featured) params.set('featured', 'true');
      if (options.trending) params.set('trending', 'true');
      params.set('limit', String(options.limit || 20));
      params.set('page', String(page));

      const res = await fetch(`/api/content?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const d: PaginatedResponse<ContentItem> = json.data;
          setData((prev) => (page === 1 ? d.items : [...prev, ...d.items]));
          setTotal(d.total);
          setPages(d.pages);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [options.type, options.genre, options.sort, options.featured, options.trending, options.limit, page]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const loadMore = () => {
    if (page < pages) setPage((p) => p + 1);
  };

  const refetch = () => {
    setPage(1);
    setData([]);
    fetchContent();
  };

  return { data, total, loading, page, pages, loadMore, refetch, setPage };
}
