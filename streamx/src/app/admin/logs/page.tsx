'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Clock, Search, Filter } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface LogEntry {
  id: string;
  type: string;
  message: string;
  user?: string;
  metadata?: string;
  timestamp: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      params.set('limit', '50');

      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLogs(json.data || []);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  const logTypes = [
    { label: 'All Types', value: '' },
    { label: 'Auth', value: 'auth' },
    { label: 'Content', value: 'content' },
    { label: 'User', value: 'user' },
    { label: 'System', value: 'system' },
    { label: 'Error', value: 'error' },
  ];

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      auth: 'bg-blue-500/10 text-blue-400',
      content: 'bg-purple-500/10 text-purple-400',
      user: 'bg-green-500/10 text-green-400',
      system: 'bg-yellow-500/10 text-yellow-400',
      error: 'bg-red-500/10 text-red-400',
    };
    return styles[type] || 'bg-white/5 text-muted';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
          <p className="text-muted text-sm mt-1">Monitor system and user activity</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-background text-[#e50914] focus:ring-[#e50914] focus:ring-offset-0"
            />
            <span className="text-sm text-muted">Auto-refresh</span>
          </label>
          <button
            onClick={() => fetchLogs()}
            className="p-2 text-muted hover:text-white rounded-lg hover:bg-surface-hover transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors appearance-none"
        >
          {logTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Log table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Message</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><div className="w-32 h-4 skeleton" /></td>
                    <td className="px-5 py-3"><div className="w-16 h-4 skeleton" /></td>
                    <td className="px-5 py-3"><div className="w-64 h-4 skeleton" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><div className="w-24 h-4 skeleton" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-muted">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let ip = '—';
                  try {
                    if (log.metadata) {
                      const meta = JSON.parse(log.metadata);
                      ip = meta.ip || '—';
                    }
                  } catch {}
                  return (
                    <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            'inline-flex px-2 py-1 rounded-md text-xs font-medium capitalize',
                            getTypeBadge(log.type)
                          )}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-white truncate max-w-[300px]">{log.message}</p>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted font-mono">{ip}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
