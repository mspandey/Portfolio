import React, { useEffect, useState, useRef } from 'react';
import {
  fetchAdminExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
  uploadMediaFile,
} from '../../../api/client';

const EMPTY = {
  company: '',
  role: '',
  location: '',
  start_date: '',
  end_date: '',
  is_current: false,
  description: '',
  responsibilities: [],
  technologies: [],
  logo: '',
  company_url: '',
  report_url: '',
  report_path: '',
  is_visible: true,
};

function ExperienceForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...(item || {}) });
  const [respInput, setRespInput] = useState('');
  const [techInput, setTechInput] = useState('');
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const reportFileRef = useRef(null);
  const logoFileRef = useRef(null);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addItem = (key, value, setInput) => {
    const v = value.trim();
    if (v) setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), v] }));
    setInput('');
  };

  const removeItem = (key, index) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
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
      formData.append('alt_text', `${form.company || 'Company'} Logo`);
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

  const handleReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid PDF document for the report.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Report file must be under 20 MB.');
      return;
    }

    setUploadingReport(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('alt_text', `${form.company || 'Experience'} Internship Report PDF`);
      const res = await uploadMediaFile(formData);
      const url = res.storage_url || res.url;
      setForm((p) => ({ ...p, report_url: url, report_path: url }));
    } catch (err) {
      setError(`Report upload failed: ${err.message}`);
    } finally {
      setUploadingReport(false);
      if (reportFileRef.current) reportFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company || !form.role) {
      setError('Company and role are required.');
      return;
    }

    // Format company URL if provided
    let cUrl = (form.company_url || '').trim();
    if (cUrl && !cUrl.match(/^https?:\/\//i)) {
      cUrl = `https://${cUrl}`;
    }

    const payload = {
      ...form,
      company_url: cUrl,
      report_url: form.report_url || form.report_path || '',
      report_path: form.report_url || form.report_path || '',
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
        <div className="form-group">
          <label className="form-label">Company Name *</label>
          <input className="form-input" value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="e.g. Reliance Industries Limited" required />
        </div>

        <div className="form-group">
          <label className="form-label">Role *</label>
          <input className="form-input" value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Vocational Trainee" required />
        </div>

        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Jamnagar, India" />
        </div>

        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-input" placeholder="e.g. June 3, 2025 or 2025-06" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">
            <input type="checkbox" className="form-checkbox" checked={Boolean(form.is_current)} onChange={(e) => set('is_current', e.target.checked)} />
            {' '}Currently Working Here
          </label>
        </div>

        {!form.is_current && (
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="form-input" placeholder="e.g. July 16, 2025 or 2025-07" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </div>
        )}

        <div className="form-group form-group--full">
          <label className="form-label">Description</label>
          <textarea className="form-input form-textarea" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Summary of your role and accomplishments..." />
        </div>

        <div className="form-group">
          <label className="form-label">Company Website URL</label>
          <input className="form-input" type="url" value={form.company_url} onChange={(e) => set('company_url', e.target.value)} placeholder="https://www.ril.com" />
        </div>

        {/* Dual Company Logo: URL + Upload */}
        <div className="form-group form-group--full">
          <label className="form-label">Company Logo</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
            <input
              className="form-input"
              value={form.logo || ''}
              onChange={(e) => set('logo', e.target.value)}
              placeholder="Paste Logo URL (e.g. /portfolio-media/experience/ril-logo.png or https://...)"
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
                className="admin-btn admin-btn--sm admin-btn--secondary"
                onClick={() => logoFileRef.current?.click()}
              >
                Replace
              </button>
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

        {/* Internship / Experience Report PDF Upload */}
        <div className="form-group form-group--full">
          <label className="form-label">Upload Internship / Experience Report (PDF)</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              ref={reportFileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleReportUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => reportFileRef.current?.click()}
              disabled={uploadingReport}
            >
              {uploadingReport ? 'Uploading Report…' : '📄 Choose PDF File'}
            </button>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {(form.report_url || form.report_path) ? 'Report attached' : 'No PDF attached'}
            </span>
          </div>

          {(form.report_url || form.report_path) && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>
                📄 {form.report_url || form.report_path}
              </span>
              <a
                href={form.report_url || form.report_path}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn--sm"
              >
                Preview ↗
              </a>
              <button
                type="button"
                className="admin-btn admin-btn--sm admin-btn--danger"
                onClick={() => {
                  set('report_url', '');
                  set('report_path', '');
                }}
              >
                Remove Report
              </button>
            </div>
          )}
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Key Responsibilities & Deliverables</label>
          <div className="tech-input-row">
            <input className="form-input" value={respInput} onChange={(e) => setRespInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem('responsibilities', respInput, setRespInput); } }} placeholder="Add responsibility and press Enter" />
            <button type="button" className="admin-btn admin-btn--sm" onClick={() => addItem('responsibilities', respInput, setRespInput)}>Add</button>
          </div>
          {(form.responsibilities || []).map((r, i) => (
            <div key={i} className="admin-list-row">
              <span className="admin-list-row-text">{r}</span>
              <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => removeItem('responsibilities', i)}>✕</button>
            </div>
          ))}
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Technologies Used</label>
          <div className="tech-input-row">
            <input className="form-input" value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem('technologies', techInput, setTechInput); } }} placeholder="Add technology and press Enter" />
            <button type="button" className="admin-btn admin-btn--sm" onClick={() => addItem('technologies', techInput, setTechInput)}>Add</button>
          </div>
          <div className="tech-tags" style={{ marginTop: 8 }}>
            {(form.technologies || []).map((t) => (
              <span key={t} className="tech-tag tech-tag--removable">
                {t}
                <button type="button" className="tech-tag-remove" onClick={() => setForm((prev) => ({ ...prev, technologies: prev.technologies.filter((x) => x !== t) }))}>✕</button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <input type="checkbox" className="form-checkbox" checked={Boolean(form.is_visible)} onChange={(e) => set('is_visible', e.target.checked)} />
            {' '}Publish / Visible on Public Portfolio
          </label>
        </div>
      </div>

      {error && <p className="form-status form-status--error">{error}</p>}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save Experience'}</button>
      </div>
    </form>
  );
}

export default function AdminExperience() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => { setLoading(true); fetchAdminExperiences().then((data) => setItems(Array.isArray(data) ? data : [])).finally(() => setLoading(false)); };
  useEffect(load, []);

  if (isAdding) return <div className="admin-panel"><div className="admin-panel-header"><h2 className="admin-panel-title">Add Experience</h2></div><ExperienceForm onSave={async (d) => { await createExperience(d); setIsAdding(false); load(); setMessage('✓ Created.'); }} onCancel={() => setIsAdding(false)} /></div>;
  if (editing) return <div className="admin-panel"><div className="admin-panel-header"><h2 className="admin-panel-title">Edit Experience</h2></div><ExperienceForm item={editing} onSave={async (d) => { await updateExperience(editing.id, d); setEditing(null); load(); setMessage('✓ Updated.'); }} onCancel={() => setEditing(null)} /></div>;

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">Experience CMS</h2>
          <p className="admin-panel-subtitle">Manage work history, company links, and internship reports.</p>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={() => setIsAdding(true)}>+ Add Experience</button>
      </div>
      {message && <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>{message}</p>}
      {loading ? <div className="admin-loading">Loading experiences…</div> : (
        <div className="admin-list">
          {items.length === 0 && <div className="admin-empty">No experiences yet. Click "+ Add Experience" above.</div>}
          {items.map((item) => (
            <div key={item.id} className={`admin-list-item ${!item.is_visible ? 'admin-list-item--hidden' : ''}`}>
              <div className="admin-list-item-info">
                <div className="admin-list-item-title">
                  {item.role} at {item.company}
                  {!item.is_visible && <span className="admin-badge admin-badge--gray" style={{ marginLeft: '8px' }}>HIDDEN</span>}
                  {(item.report_url || item.report_path) && <span className="admin-badge admin-badge--green" style={{ marginLeft: '8px' }}>REPORT ATTACHED</span>}
                </div>
                <div className="admin-list-item-meta">{item.location} · {item.start_date} — {item.is_current ? 'Present' : item.end_date}</div>
              </div>
              <div className="admin-list-item-actions">
                <button className="admin-btn admin-btn--sm admin-btn--secondary" onClick={() => setEditing(item)}>Edit</button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={async () => { if (window.confirm(`Delete "${item.role} at ${item.company}" entry?`)) { await deleteExperience(item.id); load(); setMessage('✓ Entry deleted.'); } }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
