'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  Film,
  Tv,
  BookOpen,
} from 'lucide-react';
import { cn, formatRating } from '@/lib/utils';
import type { ContentItem, PaginatedResponse } from '@/types';

const TYPE_TABS = [
  { label: 'All', value: '' },
  { label: 'Movies', value: 'MOVIE' },
  { label: 'Series', value: 'SERIES' },
  { label: 'Anime', value: 'ANIME' },
];

export default function AdminContentPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') || '';

  const [content, setContent] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '12');
      params.set('page', String(page));
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/content?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const data: PaginatedResponse<ContentItem> = json.data;
          setContent(data.items);
          setTotal(data.total);
          setPages(data.pages);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, search]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/content/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContent((prev) => prev.filter((c) => c.id !== id));
        setTotal((t) => t - 1);
        setDeleteConfirm(null);
      }
    } catch {
      // silent
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MOVIE': return <Film className="w-4 h-4" />;
      case 'SERIES': return <Tv className="w-4 h-4" />;
      case 'ANIME': return <BookOpen className="w-4 h-4" />;
      default: return <Film className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Content</h1>
          <p className="text-muted text-sm mt-1">{total} items total</p>
        </div>
        <Link
          href="/admin/content/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e50914] hover:bg-[#b20710] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-surface border border-border rounded-lg p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                typeFilter === tab.value
                  ? 'bg-[#e50914] text-white'
                  : 'text-muted hover:text-white hover:bg-surface-hover'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Rating</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="w-48 h-4 skeleton" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-4 skeleton" /></td>
                    <td className="px-5 py-4 hidden sm:table-cell"><div className="w-8 h-4 skeleton" /></td>
                    <td className="px-5 py-4 hidden md:table-cell"><div className="w-16 h-4 skeleton" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-4 skeleton ml-auto" /></td>
                  </tr>
                ))
              ) : content.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-muted">
                    No content found
                  </td>
                </tr>
              ) : (
                content.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 rounded overflow-hidden bg-border shrink-0">
                          {item.poster ? (
                            <img src={item.poster} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted">
                              <Film className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white truncate max-w-[200px]">{item.title}</p>
                          <p className="text-xs text-muted mt-0.5">{item.genre}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-xs font-medium text-white">
                        {getTypeIcon(item.type)}
                        {item.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-sm text-white/80">{formatRating(item.rating)}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span
                        className={cn(
                          'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                          item.published
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        )}
                      >
                        {item.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/player/${item.id}`}
                          className="p-2 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/content/${item.id}/edit`}
                          className="p-2 text-muted hover:text-blue-400 rounded-lg hover:bg-white/5 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {deleteConfirm === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 bg-white/10 text-white text-xs rounded-md hover:bg-white/20 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-2 text-muted hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-sm text-muted">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm text-white bg-surface-hover rounded-md disabled:opacity-30 hover:bg-border transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1.5 text-sm text-white bg-surface-hover rounded-md disabled:opacity-30 hover:bg-border transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
