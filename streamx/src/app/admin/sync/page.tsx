'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { SyncResult } from '@/types';

interface SyncHistory {
  id: string;
  status: string;
  filesFound: number;
  newFiles: number;
  errors: number;
  duration: number;
  message: string;
  createdAt: string;
}

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/admin/sync?history=true');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setHistory(json.data || []);
          }
        }
      } catch {
        // silent
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, []);

  const runSync = async () => {
    setSyncing(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setResult(json.data);
        // Refresh history
        const histRes = await fetch('/api/admin/sync?history=true');
        if (histRes.ok) {
          const histJson = await histRes.json();
          if (histJson.success) setHistory(histJson.data || []);
        }
      } else {
        setError(json.error || 'Sync failed');
      }
    } catch {
      setError('Failed to run sync. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">HuggingFace Sync</h1>
        <p className="text-muted text-sm mt-1">Sync media files from HuggingFace repository</p>
      </div>

      {/* Sync controls */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Manual Sync</h2>
            <p className="text-sm text-muted mt-1">
              Scan the HuggingFace repository for new media files and add them to your library.
            </p>
          </div>
          <button
            onClick={runSync}
            disabled={syncing}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors',
              syncing
                ? 'bg-surface-hover text-muted cursor-not-allowed'
                : 'bg-[#e50914] hover:bg-[#b20710] text-white'
            )}
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Run Sync
              </>
            )}
          </button>
        </div>

        {/* Sync Result */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-background border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-white">Sync Complete</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-muted mb-1">Files Found</p>
                <p className="text-2xl font-bold text-white">{result.filesFound}</p>
              </div>
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-muted mb-1">New Files</p>
                <p className="text-2xl font-bold text-green-400">{result.newFiles}</p>
              </div>
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-muted mb-1">Errors</p>
                <p className={cn('text-2xl font-bold', result.errors > 0 ? 'text-red-400' : 'text-white')}>
                  {result.errors}
                </p>
              </div>
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-muted mb-1">Duration</p>
                <p className="text-2xl font-bold text-white">{(result.duration / 1000).toFixed(1)}s</p>
              </div>
            </div>

            {result.message && (
              <p className="text-sm text-muted">{result.message}</p>
            )}
          </div>
        )}

        {/* Auto-sync info */}
        <div className="flex items-center gap-3 p-4 bg-surface rounded-lg border border-border">
          <Clock className="w-5 h-5 text-muted shrink-0" />
          <div>
            <p className="text-sm text-white font-medium">Auto-Sync</p>
            <p className="text-xs text-muted mt-0.5">
              Auto-sync runs every 6 hours via the configured cron schedule. Files are automatically detected and indexed.
            </p>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-white">Sync History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Found</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">New</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Errors</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Duration</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingHistory ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><div className="w-24 h-4 skeleton" /></td>
                    <td className="px-5 py-3"><div className="w-16 h-4 skeleton" /></td>
                    <td className="px-5 py-3 hidden sm:table-cell"><div className="w-10 h-4 skeleton" /></td>
                    <td className="px-5 py-3 hidden sm:table-cell"><div className="w-10 h-4 skeleton" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><div className="w-10 h-4 skeleton" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><div className="w-16 h-4 skeleton" /></td>
                    <td className="px-5 py-3"><div className="w-32 h-4 skeleton" /></td>
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-muted">
                    No sync history yet
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {formatDate(entry.createdAt)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                          entry.status === 'success'
                            ? 'bg-green-500/10 text-green-400'
                            : entry.status === 'partial'
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-red-500/10 text-red-400'
                        )}
                      >
                        {entry.status === 'success' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-sm text-white">{entry.filesFound}</span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-sm text-green-400">{entry.newFiles}</span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className={cn('text-sm', entry.errors > 0 ? 'text-red-400' : 'text-muted')}>
                        {entry.errors}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted">{(entry.duration / 1000).toFixed(1)}s</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-muted truncate max-w-[200px]">{entry.message}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
