import React, { useEffect, useState, useRef } from 'react';
import { fetchAdminResumes, uploadResumeFile, setActiveResume, deleteResume } from '../../../api/client';

export default function AdminResume() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    fetchAdminResumes()
      .then((data) => setResumes(Array.isArray(data) ? data : []))
      .catch((err) => setMessage(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      setMessage('Error: Only PDF files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage('Error: File must be under 10 MB.');
      return;
    }

    setUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      await uploadResumeFile(formData);
      setMessage('✓ Resume uploaded and set as active.');
      load();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetActive = async (id) => {
    await setActiveResume(id);
    load();
    setMessage('✓ Active resume updated.');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume version?')) return;
    await deleteResume(id);
    load();
    setMessage('✓ Resume deleted.');
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Resume</h2>
      </div>
      <p className="admin-panel-subtitle">
        Upload your resume as a PDF. The active version will be served from the public "Resume" button.
      </p>

      <div className="resume-upload-zone" onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="resume-file-input"
          aria-label="Upload resume PDF"
        />
        <div className="resume-upload-content">
          <span className="resume-upload-icon" aria-hidden="true">⊞</span>
          <p className="resume-upload-label">{uploading ? 'Uploading…' : 'Click to upload PDF (max 10 MB)'}</p>
        </div>
      </div>

      {message && (
        <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}

      {loading ? (
        <div className="admin-loading">Loading resumes…</div>
      ) : (
        <div className="admin-list">
          <h3 className="admin-subheading">Version History</h3>
          {resumes.length === 0 && <div className="admin-empty">No resumes uploaded yet.</div>}
          {resumes.map((resume) => (
            <div key={resume.id} className={`admin-list-item ${resume.is_active ? 'admin-list-item--active' : ''}`}>
              <div className="admin-list-item-info">
                <div className="admin-list-item-title">
                  {resume.original_filename || resume.filename}
                  {resume.is_active && <span className="admin-badge admin-badge--green">ACTIVE</span>}
                </div>
                <div className="admin-list-item-meta">
                  Uploaded: {new Date(resume.uploaded_at).toLocaleDateString()}
                  {' · '}
                  {Math.round((resume.file_size || 0) / 1024)} KB
                </div>
              </div>
              <div className="admin-list-item-actions">
                <a
                  href={`/api/admin/resumes/${resume.id}/download`}
                  className="admin-btn admin-btn--sm"
                  download
                >
                  Download
                </a>
                {!resume.is_active && (
                  <button className="admin-btn admin-btn--sm admin-btn--secondary" onClick={() => handleSetActive(resume.id)}>
                    Set Active
                  </button>
                )}
                {!resume.is_active && (
                  <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(resume.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
