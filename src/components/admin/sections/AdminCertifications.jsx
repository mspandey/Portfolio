import React, { useEffect, useState, useRef } from 'react';
import {
  fetchAdminCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  uploadMediaFile,
} from '../../../api/client';

function CertForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    organization: '',
    issue_date: '',
    expiry_date: '',
    credential_id: '',
    credential_url: '',
    certificate_file: '',
    logo: '',
    is_visible: true,
    ...(item || {}),
  });

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pdfFileRef = useRef(null);
  const logoFileRef = useRef(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid PDF document.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Certificate PDF must be under 20 MB.');
      return;
    }

    setUploadingPdf(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('alt_text', `${form.name || 'Certificate'} PDF`);
      const res = await uploadMediaFile(formData);
      const url = res.storage_url || res.url;
      setForm((p) => ({ ...p, certificate_file: url }));
    } catch (err) {
      setError(`Certificate PDF upload failed: ${err.message}`);
    } finally {
      setUploadingPdf(false);
      if (pdfFileRef.current) pdfFileRef.current.value = '';
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|svg)$/i)) {
      setError('Please select a valid image file (PNG, JPG, WEBP, or SVG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Logo image must be under 10 MB.');
      return;
    }

    setUploadingLogo(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('alt_text', `${form.organization || 'Organization'} Logo`);
      const res = await uploadMediaFile(formData);
      const url = res.storage_url || res.url;
      setForm((p) => ({ ...p, logo: url }));
    } catch (err) {
      setError(`Logo upload failed: ${err.message}`);
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.organization) {
      setError('Certification name and organization are required.');
      return;
    }

    // Format URL if provided
    let credUrl = (form.credential_url || '').trim();
    if (credUrl && !credUrl.match(/^https?:\/\//i)) {
      credUrl = `https://${credUrl}`;
    }

    const payload = {
      ...form,
      credential_url: credUrl,
    };

    setSaving(true);
    setError('');
    try {
      await onSave(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <div className="form-group form-group--full">
          <label className="form-label">Certification Name *</label>
          <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Deep Learning Specialization" required />
        </div>

        <div className="form-group">
          <label className="form-label">Issuing Organization *</label>
          <input className="form-input" value={form.organization} onChange={(e) => set('organization', e.target.value)} placeholder="e.g. Coursera / DeepLearning.AI" required />
        </div>

        <div className="form-group">
          <label className="form-label">Credential ID (optional)</label>
          <input className="form-input" value={form.credential_id} onChange={(e) => set('credential_id', e.target.value)} placeholder="e.g. ABC123XYZ" />
        </div>

        <div className="form-group">
          <label className="form-label">Issue Date</label>
          <input className="form-input" type="month" value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Expiry Date (optional)</label>
          <input className="form-input" type="month" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
        </div>

        {/* Certificate URL */}
        <div className="form-group form-group--full">
          <label className="form-label">Certificate / Verification URL (Option A)</label>
          <input
            className="form-input"
            type="url"
            value={form.credential_url || ''}
            onChange={(e) => set('credential_url', e.target.value)}
            placeholder="https://coursera.org/verify/..."
          />
        </div>

        {/* Certificate PDF Upload */}
        <div className="form-group form-group--full">
          <label className="form-label">Upload Certificate PDF (Option B)</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              ref={pdfFileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => pdfFileRef.current?.click()}
              disabled={uploadingPdf}
            >
              {uploadingPdf ? 'Uploading PDF…' : '📄 Choose Certificate PDF'}
            </button>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {form.certificate_file ? 'PDF attached' : 'No PDF attached'}
            </span>
          </div>

          {form.certificate_file && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', flex: 1, wordBreak: 'break-all' }}>
                📄 {form.certificate_file}
              </span>
              <a
                href={form.certificate_file}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn--sm"
              >
                Preview ↗
              </a>
              <button
                type="button"
                className="admin-btn admin-btn--sm admin-btn--danger"
                onClick={() => set('certificate_file', '')}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Dual Organization Logo */}
        <div className="form-group form-group--full">
          <label className="form-label">Organization Logo</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
            <input
              className="form-input"
              value={form.logo || ''}
              onChange={(e) => set('logo', e.target.value)}
              placeholder="Paste Logo URL or upload below"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => logoFileRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? 'Uploading…' : '📁 Upload Logo'}
              </button>
            </div>
          </div>

          {form.logo && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '6px' }}>
              <img
                src={form.logo}
                alt="Logo Preview"
                style={{ width: '36px', height: '36px', objectFit: 'contain', background: '#fff', borderRadius: '4px', padding: '2px' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span style={{ fontSize: '13px', flex: 1, wordBreak: 'break-all' }}>{form.logo}</span>
              <button
                type="button"
                className="admin-btn admin-btn--sm admin-btn--danger"
                onClick={() => set('logo', '')}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={Boolean(form.is_visible)}
              onChange={(e) => set('is_visible', e.target.checked)}
            />{' '}
            Visible on Public Portfolio
          </label>
        </div>
      </div>

      {error && <p className="form-status form-status--error">{error}</p>}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Certification'}
        </button>
      </div>
    </form>
  );
}

export default function AdminCertifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    fetchAdminCertifications()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setMessage(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (isAdding) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Add Certification</h2>
        </div>
        <CertForm
          onSave={async (d) => {
            await createCertification(d);
            setIsAdding(false);
            load();
            setMessage('✓ Certification created.');
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
          <h2 className="admin-panel-title">Edit Certification</h2>
        </div>
        <CertForm
          item={editing}
          onSave={async (d) => {
            await updateCertification(editing.id, d);
            setEditing(null);
            load();
            setMessage('✓ Certification updated.');
          }}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">Certifications</h2>
          <p className="admin-panel-subtitle">Manage licenses, credentials, certificates, and verification links.</p>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={() => setIsAdding(true)}>
          + Add Certification
        </button>
      </div>

      {message && (
        <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}

      {loading ? (
        <div className="admin-loading">Loading certifications…</div>
      ) : (
        <div className="admin-list">
          {items.length === 0 && <div className="admin-empty">No certifications yet. Click "+ Add Certification" above.</div>}
          {items.map((item) => {
            const certDoc = item.certificate_file || item.credential_url;
            return (
              <div key={item.id} className={`admin-list-item ${!item.is_visible ? 'admin-list-item--hidden' : ''}`}>
                <div className="admin-list-item-info">
                  <div className="admin-list-item-title">
                    {item.name}
                    {!item.is_visible && <span className="admin-badge admin-badge--gray" style={{ marginLeft: '8px' }}>HIDDEN</span>}
                    {item.certificate_file && <span className="admin-badge admin-badge--green" style={{ marginLeft: '8px' }}>PDF ATTACHED</span>}
                  </div>
                  <div className="admin-list-item-meta">
                    {item.organization}
                    {item.issue_date && ` · Issued: ${item.issue_date}`}
                    {item.expiry_date && ` · Expires: ${item.expiry_date}`}
                    {item.credential_id && ` · ID: ${item.credential_id}`}
                  </div>
                </div>
                <div className="admin-list-item-actions">
                  {certDoc && (
                    <a href={certDoc} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--sm">
                      {item.certificate_file ? 'View PDF' : 'Verify'} ↗
                    </a>
                  )}
                  <button className="admin-btn admin-btn--sm admin-btn--secondary" onClick={() => setEditing(item)}>
                    Edit
                  </button>
                  <button
                    className="admin-btn admin-btn--sm admin-btn--danger"
                    onClick={async () => {
                      if (window.confirm(`Delete "${item.name}" certification permanently?`)) {
                        await deleteCertification(item.id);
                        load();
                        setMessage('✓ Certification deleted.');
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
