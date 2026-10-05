import React, { useEffect, useState, useRef } from 'react';
import {
  fetchAdminAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  uploadAchievementCertificate,
  deleteAchievementCertificate,
} from '../../../api/client';

function AchievementForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    organization: '',
    year: '',
    description: '',
    rank_result: '',
    participant_count: '',
    certificate_url: '',
    external_url: '',
    image: '',
    is_visible: true,
    ...(item || {}),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [certError, setCertError] = useState('');
  const certFileInputRef = useRef(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleCertFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(ext) && !allowedMimeTypes.includes(file.type)) {
      setCertError('Invalid file type. Only PDF, JPG, PNG, and WEBP files are allowed.');
      return;
    }

    const maxBytes = 25 * 1024 * 1024; // 25MB
    if (file.size > maxBytes) {
      setCertError('Certificate file must be under 25 MB.');
      return;
    }

    setCertError('');
    setUploadingCert(true);
    setUploadStatus(`Uploading ${file.name} to Supabase Storage…`);

    try {
      const formData = new FormData();
      formData.append('certificate', file);
      if (form.certificate_url) {
        formData.append('old_certificate_url', form.certificate_url);
      }
      if (item?.id) {
        formData.append('achievement_id', item.id);
      }

      const res = await uploadAchievementCertificate(formData);
      if (res && res.certificate_url) {
        set('certificate_url', res.certificate_url);
        setUploadStatus('✓ Certificate stored permanently in Supabase Storage.');
      } else {
        throw new Error(res.error || 'Upload failed without returning a certificate URL.');
      }
    } catch (err) {
      console.error('Certificate upload failed:', err);
      setCertError(`Upload failed: ${err.message}`);
      setUploadStatus('');
    } finally {
      setUploadingCert(false);
      if (certFileInputRef.current) certFileInputRef.current.value = '';
    }
  };

  const handleRemoveCertificate = async () => {
    if (!window.confirm('Are you sure you want to remove this certificate? This will remove the certificate from Supabase Storage and unlink it from this achievement.')) {
      return;
    }
    const oldUrl = form.certificate_url;
    set('certificate_url', '');
    setCertError('');
    setUploadStatus('');

    if (item?.id && oldUrl) {
      try {
        await deleteAchievementCertificate(item.id, oldUrl);
        setUploadStatus('✓ Certificate removed from cloud storage and achievement.');
      } catch (err) {
        console.warn('Note deleting certificate from server:', err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) {
      setError('Title is required.');
      return;
    }

    // Format external URL if provided
    let extUrl = (form.external_url || '').trim();
    if (extUrl && !extUrl.match(/^https?:\/\//i)) {
      extUrl = `https://${extUrl}`;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        external_url: extUrl,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const isPdf = (form.certificate_url || '').toLowerCase().includes('.pdf');
  const certDisplayName = (form.certificate_url || '').split('/').pop()?.split('?')[0] || form.certificate_url;

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <div className="form-group form-group--full">
          <label className="form-label">Achievement Title *</label>
          <input className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        
        <div className="form-group">
          <label className="form-label">Organization</label>
          <input className="form-input" value={form.organization} onChange={(e) => set('organization', e.target.value)} />
        </div>
        
        <div className="form-group">
          <label className="form-label">Year</label>
          <input className="form-input" value={form.year} onChange={(e) => set('year', e.target.value)} placeholder="2025" />
        </div>
        
        <div className="form-group">
          <label className="form-label">Rank / Result</label>
          <input className="form-input" value={form.rank_result} onChange={(e) => set('rank_result', e.target.value)} placeholder="1st Place, Gold, Finalist..." />
        </div>
        
        <div className="form-group">
          <label className="form-label">Participant Count</label>
          <input className="form-input" value={form.participant_count} onChange={(e) => set('participant_count', e.target.value)} placeholder="500+ Teams" />
        </div>
        
        <div className="form-group form-group--full">
          <label className="form-label">Description</label>
          <textarea className="form-input form-textarea" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        {/* Certificate Upload Control (Supabase Storage 'certificates' bucket) */}
        <div className="form-group form-group--full">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Certificate (PDF / Image Document)</span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>Supported: PDF, JPG, PNG, WEBP</span>
          </label>

          <input
            ref={certFileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={handleCertFileSelect}
            style={{ display: 'none' }}
          />

          {form.certificate_url ? (
            <div
              className="current-cert-box"
              style={{
                border: '1px solid var(--border-light, rgba(255,255,255,0.15))',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent, #6d4231)' }}>
                  CURRENT CERTIFICATE
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'inherit',
                  }}
                >
                  {isPdf ? '📄 PDF Document' : '🖼️ Image Certificate'}
                </span>
              </div>

              <div style={{ fontSize: '13px', wordBreak: 'break-all', opacity: 0.9 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {certDisplayName}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                <a
                  href={form.certificate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn admin-btn--sm admin-btn--secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  👁️ View
                </a>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--secondary"
                  onClick={() => certFileInputRef.current?.click()}
                  disabled={uploadingCert}
                >
                  🔄 Replace
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--danger"
                  onClick={handleRemoveCertificate}
                  disabled={uploadingCert}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              className="cert-upload-placeholder"
              style={{
                border: '2px dashed var(--border-light, rgba(255,255,255,0.18))',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => certFileInputRef.current?.click()}
                disabled={uploadingCert}
                style={{ margin: '0 auto 8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {uploadingCert ? '⏳ Uploading to Supabase Storage…' : '📁 Choose Certificate'}
              </button>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>
                Supported formats: <strong>PDF, JPG, PNG, WEBP</strong> (Max 25 MB)
              </p>
            </div>
          )}

          {uploadStatus && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#10b981', fontWeight: '500' }}>
              {uploadStatus}
            </p>
          )}
          {certError && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
              {certError}
            </p>
          )}
        </div>

        {/* External / Verification URL (Kept Completely Separate) */}
        <div className="form-group form-group--full">
          <label className="form-label">
            External URL <em>(Optional — LinkedIn post, competition page, verification page)</em>
          </label>
          <input
            className="form-input"
            type="url"
            value={form.external_url}
            onChange={(e) => set('external_url', e.target.value)}
            placeholder="https://www.linkedin.com/posts/... or https://..."
          />
          <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', opacity: 0.65 }}>
            Kept completely separate from the certificate file. Links directly to external platforms such as LinkedIn or competition organizers.
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={Boolean(form.is_visible)}
              onChange={(e) => set('is_visible', e.target.checked)}
            />{' '}
            Visible on Portfolio
          </label>
        </div>
      </div>

      {error && <p className="form-status form-status--error">{error}</p>}
      
      <div className="admin-form-actions">
        <button type="button" className="admin-btn" onClick={onCancel} disabled={saving || uploadingCert}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving || uploadingCert}>
          {saving ? 'Saving…' : 'Save Achievement'}
        </button>
      </div>
    </form>
  );
}

export default function AdminAchievements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    fetchAdminAchievements()
      .then(setItems)
      .finally(() => setLoading(false));
  };
  
  useEffect(load, []);

  if (isAdding) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Add Achievement</h2>
        </div>
        <AchievementForm
          onSave={async (d) => {
            await createAchievement(d);
            setIsAdding(false);
            load();
            setMessage('✓ Achievement created successfully.');
          }}
          onCancel={() => setIsAdding(false)}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Edit Achievement</h2>
        </div>
        <AchievementForm
          item={editing}
          onSave={async (d) => {
            await updateAchievement(editing.id, d);
            setEditing(null);
            load();
            setMessage('✓ Achievement updated successfully.');
          }}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Achievements</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setIsAdding(true)}>+ Add Achievement</button>
      </div>
      
      {message && <p className="form-status form-status--success">{message}</p>}
      
      {loading ? (
        <div className="admin-loading">Loading achievements…</div>
      ) : (
        <div className="admin-list">
          {items.length === 0 && <div className="admin-empty">No achievements found.</div>}
          {items.map((item) => (
            <div key={item.id} className={`admin-list-item ${!item.is_visible ? 'admin-list-item--hidden' : ''}`}>
              <div className="admin-list-item-info">
                <div className="admin-list-item-title">
                  {item.title} {!item.is_visible && <span className="admin-badge admin-badge--muted">Hidden</span>}
                </div>
                <div className="admin-list-item-meta">
                  {item.rank_result && <strong>{item.rank_result} · </strong>}
                  {item.organization} {item.year && `(${item.year})`}
                  {item.certificate_url && (
                    <span style={{ marginLeft: '8px', color: '#10b981', fontSize: '11px', fontWeight: '600' }}>
                      ✓ Certificate Attached
                    </span>
                  )}
                  {item.external_url && (
                    <span style={{ marginLeft: '8px', color: '#3b82f6', fontSize: '11px', fontWeight: '600' }}>
                      🔗 External Link
                    </span>
                  )}
                </div>
              </div>
              <div className="admin-list-item-actions">
                <button className="admin-btn admin-btn--sm admin-btn--secondary" onClick={() => setEditing(item)}>Edit</button>
                <button
                  className="admin-btn admin-btn--sm admin-btn--danger"
                  onClick={async () => {
                    if (window.confirm(`Delete "${item.title}" achievement permanently?`)) {
                      try {
                        await deleteAchievement(item.id);
                        load();
                        setMessage('✓ Achievement deleted.');
                      } catch (err) {
                        setMessage(`Error: ${err.message}`);
                      }
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
