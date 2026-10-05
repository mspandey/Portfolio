import React, { useEffect, useState, useRef } from 'react';
import { fetchAdminMedia, deleteMedia } from '../../../api/client';

export default function AdminMedia() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const fileInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    fetchAdminMedia().then(setMedia).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setMessage('');
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('media', file);
        await uploadMediaFile(formData);
      }
      setMessage(`✓ ${files.length} file(s) uploaded.`);
      load();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this file permanently?')) return;
    await deleteMedia(id);
    load();
    setMessage('✓ File deleted.');
  };

  const isImage = (url) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Media Library</h2>
      </div>
      <p className="admin-panel-subtitle">Upload images and files for use across your portfolio. Copy the URL to paste into any image field.</p>

      <div className="media-upload-zone" onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleUpload}
          className="resume-file-input"
          aria-label="Upload media files"
        />
        <div className="resume-upload-content">
          <span className="resume-upload-icon" aria-hidden="true">⊟</span>
          <p className="resume-upload-label">{uploading ? 'Uploading…' : 'Click to upload images or videos'}</p>
        </div>
      </div>

      {message && (
        <p className={`form-status ${message.startsWith('Error') ? 'form-status--error' : 'form-status--success'}`}>
          {message}
        </p>
      )}

      {loading ? (
        <div className="admin-loading">Loading media…</div>
      ) : (
        <div className="media-grid">
          {media.length === 0 && <div className="admin-empty">No media files yet.</div>}
          {media.map((item) => {
            const url = `/uploads/media/${item.filename}`;
            return (
              <div key={item.id} className="media-item">
                {isImage(item.filename) ? (
                  <img src={url} alt={item.original_filename || item.filename} className="media-thumbnail" loading="lazy" />
                ) : (
                  <div className="media-file-icon" aria-hidden="true">⊟</div>
                )}
                <div className="media-item-info">
                  <p className="media-filename" title={item.original_filename || item.filename}>
                    {(item.original_filename || item.filename).substring(0, 20)}…
                  </p>
                  <p className="media-filesize">{Math.round((item.file_size || 0) / 1024)} KB</p>
                </div>
                <div className="media-item-actions">
                  <button
                    className="admin-btn admin-btn--sm"
                    onClick={() => handleCopy(url)}
                    title="Copy URL to clipboard"
                  >
                    {copied === url ? '✓ Copied' : 'Copy URL'}
                  </button>
                  <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(item.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
