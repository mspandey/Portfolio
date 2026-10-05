import React, { useEffect, useState } from 'react';
import {
  fetchAdminProjects,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
  reorderProjects,
} from '../../../api/client';

const PREDEFINED_CATEGORIES = [
  'AI/ML',
  'IoT',
  'Web Development',
  'Database',
  'Robotics',
];

function getInitialCategoryState(category) {
  if (!category || category === 'No Category') {
    return { selected: '', custom: '' };
  }
  if (PREDEFINED_CATEGORIES.includes(category)) {
    return { selected: category, custom: '' };
  }
  if (category === 'Databases') {
    return { selected: 'Database', custom: '' };
  }
  if (category === 'Other') {
    return { selected: 'Other', custom: '' };
  }
  return { selected: 'Other', custom: category };
}

const EMPTY_PROJECT = {
  title: '',
  slug: '',
  short_description: '',
  description: '',
  image: '',
  github_url: '',
  demo_url: '',
  achievement: '',
  category: '',
  is_featured: false,
  is_visible: true,
  project_date: '',
  technologies: [],
};

function ProjectForm({ project, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_PROJECT, ...(project || {}) });
  const initialCategory = getInitialCategoryState(project?.category);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory.selected);
  const [customCategory, setCustomCategory] = useState(initialCategory.custom);
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cat = getInitialCategoryState(project?.category);
    setSelectedCategory(cat.selected);
    setCustomCategory(cat.custom);
    setForm({ ...EMPTY_PROJECT, ...(project || {}) });
  }, [project]);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addTech = () => {
    const t = techInput.trim();
    if (t && !form.technologies?.includes(t)) {
      setForm((prev) => ({ ...prev, technologies: [...(prev.technologies || []), t] }));
    }
    setTechInput('');
  };

  const removeTech = (t) => {
    setForm((prev) => ({ ...prev, technologies: (prev.technologies || []).filter((x) => x !== t) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { setError('Title is required.'); return; }

    let finalCategory = '';
    if (selectedCategory === 'Other') {
      const trimmedCustom = customCategory.trim();
      if (!trimmedCustom) {
        setError('Please enter a custom category.');
        return;
      }
      finalCategory = trimmedCustom;
    } else {
      finalCategory = selectedCategory.trim();
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        category: finalCategory,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title} onChange={(e) => handleChange('title', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="form-input"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              if (error) setError('');
            }}
          >
            <option value="">No Category</option>
            <option value="AI/ML">AI/ML</option>
            <option value="IoT">IoT</option>
            <option value="Web Development">Web Development</option>
            <option value="Database">Database</option>
            <option value="Robotics">Robotics</option>
            <option value="Other">Other</option>
          </select>
          {selectedCategory === 'Other' && (
            <div style={{ marginTop: '12px' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                Custom Category
              </label>
              <input
                className="form-input"
                type="text"
                value={customCategory}
                onChange={(e) => {
                  setCustomCategory(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter category name..."
              />
            </div>
          )}
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">Short Description</label>
          <input className="form-input" value={form.short_description} onChange={(e) => handleChange('short_description', e.target.value)} />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">Full Description</label>
          <textarea className="form-input form-textarea" rows={4} value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Image URL</label>
          <input className="form-input" value={form.image} onChange={(e) => handleChange('image', e.target.value)} placeholder="https:// or /uploads/media/..." />
        </div>
        <div className="form-group">
          <label className="form-label">Year</label>
          <input className="form-input" value={form.project_date} onChange={(e) => handleChange('project_date', e.target.value)} placeholder="2026" />
        </div>
        <div className="form-group">
          <label className="form-label">GitHub URL</label>
          <input className="form-input" type="url" value={form.github_url} onChange={(e) => handleChange('github_url', e.target.value)} placeholder="https://github.com/..." />
        </div>
        <div className="form-group">
          <label className="form-label">Live Demo URL</label>
          <input className="form-input" type="url" value={form.demo_url} onChange={(e) => handleChange('demo_url', e.target.value)} placeholder="https://..." />
        </div>
        <div className="form-group form-group--full">
          <label className="form-label">Achievement / Result</label>
          <input className="form-input" value={form.achievement} onChange={(e) => handleChange('achievement', e.target.value)} placeholder="e.g. 98% accuracy, 10k daily users" />
        </div>

        <div className="form-group form-group--full">
          <label className="form-label">Technologies</label>
          <div className="tech-input-row">
            <input
              className="form-input"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
              placeholder="Add technology and press Enter"
            />
            <button type="button" className="admin-btn admin-btn--sm" onClick={addTech}>Add</button>
          </div>
          <div className="tech-tags" style={{ marginTop: 8 }}>
            {(form.technologies || []).map((t) => (
              <span key={t} className="tech-tag tech-tag--removable">
                {t}
                <button type="button" onClick={() => removeTech(t)} className="tech-tag-remove" aria-label={`Remove ${t}`}>✕</button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <input type="checkbox" checked={Boolean(form.is_featured)} onChange={(e) => handleChange('is_featured', e.target.checked)} className="form-checkbox" />
            {' '}Featured Project
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">
            <input type="checkbox" checked={Boolean(form.is_visible)} onChange={(e) => handleChange('is_visible', e.target.checked)} className="form-checkbox" />
            {' '}Visible on Portfolio
          </label>
        </div>
      </div>

      {error && <p className="form-status form-status--error">{error}</p>}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Project'}
        </button>
      </div>
    </form>
  );
}

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');

  const loadProjects = () => {
    setLoading(true);
    fetchAdminProjects()
      .then((data) => {
        const sorted = [...(data || [])].sort(
          (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
        );
        setProjects(sorted);
      })
      .catch(() => setMessage('Failed to load projects.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  const persistOrder = async (newOrderList, rollbackList) => {
    setSavingOrder(true);
    setMessage('');
    const payload = newOrderList.map((p, idx) => ({
      id: p.id,
      display_order: idx + 1,
    }));

    try {
      await reorderProjects(payload);
      setMessage('✓ Project order saved.');
      const refreshed = await fetchAdminProjects();
      const sorted = [...(refreshed || [])].sort(
        (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
      );
      setProjects(sorted);
    } catch (err) {
      setMessage(`Order update failed: ${err.message || 'Failed to save project order.'}`);
      setProjects(rollbackList);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= projects.length || savingOrder) return;

    const previousList = [...projects];
    const updated = [...projects];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setProjects(updated);
    await persistOrder(updated, previousList);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = 'move';
    } catch {}
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || savingOrder) {
      setDraggedIndex(null);
      return;
    }

    const previousList = [...projects];
    const updated = [...projects];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setDraggedIndex(null);

    setProjects(updated);
    await persistOrder(updated, previousList);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveNew = async (data) => {
    await createProject(data);
    setIsAdding(false);
    loadProjects();
    setMessage('✓ Project created.');
  };

  const handleSaveEdit = async (data) => {
    await updateProject(editingProject.id, data);
    setEditingProject(null);
    loadProjects();
    setMessage('✓ Project updated.');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project permanently? This cannot be undone.')) return;
    try {
      await deleteProject(id);
      loadProjects();
      setMessage('✓ Project deleted.');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDuplicate = async (id) => {
    await duplicateProject(id);
    loadProjects();
    setMessage('✓ Project duplicated.');
  };

  const handleToggleVisibility = async (project) => {
    await updateProject(project.id, { is_visible: !project.is_visible });
    loadProjects();
  };

  if (isAdding) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Add Project</h2>
        </div>
        <ProjectForm onSave={handleSaveNew} onCancel={() => setIsAdding(false)} />
      </div>
    );
  }

  if (editingProject) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Edit Project</h2>
        </div>
        <ProjectForm project={editingProject} onSave={handleSaveEdit} onCancel={() => setEditingProject(null)} />
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 className="admin-panel-title">Projects</h2>
          {savingOrder && (
            <span className="admin-badge admin-badge--gold" style={{ fontSize: '11px' }}>
              Saving order…
            </span>
          )}
        </div>
        <button className="admin-btn admin-btn--primary" onClick={() => setIsAdding(true)}>+ Add Project</button>
      </div>

      {message && (
        <p className={`form-status ${message.startsWith('Error') || message.includes('failed') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}

      {loading ? (
        <div className="admin-loading">Loading projects…</div>
      ) : (
        <div className="admin-list">
          {projects.length === 0 && (
            <div className="admin-empty">No projects yet. Click "+ Add Project" to create one.</div>
          )}
          {projects.map((project, index) => (
            <div
              key={project.id}
              draggable={!savingOrder}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`admin-list-item ${!project.is_visible ? 'admin-list-item--hidden' : ''} ${draggedIndex === index ? 'admin-list-item--active' : ''}`}
              style={{ cursor: savingOrder ? 'default' : 'grab' }}
            >
              <div className="section-order-controls" style={{ marginRight: '10px' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm sections-move-btn"
                  disabled={index === 0 || savingOrder}
                  onClick={(e) => { e.stopPropagation(); handleMove(index, -1); }}
                  aria-label={`Move ${project.title} up`}
                  title="Move Up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm sections-move-btn"
                  disabled={index === projects.length - 1 || savingOrder}
                  onClick={(e) => { e.stopPropagation(); handleMove(index, 1); }}
                  aria-label={`Move ${project.title} down`}
                  title="Move Down"
                >
                  ↓
                </button>
              </div>

              <div className="admin-list-item-body">
                {project.image && (
                  <img src={project.image} alt={project.title} className="admin-list-thumbnail" />
                )}
                <div className="admin-list-item-info">
                  <div className="admin-list-item-title">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="admin-badge admin-badge--muted" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                        #{project.display_order ?? (index + 1)}
                      </span>
                      <span>{project.title}</span>
                    </span>
                    {project.is_featured ? <span className="admin-badge admin-badge--gold">Featured</span> : null}
                    {!project.is_visible ? <span className="admin-badge admin-badge--muted">Hidden</span> : null}
                  </div>
                  <div className="admin-list-item-meta">
                    {project.category ? `${project.category} · ` : ''}{project.project_date}
                    {project.short_description && ` · ${project.short_description.substring(0, 60)}…`}
                  </div>
                  {(project.technologies || []).length > 0 && (
                    <div className="tech-tags tech-tags--sm">
                      {project.technologies.slice(0, 4).map((t) => (
                        <span key={t} className="tech-tag">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="admin-list-item-actions">
                <button className="admin-btn admin-btn--sm" onClick={() => handleToggleVisibility(project)}>
                  {project.is_visible ? 'Hide' : 'Show'}
                </button>
                <button className="admin-btn admin-btn--sm" onClick={() => handleDuplicate(project.id)}>Copy</button>
                <button className="admin-btn admin-btn--sm admin-btn--secondary" onClick={() => setEditingProject(project)}>Edit</button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(project.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

