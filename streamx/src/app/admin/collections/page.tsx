'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  X,
  ChevronDown,
  GripVertical,
  Search,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/types';

interface Collection {
  id: string;
  name: string;
  description: string;
  poster?: string;
  items: { id: string; contentId: string; order: number; content?: ContentItem }[];
  createdAt: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPoster, setFormPoster] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [contentSearch, setContentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCollections(json.data || []);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleSave = async () => {
    const payload = { name: formName, description: formDescription, poster: formPoster };
    try {
      const isEdit = !!editingCollection;
      const url = isEdit ? `/api/collections/${editingCollection.id}` : '/api/collections';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (isEdit) {
            setCollections((prev) =>
              prev.map((c) => (c.id === editingCollection.id ? { ...c, ...json.data } : c))
            );
          } else {
            setCollections((prev) => [...prev, { ...json.data, items: [] }]);
          }
          resetForm();
        }
      }
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCollections((prev) => prev.filter((c) => c.id !== id));
        if (selectedCollection === id) setSelectedCollection(null);
      }
    } catch {
      // silent
    }
  };

  const handleSearchContent = async (query: string) => {
    setContentSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/content?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSearchResults(json.data.items || []);
      }
    } catch {
      // silent
    } finally {
      setSearchLoading(false);
    }
  };

  const addContentToCollection = async (collectionId: string, contentId: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      });
      if (res.ok) {
        await fetchCollections();
        setSearchResults([]);
        setContentSearch('');
      }
    } catch {
      // silent
    }
  };

  const removeContentFromCollection = async (collectionId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchCollections();
      }
    } catch {
      // silent
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPoster('');
    setEditingCollection(null);
    setShowForm(false);
  };

  const startEdit = (col: Collection) => {
    setEditingCollection(col);
    setFormName(col.name);
    setFormDescription(col.description);
    setFormPoster(col.poster || '');
    setShowForm(true);
  };

  const activeCollection = collections.find((c) => c.id === selectedCollection);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Collections</h1>
          <p className="text-muted text-sm mt-1">{collections.length} collections</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e50914] hover:bg-[#b20710] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Collection
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-surface border border-[#e50914]/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {editingCollection ? 'Edit Collection' : 'New Collection'}
            </h2>
            <button onClick={resetForm} className="p-1 text-muted hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="Collection name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Poster URL</label>
              <input
                type="url"
                value={formPoster}
                onChange={(e) => setFormPoster(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="https://..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-white mb-1.5">Description</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors resize-none"
                placeholder="Description"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-muted hover:text-white bg-surface-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formName.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#e50914] rounded-lg hover:bg-[#b20710] disabled:opacity-50 transition-colors"
            >
              {editingCollection ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections list */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">All Collections</h2>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-full h-16 skeleton rounded-lg" />
            ))
          ) : collections.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted text-sm">
              No collections yet
            </div>
          ) : (
            collections.map((col) => (
              <div
                key={col.id}
                className={cn(
                  'bg-surface border rounded-xl p-4 cursor-pointer transition-colors',
                  selectedCollection === col.id ? 'border-[#e50914]' : 'border-border hover:border-border/80'
                )}
                onClick={() => setSelectedCollection(col.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{col.name}</p>
                    <p className="text-xs text-muted mt-0.5">{col.items?.length || 0} items</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(col);
                      }}
                      className="p-1.5 text-muted hover:text-blue-400 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(col.id);
                      }}
                      className="p-1.5 text-muted hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Collection detail */}
        <div className="lg:col-span-2">
          {activeCollection ? (
            <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{activeCollection.name}</h2>
                {activeCollection.description && (
                  <p className="text-sm text-muted mt-1">{activeCollection.description}</p>
                )}
              </div>

              {/* Add content */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={contentSearch}
                  onChange={(e) => handleSearchContent(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                  placeholder="Search content to add..."
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-surface border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addContentToCollection(activeCollection.id, item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
                      >
                        <div className="w-8 h-11 rounded bg-border overflow-hidden shrink-0">
                          {item.poster ? (
                            <img src={item.poster} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted">
                              <Film className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-white">{item.title}</p>
                          <p className="text-xs text-muted">{item.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items list */}
              {activeCollection.items && activeCollection.items.length > 0 ? (
                <div className="space-y-2">
                  {activeCollection.items
                    .sort((a, b) => a.order - b.order)
                    .map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 bg-background rounded-lg border border-border"
                      >
                        <GripVertical className="w-4 h-4 text-muted/50 cursor-grab shrink-0" />
                        <span className="text-xs text-muted w-5 text-center shrink-0">{idx + 1}</span>
                        <div className="w-8 h-11 rounded bg-border overflow-hidden shrink-0">
                          {item.content?.poster ? (
                            <img src={item.content.poster} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted">
                              <Film className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.content?.title || 'Unknown'}</p>
                          <p className="text-xs text-muted">{item.content?.type || ''}</p>
                        </div>
                        <button
                          onClick={() => removeContentFromCollection(activeCollection.id, item.id)}
                          className="p-1.5 text-muted hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted text-sm">
                  No items in this collection. Search above to add content.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-12 text-center text-muted">
              Select a collection to view and manage its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
