import React, { useEffect, useState } from 'react';
import { fetchAdminSkills, createSkill, updateSkill, deleteSkill } from '../../../api/client';

const CATEGORIES = ['Programming', 'Web Development', 'AI/ML', 'Databases', 'IoT', 'DevOps', 'Tools', 'Other'];

function SkillForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', category: 'Programming', icon: '', proficiency: 90, description: '', is_visible: true, ...(item || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category) { setError('Name and category required.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); } catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <div className="form-group"><label className="form-label">Skill Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></div>
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Icon URL</label><input className="form-input" value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="https://..." /></div>
        <div className="form-group">
          <label className="form-label">Proficiency ({form.proficiency}%)</label>
          <input type="range" min="0" max="100" value={form.proficiency} onChange={(e) => setForm((p) => ({ ...p, proficiency: parseInt(e.target.value, 10) }))} className="form-range" />
        </div>
        <div className="form-group form-group--full"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label"><input type="checkbox" className="form-checkbox" checked={Boolean(form.is_visible)} onChange={(e) => setForm((p) => ({ ...p, is_visible: e.target.checked }))} />{' '}Visible</label></div>
      </div>
      {error && <p className="form-status form-status--error">{error}</p>}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function AdminSkills() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => { setLoading(true); fetchAdminSkills().then(setItems).finally(() => setLoading(false)); };
  useEffect(load, []);

  const categories = [...new Set(items.map((s) => s.category))];

  if (isAdding) return <div className="admin-panel"><div className="admin-panel-header"><h2 className="admin-panel-title">Add Skill</h2></div><SkillForm onSave={async (d) => { await createSkill(d); setIsAdding(false); load(); setMessage('✓ Skill created.'); }} onCancel={() => setIsAdding(false)} /></div>;
  if (editing) return <div className="admin-panel"><div className="admin-panel-header"><h2 className="admin-panel-title">Edit Skill</h2></div><SkillForm item={editing} onSave={async (d) => { await updateSkill(editing.id, d); setEditing(null); load(); setMessage('✓ Skill updated.'); }} onCancel={() => setEditing(null)} /></div>;

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Skills</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setIsAdding(true)}>+ Add Skill</button>
      </div>
      {message && <p className="form-status form-status--success">{message}</p>}
      {loading ? <div className="admin-loading">Loading…</div> : (
        <>
          {items.length === 0 && <div className="admin-empty">No skills yet.</div>}
          {categories.map((cat) => (
            <div key={cat} className="admin-category-block">
              <h3 className="admin-category-title">{cat}</h3>
              <div className="admin-list">
                {items.filter((s) => s.category === cat).map((item) => (
                  <div key={item.id} className={`admin-list-item ${!item.is_visible ? 'admin-list-item--hidden' : ''}`}>
                    <div className="admin-list-item-info">
                      <div className="admin-list-item-title">{item.name} {!item.is_visible && <span className="admin-badge admin-badge--muted">Hidden</span>}</div>
                      <div className="admin-list-item-meta">Proficiency: {item.proficiency}%</div>
                    </div>
                    <div className="admin-list-item-actions">
                      <button className="admin-btn admin-btn--sm admin-btn--secondary" onClick={() => setEditing(item)}>Edit</button>
                      <button
                        className="admin-btn admin-btn--sm admin-btn--danger"
                        onClick={async () => {
                          if (window.confirm(`Delete "${item.name}" skill permanently?`)) {
                            try {
                              await deleteSkill(item.id);
                              load();
                              setMessage('✓ Skill deleted.');
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
            </div>
          ))}
        </>
      )}
    </div>
  );
}
