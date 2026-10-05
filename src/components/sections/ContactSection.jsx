import React, { useState } from 'react';
import ScrollReveal from '../ui/ScrollReveal';
import { sendContactMessage } from '../../api/client';
import { trackEvent } from '../../api/tracker.js';

export default function ContactSection({ data }) {
  const site = data?.siteSettings || {};
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setStatus('error:Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setStatus('');
    try {
      await sendContactMessage(form);
      // Track contact submission without transmitting any PII
      trackEvent('contact_submit');
      setStatus('success:Your message has been sent! I\'ll get back to you soon.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus(`error:${err.message || 'Failed to send message. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const statusType = status.startsWith('success:') ? 'success' : status.startsWith('error:') ? 'error' : '';
  const statusMsg = status.replace(/^(success|error):/, '');

  return (
    <section className="section-contact" id="contact" aria-labelledby="contact-title">
      <div className="section-container">
        <ScrollReveal>
          <div className="section-label">Contact</div>
          <h2 id="contact-title" className="section-heading">Let's Talk</h2>
          <p className="contact-intro">
            Open to new opportunities, collaborations, and interesting conversations.
          </p>
        </ScrollReveal>

        <div className="contact-grid">
          <ScrollReveal delay={80}>
            <div className="contact-info">
              {site.email && (
                <a
                  href={`mailto:${site.email}`}
                  className="contact-item"
                  onClick={() => trackEvent('external_link_click', { destination: 'email' })}
                >
                  <span className="contact-item-icon" aria-hidden="true">✉</span>
                  <span>{site.email}</span>
                </a>
              )}
              {site.linkedin && (
                <a
                  href={site.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-item"
                  onClick={() => trackEvent('linkedin_click', { url: site.linkedin })}
                >
                  <span className="contact-item-icon" aria-hidden="true">in</span>
                  <span>LinkedIn</span>
                </a>
              )}
              {site.github && (
                <a
                  href={site.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-item"
                  onClick={() => trackEvent('github_click', { url: site.github })}
                >
                  <span className="contact-item-icon" aria-hidden="true">⌥</span>
                  <span>GitHub</span>
                </a>
              )}
              {site.twitter && (
                <a
                  href={site.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-item"
                  onClick={() => trackEvent('external_link_click', { destination: 'Twitter', url: site.twitter })}
                >
                  <span className="contact-item-icon" aria-hidden="true">✗</span>
                  <span>Twitter / X</span>
                </a>
              )}
              {site.location && (
                <div className="contact-item">
                  <span className="contact-item-icon" aria-hidden="true">◎</span>
                  <span>{site.location}</span>
                </div>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={120}>
            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-name">
                    Name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-name"
                    className="form-input"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="contact-email">
                    Email <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-email"
                    className="form-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-subject">Subject</label>
                <input
                  id="contact-subject"
                  className="form-input"
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="What's this about?"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-message">
                  Message <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="contact-message"
                  className="form-input form-textarea"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Your message..."
                  required
                  rows={5}
                />
              </div>
              {statusMsg && (
                <p className={`form-status form-status--${statusType}`} role="alert">
                  {statusMsg}
                </p>
              )}
              <button type="submit" className="action action-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
