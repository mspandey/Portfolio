import React, { useEffect, useState, useRef } from 'react';
import { fetchAboutSettings, updateAboutSettings, uploadMediaFile } from '../../../api/client';

export default function AdminAbout() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [imageFileName, setImageFileName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAboutSettings()
      .then((data) => {
        let stats = data.stats_json;
        if (typeof stats === 'string') {
          try { stats = JSON.parse(stats); } catch { stats = []; }
        }
        setSettings({ ...data, stats_json: stats || [] });
      })
      .catch(() => setMessage('Error: Failed to load about settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleStatChange = (i, field, value) => {
    const updated = [...(settings.stats_json || [])];
    updated[i] = { ...updated[i], [field]: value };
    setSettings((prev) => ({ ...prev, stats_json: updated }));
  };

  const addStat = () => {
    setSettings((prev) => ({ ...prev, stats_json: [...(prev.stats_json || []), { label: '', value: '' }] }));
  };

  const removeStat = (i) => {
    const updated = [...(settings.stats_json || [])];
    updated.splice(i, 1);
    setSettings((prev) => ({ ...prev, stats_json: updated }));
  };

  // Local Image Upload to Supabase Storage
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|gif|svg)$/i)) {
      setMessage('Error: Please select a valid image file (JPG, PNG, WebP, GIF, or SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage('Error: Image file size must be under 10 MB.');
      return;
    }

    setUploadingImage(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('alt_text', 'About Profile Image');

      const res = await uploadMediaFile(formData);
      const url = res.storage_url || res.url;
      if (!url) throw new Error('Upload completed but no storage URL was returned.');

      setImageFileName(file.name);
      setSettings((prev) => ({ ...prev, profile_image: url }));
      setMessage('✓ Profile image uploaded to Supabase Storage.');
    } catch (err) {
      console.error('Image upload failed:', err);
      setMessage(`Error: Profile image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageFileName('');
    setSettings((prev) => ({ ...prev, profile_image: '' }));
    setMessage('Profile image removed. Click Save to persist changes.');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...settings,
        stats_json: JSON.stringify(settings.stats_json || []),
      };
      const updated = await updateAboutSettings(payload);
      let stats = updated.stats_json;
      if (typeof stats === 'string') {
        try { stats = JSON.parse(stats); } catch { stats = []; }
      }
      setSettings({ ...updated, stats_json: stats || [] });
      setMessage('✓ About settings saved successfully.');
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
        <h2 className="admin-panel-title">About</h2>
        <p className="admin-panel-subtitle">Edit your About section content and profile picture.</p>
      </div>

      <div className="admin-form-grid">
        <div className="form-group">
          <label className="form-label">Section Heading</label>
          <input
            className="form-input"
            value={settings?.heading || ''}
            onChange={(e) => handleChange('heading', e.target.value)}
          />
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Introduction</label>
          <textarea
            className="form-input form-textarea"
            rows={2}
            value={settings?.introduction || ''}
            onChange={(e) => handleChange('introduction', e.target.value)}
          />
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Biography</label>
          <textarea
            className="form-input form-textarea"
            rows={4}
            value={settings?.biography || ''}
            onChange={(e) => handleChange('biography', e.target.value)}
          />
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Professional Summary</label>
          <textarea
            className="form-input form-textarea"
            rows={3}
            value={settings?.professional_summary || ''}
            onChange={(e) => handleChange('professional_summary', e.target.value)}
          />
        </div>

        {/* PRIMARY PROFILE IMAGE LOCAL FILE UPLOADER */}
        <div className="form-group form-group--full">
          <label className="form-label">Profile Image (Local File Upload)</label>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage ? 'Uploading Image…' : '📁 Choose Image File'}
            </button>
            <span style={{ fontSize: '13px', color: '#888' }}>
              {imageFileName ? imageFileName : (settings?.profile_image ? 'Image attached' : 'No file chosen')}
            </span>
          </div>

          {/* Profile Image Preview */}
          {settings?.profile_image && (
            <div style={{
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(255,255,255,0.03)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              maxWidth: '480px'
            }}>
              <img
                src={settings.profile_image}
                alt="Profile Preview"
                style={{
                  width: '72px',
                  height: '72px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: '#111'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#aaa', wordBreak: 'break-all', maxHeight: '36px', overflow: 'hidden' }}>
                  {settings.profile_image}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm admin-btn--secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    Replace Image
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm admin-btn--danger"
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Optional Advanced URL Fallback */}
          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setShowUrlFallback((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '12px',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              {showUrlFallback ? '▲ Hide URL field' : '▼ Use image URL instead (Advanced)'}
            </button>
            {showUrlFallback && (
              <div style={{ marginTop: '8px' }}>
                <input
                  className="form-input"
                  value={settings?.profile_image || ''}
                  onChange={(e) => handleChange('profile_image', e.target.value)}
                  placeholder="https://... or /character.png"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-subheader">
        <h3 className="admin-subheading">Stats</h3>
        <button className="admin-btn admin-btn--sm" onClick={addStat}>+ Add Stat</button>
      </div>
      {(settings?.stats_json || []).map((stat, i) => (
        <div key={i} className="admin-list-row">
          <input className="form-input" placeholder="Label" value={stat.label} onChange={(e) => handleStatChange(i, 'label', e.target.value)} />
          <input className="form-input" placeholder="Value" value={stat.value} onChange={(e) => handleStatChange(i, 'value', e.target.value)} />
          <button className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => removeStat(i)}>✕</button>
        </div>
      ))}

      {message && (
        <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}
      <div className="admin-actions">
        <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving || uploadingImage}>
          {saving ? 'Saving…' : 'Save About Settings'}
        </button>
      </div>
    </div>
  );
}
