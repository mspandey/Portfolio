import React, { useEffect, useState, useRef } from 'react';
import {
  fetchAdminEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  reorderEducation,
  uploadMediaFile,
} from '../../../api/client';

function EducationForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    institution: '',
    degree: '',
    field: '',
    start_date: '',
    end_date: '',
    is_current: false,
    short_description: '',
    description: '',
    achievements: [],
    logo: '',
    logo_url: '',
    url: '',
    institution_url: '',
    display_order: 0,
    is_visible: true,
    ...(item || {}),
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [achInput, setAchInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const logoInputRef = useRef(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

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
      formData.append('alt_text', `${form.institution || 'Institution'} Logo`);
      const res = await uploadMediaFile(formData);
      const url = res.storage_url || res.url;
      setForm((p) => ({ ...p, logo: url, logo_url: url }));
    } catch (err) {
      setError(`Logo upload failed: ${err.message}`);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.institution || !form.degree) {
      setError('Institution name and degree/qualification are required.');
      return;
    }

    // Validate and format URL if provided
    let rawUrl = (form.institution_url || form.url || '').trim();
    if (rawUrl && !rawUrl.match(/^https?:\/\//i)) {
      rawUrl = `https://${rawUrl}`;
    }

    const payload = {
      ...form,
      institution_url: rawUrl,
      url: rawUrl,
      logo_url: form.logo_url || form.logo,
      logo: form.logo_url || form.logo,
      start_date: form.start_date || form.start_year || '',
      start_year: form.start_date || form.start_year || '',
      end_date: form.is_current ? '' : (form.end_date || form.end_year || ''),
      end_year: form.is_current ? '' : (form.end_date || form.end_year || ''),
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
          <label className="form-label">Institution Name *</label>
          <input
            className="form-input"
            value={form.institution}
            onChange={(e) => set('institution', e.target.value)}
            placeholder="e.g. Amity University"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Degree / Qualification *</label>
          <input
            className="form-input"
            value={form.degree}
            onChange={(e) => set('degree', e.target.value)}
            placeholder="e.g. Bachelor of Technology (B.Tech)"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Field / Stream</label>
          <input
            className="form-input"
            value={form.field}
            onChange={(e) => set('field', e.target.value)}
            placeholder="e.g. Computer Science & Artificial Intelligence"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Start Date / Year</label>
          <input
            className="form-input"
            value={form.start_date || form.start_year}
            onChange={(e) => {
              set('start_date', e.target.value);
              set('start_year', e.target.value);
            }}
            placeholder="e.g. 2021 or Sep 2021"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={Boolean(form.is_current)}
              onChange={(e) => set('is_current', e.target.checked)}
            />{' '}
            Currently Studying / Present
          </label>
        </div>

        {!form.is_current && (
          <div className="form-group">
            <label className="form-label">End Date / Year</label>
            <input
              className="form-input"
              value={form.end_date || form.end_year}
              onChange={(e) => {
                set('end_date', e.target.value);
                set('end_year', e.target.value);
              }}
              placeholder="e.g. 2025 or Jun 2025"
            />
          </div>
        )}

        <div className="form-group form-group--full">
          <label className="form-label">Institution Website URL</label>
          <input
            className="form-input"
            type="url"
            value={form.institution_url || form.url}
            onChange={(e) => {
              set('institution_url', e.target.value);
              set('url', e.target.value);
            }}
            placeholder="https://www.amity.edu/"
          />
          <small className="form-help">Link will open institution website in a new tab on public portfolio.</small>
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Upload Institution Logo (Local File)</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? 'Uploading Logo…' : '📁 Choose Image File'}
            </button>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {(form.logo_url || form.logo) ? 'Logo attached' : 'No file chosen'}
            </span>
          </div>

          {(form.logo_url || form.logo) && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={form.logo_url || form.logo}
                alt="Logo preview"
                style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px', background: '#f5f5f5', border: '1px solid #ddd', padding: '4px' }}
              />
              <button
                type="button"
                className="admin-btn admin-btn--sm admin-btn--danger"
                onClick={() => {
                  set('logo', '');
                  set('logo_url', '');
                }}
              >
                Remove Logo
              </button>
            </div>
          )}
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Short Description (Summary)</label>
          <textarea
            className="form-input form-textarea"
            rows={2}
            value={form.short_description}
            onChange={(e) => set('short_description', e.target.value)}
            placeholder="Brief overview shown on collapsed card..."
          />
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Detailed Description (Full Details)</label>
          <textarea
            className="form-input form-textarea"
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Detailed description of courses, thesis, activities, and achievements shown when expanded..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Display Order</label>
          <input
            className="form-input"
            type="number"
            value={form.display_order}
            onChange={(e) => set('display_order', Number(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={Boolean(form.is_visible)}
              onChange={(e) => set('is_visible', e.target.checked)}
            />{' '}
            Publish / Visible on Public Portfolio
          </label>
        </div>
      </div>

      {error && <p className="form-status form-status--error">{error}</p>}

      <div className="admin-form-actions">
        <button type="button" className="admin-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Education'}
        </button>
      </div>
    </form>
  );
}

export default function AdminEducation() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    fetchAdminEducation()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setMessage(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const reorderPayload = newItems.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));

    setItems(newItems);
    try {
      await reorderEducation(reorderPayload);
      setMessage('✓ Display order updated.');
      load();
    } catch (err) {
      setMessage(`Order update failed: ${err.message}`);
      load();
    }
  };

  if (isAdding) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Add Education Entry</h2>
        </div>
        <EducationForm
          onSave={async (d) => {
            await createEducation(d);
            setIsAdding(false);
            load();
            setMessage('✓ Education entry created.');
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
          <h2 className="admin-panel-title">Edit Education Entry</h2>
        </div>
        <EducationForm
          item={editing}
          onSave={async (d) => {
            await updateEducation(editing.id, d);
            setEditing(null);
            load();
            setMessage('✓ Education entry updated.');
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
          <h2 className="admin-panel-title">Education CMS</h2>
          <p className="admin-panel-subtitle">Manage qualifications, institutions, ordering, logos, and links.</p>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={() => setIsAdding(true)}>
          + Add Education
        </button>
      </div>

      {message && (
        <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}

      {loading ? (
        <div className="admin-loading">Loading education records…</div>
      ) : (
        <div className="admin-list">
          {items.length === 0 && <div className="admin-empty">No education entries yet. Click "+ Add Education" above.</div>}
          {items.map((item, index) => {
            const logoSrc = item.logo_url || item.logo;
            const linkUrl = item.institution_url || item.url;

            return (
              <div
                key={item.id}
                className={`admin-list-item ${!item.is_visible ? 'admin-list-item--hidden' : ''}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={item.institution}
                      style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', background: '#f5f5f5', border: '1px solid #ddd', padding: '2px' }}
                    />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      🎓
                    </div>
                  )}
                  <div>
                    <div className="admin-list-item-title" style={{ fontWeight: '600', fontSize: '15px' }}>
                      {item.degree} — {item.institution}
                      {!item.is_visible && <span className="admin-badge admin-badge--gray" style={{ marginLeft: '8px' }}>HIDDEN</span>}
                    </div>
                    <div className="admin-list-item-meta" style={{ fontSize: '12px', color: '#666' }}>
                      {item.field && `${item.field} · `}
                      {item.start_date || item.start_year} – {item.is_current ? 'Present' : (item.end_date || item.end_year)}
                      {linkUrl && ` · 🌐 ${linkUrl}`}
                    </div>
                  </div>
                </div>

                <div className="admin-list-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    disabled={index === 0}
                    onClick={() => handleMove(index, -1)}
                    title="Move UP in timeline"
                  >
                    ▲ Up
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    disabled={index === items.length - 1}
                    onClick={() => handleMove(index, 1)}
                    title="Move DOWN in timeline"
                  >
                    ▼ Down
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm admin-btn--secondary"
                    onClick={() => setEditing(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm admin-btn--danger"
                    onClick={async () => {
                      if (window.confirm(`Delete "${item.institution}" entry?`)) {
                        await deleteEducation(item.id);
                        load();
                        setMessage('✓ Entry deleted.');
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
