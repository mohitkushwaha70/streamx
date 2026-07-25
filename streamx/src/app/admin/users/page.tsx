'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Trash2, Shield, Ban, CheckCircle, Users as UsersIcon, RefreshCw, Clock } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PREMIUM';
  createdAt: string;
  lastActiveAt?: string;
  banned?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '15');
      params.set('page', String(page));
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (planFilter) params.set('plan', planFilter);

      const res = await fetch(`/api/users?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setUsers(json.data.items || []);
          setTotal(json.data.total || 0);
          setPages(json.data.pages || 1);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, planFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchUsers, 8000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, planFilter]);

  const togglePlan = async (userId: string, currentPlan: string) => {
    const newPlan = currentPlan === 'PREMIUM' ? 'FREE' : 'PREMIUM';
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, plan: newPlan as 'FREE' | 'PREMIUM' } : u))
        );
      }
    } catch {
      // silent
    }
  };

  const toggleBan = async (userId: string, currentlyBanned: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: !currentlyBanned }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, banned: !currentlyBanned } : u))
        );
      }
    } catch {
      // silent
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotal((t) => t - 1);
        setDeleteConfirm(null);
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-muted text-sm mt-1">{total} registered users</p>
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
            onClick={() => fetchUsers()}
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
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors appearance-none"
        >
          <option value="">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors appearance-none"
        >
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Plan</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Joined</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Last Active</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="w-40 h-4 skeleton" /></td>
                    <td className="px-5 py-4 hidden md:table-cell"><div className="w-12 h-4 skeleton" /></td>
                    <td className="px-5 py-4 hidden sm:table-cell"><div className="w-16 h-4 skeleton" /></td>
                    <td className="px-5 py-4 hidden lg:table-cell"><div className="w-20 h-4 skeleton" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-4 skeleton ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#e50914] flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {user.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                          user.role === 'ADMIN'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-white/5 text-white/60'
                        )}
                      >
                        {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span
                        className={cn(
                          'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                          user.plan === 'PREMIUM'
                            ? 'bg-[#e50914]/10 text-[#e50914]'
                            : 'bg-white/5 text-muted'
                        )}
                      >
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-muted">{formatDate(user.createdAt)}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-muted flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {user.lastActiveAt ? formatDate(user.lastActiveAt) : 'Never'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => togglePlan(user.id, user.plan)}
                          className={cn(
                            'p-2 rounded-lg transition-colors text-xs',
                            user.plan === 'PREMIUM'
                              ? 'text-yellow-400 hover:bg-yellow-500/10'
                              : 'text-muted hover:bg-white/5 hover:text-white'
                          )}
                          title={user.plan === 'PREMIUM' ? 'Downgrade to Free' : 'Upgrade to Premium'}
                        >
                          {user.plan === 'PREMIUM' ? '★' : '☆'}
                        </button>
                        <button
                          onClick={() => toggleBan(user.id, !!user.banned)}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            user.banned
                              ? 'text-green-400 hover:bg-green-500/10'
                              : 'text-muted hover:bg-white/5 hover:text-orange-400'
                          )}
                          title={user.banned ? 'Unban' : 'Ban'}
                        >
                          {user.banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        {deleteConfirm === user.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteUser(user.id)}
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
                            onClick={() => setDeleteConfirm(user.id)}
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
