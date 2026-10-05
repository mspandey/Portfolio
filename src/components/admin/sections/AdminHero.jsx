import React, { useEffect, useState } from 'react';
import { fetchHeroSettings, updateHeroSettings } from '../../../api/client';

export default function AdminHero() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchHeroSettings()
      .then(setSettings)
      .catch(() => setMessage('Failed to load hero settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateHeroSettings(settings);
      setSettings(updated);
      setMessage('✓ Hero settings saved.');
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
        <h2 className="admin-panel-title">Hero Settings</h2>
        <p className="admin-panel-subtitle">Edit the hero section text and interactions. The visual design is preserved.</p>
      </div>

      <div className="admin-form-grid">
        <div className="form-group">
          <label className="form-label">Greeting</label>
          <input className="form-input" value={settings?.greeting || ''} onChange={(e) => handleChange('greeting', e.target.value)} placeholder="Hi, I'm" />
        </div>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={settings?.name || ''} onChange={(e) => handleChange('name', e.target.value)} placeholder="Amisha Pandey" />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">Tagline</label>
          <input className="form-input" value={settings?.tagline || ''} onChange={(e) => handleChange('tagline', e.target.value)} />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">Description</label>
          <textarea className="form-input form-textarea" rows={3} value={settings?.description || ''} onChange={(e) => handleChange('description', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Resume Button Label</label>
          <input className="form-input" value={settings?.resume_button_label || ''} onChange={(e) => handleChange('resume_button_label', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Let's Talk Button Label</label>
          <input className="form-input" value={settings?.talk_button_label || ''} onChange={(e) => handleChange('talk_button_label', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Let's Talk URL</label>
          <input className="form-input" type="url" value={settings?.talk_button_url || ''} onChange={(e) => handleChange('talk_button_url', e.target.value)} placeholder="#contact" />
        </div>

        <div className="admin-divider form-group--full" />

        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              checked={Boolean(settings?.resume_button_visible)}
              onChange={(e) => handleChange('resume_button_visible', e.target.checked ? 1 : 0)}
              className="form-checkbox"
            />
            {' '}Show Resume Button
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              checked={Boolean(settings?.cursor_interaction)}
              onChange={(e) => handleChange('cursor_interaction', e.target.checked ? 1 : 0)}
              className="form-checkbox"
            />
            {' '}Enable Cursor Gaze Interaction
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              checked={Boolean(settings?.facial_interaction)}
              onChange={(e) => handleChange('facial_interaction', e.target.checked ? 1 : 0)}
              className="form-checkbox"
            />
            {' '}Enable Smile Micro-interaction
          </label>
        </div>
      </div>

      {message && (
        <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}
      <div className="admin-actions">
        <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Hero Settings'}
        </button>
      </div>
    </div>
  );
}
