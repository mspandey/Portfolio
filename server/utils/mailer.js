import 'dotenv/config';
import nodemailer from 'nodemailer';

let transporterInstance = null;

/**
 * Mask an email for safe logging (e.g., "amisha.pandey@example.com" -> "a***y@example.com")
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Basic HTML escaping to prevent HTML injection in emails
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check if SMTP is configured
 */
export function isSmtpConfigured() {
  const host = (process.env.SMTP_HOST || process.env.EMAIL_HOST || '').trim();
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').trim();
  return Boolean(host && user && pass);
}

/**
 * Return safe SMTP configuration status without exposing sensitive credentials
 */
export function getSmtpStatus() {
  const host = (process.env.SMTP_HOST || process.env.EMAIL_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').trim();
  const from = (process.env.SMTP_FROM || process.env.EMAIL_FROM || user || '').trim();

  return {
    configured: Boolean(host && user && pass),
    host: host || null,
    port,
    user: user ? maskEmail(user) : null,
    from: from ? maskEmail(from) : null,
  };
}

/**
 * Create the Nodemailer Transporter dynamically on each call
 */
export function getTransporter() {
  const host = (process.env.SMTP_HOST || process.env.EMAIL_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').trim();
  const pass = rawPass.replace(/\s+/g, '');

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured on the server environment.');
  }

  // Gmail port 587 uses STARTTLS (secure: false), port 465 uses SSL/TLS (secure: true)
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Verify SMTP connection safely
 */
export async function verifySmtpConnection() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified successfully.' };
  } catch (err) {
    const errMessage = parseSmtpError(err);
    console.error('[MAIL] SMTP verification failed:', errMessage);
    return { success: false, error: errMessage };
  }
}

/**
 * Translate SMTP technical errors into user-friendly diagnostic messages
 */
function parseSmtpError(err) {
  const msg = err?.message || String(err);
  const code = err?.responseCode || err?.code;

  if (code === 535 || msg.includes('535') || msg.includes('BadCredentials') || msg.includes('Username and Password not accepted')) {
    return 'SMTP Authentication failed. If using Gmail, make sure you are using a 16-character Google App Password (not your regular account password) and that 2-Step Verification is active.';
  }
  if (code === 534 || msg.includes('534') || msg.includes('Application-specific password required')) {
    return 'Google requires an App Password. Generate one in your Google Account security settings.';
  }
  if (code === 'ETIMEDOUT' || msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
    return 'SMTP connection timed out. Please verify SMTP_HOST and SMTP_PORT connectivity.';
  }
  if (code === 'ENOTFOUND' || msg.includes('ENOTFOUND')) {
    return 'SMTP server host not found. Please verify SMTP_HOST setting.';
  }
  if (code === 'EENVELOPE' || msg.includes('No recipients defined')) {
    return 'Recipient email address is invalid or empty.';
  }

  return `SMTP Error: ${msg}`;
}

/**
 * Send an email reply from the admin to the contact message author
 */
export async function sendAdminReplyEmail({ to, recipientName, originalSubject, replyText }) {
  if (!to || !to.includes('@')) {
    throw new Error('Valid recipient email address is required.');
  }

  if (!replyText || !replyText.trim()) {
    throw new Error('Reply message content cannot be empty.');
  }

  const transporter = getTransporter();
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || `Amisha Pandey <${smtpUser}>`;

  const rawName = (recipientName || '').trim();
  const displayName = rawName || 'there';
  const origSubj = (originalSubject || '').trim();
  const subject = origSubj
    ? (origSubj.toLowerCase().startsWith('re:') ? origSubj : `Re: ${origSubj}`)
    : 'Re: Your portfolio enquiry';

  const cleanReply = replyText.trim();
  const escapedName = escapeHtml(displayName);
  const escapedReply = escapeHtml(cleanReply).replace(/\n/g, '<br/>');

  const textBody = `Hi ${displayName},

${cleanReply}

Best regards,
Amisha Pandey`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; margin: 0; padding: 20px; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .salutation { font-size: 16px; font-weight: 600; color: #1a202c; margin-bottom: 16px; }
    .reply-content { font-size: 15px; color: #2d3748; margin-bottom: 28px; line-height: 1.7; }
    .signature { margin-top: 28px; padding-top: 20px; border-top: 1px solid #edf2f7; font-size: 14px; color: #4a5568; }
    .signature strong { color: #1a202c; font-size: 15px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="salutation">Hi ${escapedName},</div>
    <div class="reply-content">${escapedReply}</div>
    <div class="signature">
      Best regards,<br/>
      <strong>Amisha Pandey</strong>
    </div>
  </div>
</body>
</html>`;

  console.log(`[MAIL] Starting SMTP send`);
  console.log(`[MAIL] Recipient configured: ${Boolean(to)}`);
  console.log(`[MAIL] SMTP_HOST configured: ${Boolean(process.env.SMTP_HOST || process.env.EMAIL_HOST)}`);
  console.log(`[MAIL] SMTP_PORT configured: ${Boolean(process.env.SMTP_PORT)}`);
  console.log(`[MAIL] SMTP_USER configured: ${Boolean(process.env.SMTP_USER || process.env.EMAIL_USER)}`);
  console.log(`[MAIL] SMTP_PASS configured: ${Boolean(process.env.SMTP_PASS || process.env.EMAIL_PASS)}`);
  console.log(`[MAIL] SMTP_FROM configured: ${Boolean(process.env.SMTP_FROM || process.env.EMAIL_FROM)}`);

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.log(`[MAIL] Email sent successfully. Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      recipient: maskEmail(to),
    };
  } catch (err) {
    const safeError = parseSmtpError(err);
    console.error(`[MAIL] Failed to send email to ${maskEmail(to)}:`, err.message);
    throw new Error(safeError);
  }
}
