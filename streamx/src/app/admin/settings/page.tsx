'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle } from 'lucide-react';

interface SiteSettings {
  siteName: string;
  tagline: string;
  logoUrl: string;
  footerText: string;
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SiteSettings>({
    siteName: '',
    tagline: '',
    logoUrl: '',
    footerText: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setForm({
              siteName: json.data.siteName || '',
              tagline: json.data.tagline || '',
              logoUrl: json.data.logoUrl || '',
              footerText: json.data.footerText || '',
            });
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="w-48 h-8 skeleton" />
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="w-24 h-4 skeleton mb-2" />
              <div className="w-full h-10 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Site Settings</h1>
        <p className="text-muted text-sm mt-1">Configure your site appearance and branding</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Site Name</label>
            <input
              type="text"
              value={form.siteName}
              onChange={(e) => setForm((p) => ({ ...p, siteName: e.target.value }))}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
              placeholder="StreamX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
              placeholder="Unlimited movies, TV shows, and more"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Logo URL</label>
            <input
              type="url"
              value={form.logoUrl}
              onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
              placeholder="https://..."
            />
            {form.logoUrl && (
              <div className="mt-3 p-4 bg-background rounded-lg border border-border">
                <p className="text-xs text-muted mb-2">Preview:</p>
                <img src={form.logoUrl} alt="Logo" className="max-h-12 object-contain" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Footer Text</label>
            <textarea
              rows={3}
              value={form.footerText}
              onChange={(e) => setForm((p) => ({ ...p, footerText: e.target.value }))}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors resize-none"
              placeholder="© 2024 StreamX. All rights reserved."
            />
          </div>
        </div>

        {/* Preview */}
        <div className="p-5 bg-background rounded-xl border border-border space-y-3">
          <h3 className="text-sm font-medium text-muted">Preview</h3>
          <div className="space-y-2">
            <p className="text-xl font-bold text-[#e50914]">{form.siteName || 'StreamX'}</p>
            <p className="text-sm text-muted">{form.tagline || 'Your tagline here'}</p>
          </div>
          <div className="pt-3 border-t border-border mt-3">
            <p className="text-xs text-muted">{form.footerText || '© 2024 StreamX'}</p>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              Saved successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#e50914] rounded-lg hover:bg-[#b20710] disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
