import React, { useEffect, useState } from 'react';
import { fetchSiteSettings, updateSiteSettings } from '../../../api/client';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSiteSettings()
      .then(setSettings)
      .catch(() => setMessage('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateSiteSettings(settings);
      setSettings(updated);
      setMessage('✓ Settings saved.');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading…</div>;

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Site Settings</h2>
        <p className="admin-panel-subtitle">Global configuration for your portfolio — SEO, contact info, and social links.</p>
      </div>

      <div className="admin-form-grid">
        <div className="form-group form-group--full">
          <label className="form-label">Site Title</label>
          <input className="form-input" value={settings?.site_title || ''} onChange={(e) => set('site_title', e.target.value)} placeholder="Amisha Pandey — Portfolio" />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">Meta Description</label>
          <textarea className="form-input form-textarea" rows={2} value={settings?.meta_description || ''} onChange={(e) => set('meta_description', e.target.value)} placeholder="AI/ML engineer, full-stack developer..." />
        </div>
        <div className="form-group">
          <label className="form-label">Owner Name</label>
          <input className="form-input" value={settings?.owner_name || ''} onChange={(e) => set('owner_name', e.target.value)} placeholder="Amisha Pandey" />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" value={settings?.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="India" />
        </div>

        <div className="admin-divider form-group--full">
          <span>Contact & Social</span>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={settings?.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="amisha@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" type="tel" value={settings?.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">GitHub URL</label>
          <input className="form-input" type="url" value={settings?.github || ''} onChange={(e) => set('github', e.target.value)} placeholder="https://github.com/amishapandey" />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">LinkedIn URL</label>
          <input className="form-input" type="url" value={settings?.linkedin || ''} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/amishapandey" />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">Twitter / X URL</label>
          <input className="form-input" type="url" value={settings?.twitter || ''} onChange={(e) => set('twitter', e.target.value)} placeholder="https://twitter.com/..." />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">Availability Message</label>
          <input className="form-input" value={settings?.availability || ''} onChange={(e) => set('availability', e.target.value)} placeholder="Open to new opportunities" />
        </div>
        <div className="form-group">
          <label className="form-label">Favicon URL</label>
          <input className="form-input" value={settings?.favicon || ''} onChange={(e) => set('favicon', e.target.value)} placeholder="/favicon.ico" />
        </div>
        <div className="form-group">
          <label className="form-label">OG Image URL</label>
          <input className="form-input" value={settings?.og_image || ''} onChange={(e) => set('og_image', e.target.value)} placeholder="/og-image.png" />
        </div>
      </div>

      {message && (
        <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}
      <div className="admin-actions">
        <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
