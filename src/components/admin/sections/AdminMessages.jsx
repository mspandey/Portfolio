import React, { useEffect, useState } from 'react';
import {
  fetchAdminMessages,
  markMessageRead,
  replyToMessage,
  deleteMessage,
} from '../../../api/client';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, replied
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetchAdminMessages()
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch((err) => setStatusMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleOpenMessage = async (msg) => {
    setSelectedMessage(msg);
    setReplyText(msg.reply_message || '');
    if (!msg.is_read) {
      try {
        await markMessageRead(msg.id, true);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, is_read: 1 } : m))
        );
      } catch (e) {
        console.error('Failed to mark read:', e);
      }
    }
  };

  const handleToggleRead = async (msg, e) => {
    e.stopPropagation();
    const nextState = !msg.is_read;
    try {
      await markMessageRead(msg.id, nextState);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: nextState ? 1 : 0 } : m))
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage((prev) => ({ ...prev, is_read: nextState ? 1 : 0 }));
      }
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this message permanently?')) return;
    try {
      await deleteMessage(id);
      setStatusMsg('✓ Message deleted.');
      if (selectedMessage?.id === id) setSelectedMessage(null);
      load();
    } catch (err) {
      setStatusMsg(`Delete error: ${err.message}`);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedMessage || !replyText.trim()) return;

    setSendingReply(true);
    setStatusMsg('');
    try {
      const res = await replyToMessage(selectedMessage.id, replyText.trim());
      setStatusMsg('✓ Reply sent successfully.');
      if (res.data) {
        setSelectedMessage(res.data);
      } else {
        setSelectedMessage((p) => ({
          ...p,
          status: 'replied',
          replied_at: new Date().toISOString(),
          reply_message: replyText.trim(),
        }));
      }
      load();
    } catch (err) {
      setStatusMsg(`Reply error: ${err.message}`);
    } finally {
      setSendingReply(false);
    }
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  const filteredMessages = messages.filter((m) => {
    if (filter === 'unread') return !m.is_read;
    if (filter === 'replied') return m.status === 'replied' || Boolean(m.reply_message);
    return true;
  });

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">
            Message Inbox {unreadCount > 0 && <span className="admin-badge admin-badge--green">{unreadCount} UNREAD</span>}
          </h2>
          <p className="admin-panel-subtitle">Review contact form submissions and reply directly from the CMS.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`admin-btn ${filter === 'all' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
            onClick={() => setFilter('all')}
          >
            All ({messages.length})
          </button>
          <button
            className={`admin-btn ${filter === 'unread' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`admin-btn ${filter === 'replied' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
            onClick={() => setFilter('replied')}
          >
            Replied ({messages.filter((m) => m.status === 'replied' || m.reply_message).length})
          </button>
        </div>
      </div>

      {statusMsg && (
        <p className={`form-status ${statusMsg.startsWith('Error') || statusMsg.includes('error') ? 'form-status--error' : 'form-status--success'}`}>
          {statusMsg}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedMessage ? '1fr 1.2fr' : '1fr', gap: '24px', marginTop: '16px' }}>
        {/* Messages List */}
        <div>
          {loading ? (
            <div className="admin-loading">Loading messages…</div>
          ) : (
            <div className="admin-list">
              {filteredMessages.length === 0 && (
                <div className="admin-empty">No messages matching current filter.</div>
              )}
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`admin-list-item ${!msg.is_read ? 'admin-list-item--active' : ''} ${selectedMessage?.id === msg.id ? 'admin-list-item--selected' : ''}`}
                  onClick={() => handleOpenMessage(msg)}
                  style={{
                    cursor: 'pointer',
                    background: selectedMessage?.id === msg.id ? 'rgba(255,255,255,0.08)' : undefined,
                    borderLeft: !msg.is_read ? '4px solid #8d5d48' : undefined,
                  }}
                >
                  <div className="admin-list-item-info" style={{ flex: 1 }}>
                    <div className="admin-list-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{msg.name}</strong>
                      <span style={{ fontSize: '12px', color: '#888' }}>&lt;{msg.email}&gt;</span>
                      {!msg.is_read && <span className="admin-badge admin-badge--green">NEW</span>}
                      {(msg.status === 'replied' || msg.reply_message) && <span className="admin-badge admin-badge--gray">REPLIED</span>}
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>
                      {msg.subject || 'No Subject'}
                    </div>

                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                      {msg.message}
                    </div>

                    <div className="admin-list-item-meta" style={{ marginTop: '6px', fontSize: '11px' }}>
                      {new Date(msg.created_at).toLocaleString()}
                      {msg.ip_address && ` · IP: ${msg.ip_address}`}
                    </div>
                  </div>

                  <div className="admin-list-item-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--sm admin-btn--secondary"
                      onClick={(e) => handleToggleRead(msg, e)}
                    >
                      {msg.is_read ? 'Mark Unread' : 'Mark Read'}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--sm admin-btn--danger"
                      onClick={(e) => handleDelete(msg.id, e)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Message Detail & Reply Panel */}
        {selectedMessage && (
          <div className="admin-panel" style={{ margin: 0, padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>{selectedMessage.subject || 'No Subject'}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>
                  From: <strong>{selectedMessage.name}</strong> ({selectedMessage.email})
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#777' }}>
                  Received: {new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--sm"
                onClick={() => setSelectedMessage(null)}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', marginBottom: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px' }}>
              {selectedMessage.message}
            </div>

            {/* Existing Reply if sent */}
            {selectedMessage.reply_message && (
              <div style={{ background: 'rgba(141, 93, 72, 0.12)', borderLeft: '3px solid #8d5d48', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
                <strong style={{ fontSize: '12px', color: '#d8a48f' }}>
                  ✓ Your Reply (sent {selectedMessage.replied_at ? new Date(selectedMessage.replied_at).toLocaleString() : 'previously'}):
                </strong>
                <p style={{ margin: '6px 0 0', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                  {selectedMessage.reply_message}
                </p>
              </div>
            )}

            {/* Reply Form */}
            <form onSubmit={handleSendReply}>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Send Reply to {selectedMessage.email}</h4>
              <textarea
                className="form-input form-textarea"
                rows={5}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Type your reply to ${selectedMessage.name} here…`}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={sendingReply}
                >
                  {sendingReply ? 'Sending Reply…' : '✉ Send Reply'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
