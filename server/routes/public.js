import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getPublicPortfolioData,
  getActiveResume,
  createContactMessage,
  getTableRecords,
} from '../data-service.js';
import { downloadFromStorage } from '../supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Middleware: Strict no-cache for all public CMS dynamic endpoints
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// GET /api/public/data (and /api/data)
router.get(['/data', '/public/data'], async (req, res) => {
  try {
    const portfolioData = await getPublicPortfolioData();
    return res.json(portfolioData);
  } catch (err) {
    console.error('Error fetching public portfolio data:', err);
    return res.status(500).json({ error: 'Failed to fetch portfolio data.' });
  }
});

// GET /api/public/projects
router.get(['/projects', '/public/projects'], async (req, res) => {
  try {
    const projects = await getTableRecords('projects', { orderBy: 'display_order', ascending: true, filterVisible: true });
    return res.json(projects);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// GET /api/public/experiences
router.get(['/experiences', '/public/experiences'], async (req, res) => {
  try {
    const experiences = await getTableRecords('experiences', { orderBy: 'display_order', ascending: true, filterVisible: true });
    return res.json(experiences);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch experiences.' });
  }
});

// GET /api/public/skills
router.get(['/skills', '/public/skills'], async (req, res) => {
  try {
    const skills = await getTableRecords('skills', { orderBy: 'display_order', ascending: true, filterVisible: true });
    return res.json(skills);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch skills.' });
  }
});

// GET /api/public/achievements
router.get(['/achievements', '/public/achievements'], async (req, res) => {
  try {
    const achievements = await getTableRecords('achievements', { orderBy: 'display_order', ascending: true, filterVisible: true });
    return res.json(achievements);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch achievements.' });
  }
});

// GET /api/public/education
router.get(['/education', '/public/education'], async (req, res) => {
  try {
    const education = await getTableRecords('education', { orderBy: 'display_order', ascending: true, filterVisible: true });
    return res.json(education);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch education.' });
  }
});

// GET /api/public/certifications
router.get(['/certifications', '/public/certifications'], async (req, res) => {
  try {
    const certifications = await getTableRecords('certifications', { orderBy: 'display_order', ascending: true, filterVisible: true });
    return res.json(certifications);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch certifications.' });
  }
});

// GET /api/public/sections
router.get(['/sections', '/public/sections'], async (req, res) => {
  try {
    const sections = await getTableRecords('sections', { orderBy: 'display_order', ascending: true, filterVisible: true });
    return res.json(sections);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sections.' });
  }
});

// GET /api/public/resume/download (also aliases /api/resumes/active, /api/resume/download)
const handleActiveResumeDownload = async (req, res) => {
  try {
    const resume = await getActiveResume();
    if (!resume) {
      return res.status(404).json({ error: 'No active resume is available.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Amisha_pandey_Resume.pdf"');

    // 1. If stored in Supabase Storage with storage_path
    if (resume.storage_path) {
      try {
        const cleanPath = resume.storage_path.replace(/^resumes\//, '');
        const buf = await downloadFromStorage('resumes', cleanPath);
        if (buf && buf.length > 0) {
          return res.send(buf);
        }
      } catch (err) {
        console.warn('downloadFromStorage(resumes) note:', err.message);
      }
    }

    // 2. If stored in Supabase Storage with public URL
    if (resume.storage_url && resume.storage_url.startsWith('http')) {
      try {
        const response = await fetch(resume.storage_url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          return res.send(Buffer.from(buffer));
        }
      } catch (storageErr) {
        console.warn('Direct fetch from storage_url note:', storageErr.message);
      }
    }

    // 3. Fallback to public media static resume
    const fallbackPath = path.join(__dirname, '..', '..', 'public', 'portfolio-media', 'resumes', 'Amisha_pandey_Resume.pdf');
    if (fs.existsSync(fallbackPath)) {
      return res.sendFile(path.resolve(fallbackPath));
    }

    return res.status(404).json({ error: 'Active resume file not found.' });
  } catch (err) {
    console.error('Error downloading active resume:', err);
    return res.status(500).json({ error: 'Failed to download resume.' });
  }
};

router.get('/resume/download', handleActiveResumeDownload);
router.get('/public/resume/download', handleActiveResumeDownload);
router.get('/resumes/active', handleActiveResumeDownload);
router.get('/resumes/active/download', handleActiveResumeDownload);

// Helper: Extract Storage Path from Supabase Storage Public URL
function extractStoragePathFromUrl(url, bucket = 'certificates') {
  if (!url || typeof url !== 'string') return null;
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const after = url.substring(idx + marker.length);
    return after.split('?')[0];
  }
  return null;
}

// GET /api/public/certificates/download (guaranteed attachment download with clean filename)
const handleCertificateDownload = async (req, res) => {
  try {
    const { id, url: queryUrl, filename: queryFilename } = req.query;
    let targetUrl = queryUrl;
    let targetFilename = queryFilename || 'certificate';

    if (id) {
      const achievements = await getTableRecords('achievements', { filterVisible: false });
      const ach = achievements.find((a) => String(a.id) === String(id));
      if (ach && ach.certificate_url) {
        targetUrl = ach.certificate_url;
        targetFilename = `${ach.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Certificate`;
      }
    }

    if (!targetUrl) {
      return res.status(400).json({ error: 'No certificate URL or achievement ID specified.' });
    }

    const storagePath = extractStoragePathFromUrl(targetUrl, 'certificates');
    let fileBuffer = null;
    let mimeType = 'application/pdf';

    if (storagePath) {
      try {
        fileBuffer = await downloadFromStorage('certificates', storagePath);
      } catch (err) {
        console.warn('downloadFromStorage note in cert download:', err.message);
      }
    }

    if (!fileBuffer && targetUrl.startsWith('http')) {
      try {
        const resp = await fetch(targetUrl);
        if (resp.ok) {
          mimeType = resp.headers.get('content-type') || mimeType;
          const arrayBuf = await resp.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
        }
      } catch (fetchErr) {
        console.warn('fetch error in certificate download:', fetchErr.message);
      }
    }

    if (!fileBuffer) {
      return res.status(404).json({ error: 'Certificate file could not be retrieved.' });
    }

    let ext = '.pdf';
    if (targetUrl.toLowerCase().includes('.png') || mimeType.includes('png')) ext = '.png';
    else if (targetUrl.toLowerCase().includes('.webp') || mimeType.includes('webp')) ext = '.webp';
    else if (targetUrl.toLowerCase().includes('.jpg') || targetUrl.toLowerCase().includes('.jpeg') || mimeType.includes('jpeg')) ext = '.jpg';

    if (!targetFilename.toLowerCase().endsWith(ext)) {
      targetFilename += ext;
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${targetFilename}"`);
    return res.send(fileBuffer);
  } catch (err) {
    console.error('Error downloading certificate:', err);
    return res.status(500).json({ error: 'Failed to download certificate.' });
  }
};

router.get('/certificate/download', handleCertificateDownload);
router.get('/public/certificates/download', handleCertificateDownload);
router.get('/certificates/download', handleCertificateDownload);

// POST /api/contact and /api/public/messages
const handleContactPost = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const saved = await createContactMessage({
      name: name.trim(),
      email: email.trim(),
      subject: (subject || '').trim(),
      message: message.trim(),
    });

    return res.json({ success: true, message: 'Message sent successfully.', data: saved });
  } catch (err) {
    console.error('Error submitting contact form:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
};

router.post('/contact', handleContactPost);
router.post('/public/messages', handleContactPost);

export default router;
