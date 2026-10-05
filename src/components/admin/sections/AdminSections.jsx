import React, { useEffect, useState } from 'react';
import { fetchAdminSections, updateSection, reorderSections } from '../../../api/client';

export default function AdminSections() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAdminSections().then(setSections).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggle = async (section) => {
    try {
      await updateSection(section.id, { is_visible: !section.is_visible });
      setMessage(`✓ ${section.name} is now ${!section.is_visible ? 'Visible' : 'Hidden'}.`);
      load();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const updated = [...sections];
    [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
    setSections(updated);
  };

  const moveDown = (i) => {
    if (i === sections.length - 1) return;
    const updated = [...sections];
    [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
    setSections(updated);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    setMessage('');
    try {
      const order = sections.map((s, i) => ({ id: s.id, display_order: i }));
      await reorderSections(order);
      setMessage('✓ Section order saved successfully.');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Sections</h2>
      </div>
      <p className="admin-panel-subtitle">
        Control which sections appear on your portfolio and in what order.
        Toggle visibility or rearrange using the arrows, then save the order.
      </p>

      {message && (
        <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}

      {loading ? (
        <div className="admin-loading">Loading…</div>
      ) : (
        <>
          <div className="admin-list sections-list">
            {sections.map((section, i) => (
              <div key={section.id} className={`admin-list-item sections-list-item ${!section.is_visible ? 'admin-list-item--hidden' : ''}`}>
                <div className="section-order-controls">
                  <button
                    className="admin-btn admin-btn--sm sections-move-btn"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    aria-label="Move section up"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="admin-btn admin-btn--sm sections-move-btn"
                    onClick={() => moveDown(i)}
                    disabled={i === sections.length - 1}
                    aria-label="Move section down"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>

                <div className="admin-list-item-info">
                  <div className="admin-list-item-title">
                    {section.name}
                    <span className="section-type-badge">{section.type || section.slug}</span>
                    {!section.is_visible && <span className="admin-badge admin-badge--muted">Hidden</span>}
                    {section.slug === 'hero' && <span className="admin-badge admin-badge--gold">Locked</span>}
                  </div>
                  <div className="admin-list-item-meta">
                    Slug: /{section.slug} · Display Order: {section.display_order ?? i}
                  </div>
                </div>

                <div className="admin-list-item-actions">
                  <button
                    className={`admin-btn admin-btn--sm ${section.is_visible ? 'admin-btn--secondary' : ''}`}
                    onClick={() => handleToggle(section)}
                    disabled={section.slug === 'hero'}
                    title={section.slug === 'hero' ? 'Hero section cannot be hidden' : undefined}
                  >
                    {section.is_visible ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-actions">
            <button className="admin-btn admin-btn--primary" onClick={handleSaveOrder} disabled={saving}>
              {saving ? 'Saving…' : 'Save Section Order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
