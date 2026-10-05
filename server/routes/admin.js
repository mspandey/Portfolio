import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateAdmin } from '../middleware/auth.js';
import {
  getSiteSettings,
  updateSiteSettings,
  getHeroSettings,
  updateHeroSettings,
  getAboutSettings,
  updateAboutSettings,
  getAllSections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  getAllProjects,
  createProject,
  updateProject,
  duplicateProject,
  deleteProject,
  reorderProjects,
  getAllExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
  reorderExperiences,
  getAllSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  reorderSkills,
  getAllAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  reorderAchievements,
  getAllEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  reorderEducation,
  getAllCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  reorderCertifications,
  getAllResumes,
  createResume,
  activateResumeById,
  deleteResumeById,
  getAllMedia,
  createMedia,
  deleteMediaById,
  getAllMessages,
  markMessageRead,
  markMessageReplied,
  deleteMessageById,
} from '../data-service.js';
import {
  uploadToStorage,
  downloadFromStorage,
  deleteFromStorage,
} from '../supabase.js';
import {
  isSmtpConfigured,
  getSmtpStatus,
  verifySmtpConnection,
  sendAdminReplyEmail,
} from '../utils/mailer.js';

const router = express.Router();

// Apply auth middleware and strict no-cache to all admin routes
router.use(authenticateAdmin);
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Multer in-memory storage (Zero serverless filesystem dependency)
const memoryStorage = multer.memoryStorage();

const uploadResume = multer({
  storage: memoryStorage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for resumes.'));
    }
  },
});

const uploadMedia = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const uploadCertificate = multer({
  storage: memoryStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid certificate format. Only PDF, JPG, PNG, and WEBP files are allowed.'));
    }
  },
});

// Helper: Sanitize Filename for Supabase Storage
function sanitizeFilename(originalName) {
  const ext = path.extname(originalName) || '';
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}_${Date.now()}${ext}`;
}

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

// ================= SITE SETTINGS =================
router.get('/site-settings', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch site settings.' });
  }
});

router.put('/site-settings', async (req, res) => {
  try {
    const updated = await updateSiteSettings(req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update site settings.' });
  }
});

// ================= HERO SETTINGS =================
router.get('/hero-settings', async (req, res) => {
  try {
    const settings = await getHeroSettings();
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch hero settings.' });
  }
});

router.put('/hero-settings', async (req, res) => {
  try {
    const updated = await updateHeroSettings(req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update hero settings.' });
  }
});

// ================= ABOUT SETTINGS =================
router.get('/about-settings', async (req, res) => {
  try {
    const settings = await getAboutSettings();
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch about settings.' });
  }
});

router.put('/about-settings', async (req, res) => {
  try {
    const updated = await updateAboutSettings(req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update about settings.' });
  }
});

// ================= SECTIONS MANAGEMENT =================
router.get('/sections', async (req, res) => {
  try {
    const sections = await getAllSections();
    return res.json(sections);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch sections.' });
  }
});

router.post('/sections', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and section type are required.' });
    }
    const section = await createSection(req.body);
    return res.status(201).json(section);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create section.' });
  }
});

router.put('/sections/:id', async (req, res) => {
  try {
    const updated = await updateSection(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update section.' });
  }
});

router.post('/sections/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    if (!Array.isArray(orderList)) {
      return res.status(400).json({ error: 'Order array required.' });
    }
    const updated = await reorderSections(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder sections.' });
  }
});

router.delete('/sections/:id', async (req, res) => {
  try {
    const result = await deleteSection(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to delete section.' });
  }
});

// ================= PROJECTS CRUD =================
router.get('/projects', async (req, res) => {
  try {
    const projects = await getAllProjects();
    return res.json(projects);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch projects.' });
  }
});

router.post('/projects', async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    const project = await createProject(req.body);
    return res.status(201).json(project);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create project.' });
  }
});

const handleProjectsReorder = async (req, res) => {
  try {
    const raw = req.body;
    let orderList = [];
    if (Array.isArray(raw)) {
      orderList = raw;
    } else if (raw && Array.isArray(raw.order)) {
      orderList = raw.order;
    } else if (raw && Array.isArray(raw.orderedIds)) {
      orderList = raw.orderedIds;
    } else if (raw && Array.isArray(raw.projects)) {
      orderList = raw.projects;
    } else {
      return res.status(400).json({ error: 'Expected an array of projects or { order: [...] }.' });
    }

    const updated = await reorderProjects(orderList);
    return res.json({ success: true, projects: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder projects.' });
  }
};

router.put('/projects/reorder', handleProjectsReorder);
router.post('/projects/reorder', handleProjectsReorder);
router.patch('/projects/reorder', handleProjectsReorder);
router.put('/projects-order', handleProjectsReorder);
router.post('/projects-order', handleProjectsReorder);

router.put('/projects/:id', async (req, res) => {
  try {
    const updated = await updateProject(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update project.' });
  }
});

router.post('/projects/:id/duplicate', async (req, res) => {
  try {
    const duplicated = await duplicateProject(req.params.id);
    return res.status(201).json(duplicated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to duplicate project.' });
  }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    const result = await deleteProject(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete project.' });
  }
});


// ================= EXPERIENCES CRUD =================
router.get('/experiences', async (req, res) => {
  try {
    const list = await getAllExperiences();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch experiences.' });
  }
});

router.post('/experiences', async (req, res) => {
  try {
    if (!req.body.company || !req.body.role) {
      return res.status(400).json({ error: 'Company and role are required.' });
    }
    const item = await createExperience(req.body);
    return res.status(201).json(item);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create experience.' });
  }
});

router.put('/experiences/:id', async (req, res) => {
  try {
    const updated = await updateExperience(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update experience.' });
  }
});

router.delete('/experiences/:id', async (req, res) => {
  try {
    const result = await deleteExperience(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete experience.' });
  }
});

router.post('/experiences/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderExperiences(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder experiences.' });
  }
});
router.patch('/experiences/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderExperiences(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder experiences.' });
  }
});

// ================= SKILLS CRUD =================
router.get('/skills', async (req, res) => {
  try {
    const list = await getAllSkills();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch skills.' });
  }
});

router.post('/skills', async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: 'Skill name is required.' });
    }
    const item = await createSkill(req.body);
    return res.status(201).json(item);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create skill.' });
  }
});

router.put('/skills/:id', async (req, res) => {
  try {
    const updated = await updateSkill(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update skill.' });
  }
});

router.delete('/skills/:id', async (req, res) => {
  try {
    const result = await deleteSkill(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete skill.' });
  }
});

router.post('/skills/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderSkills(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder skills.' });
  }
});
router.patch('/skills/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderSkills(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder skills.' });
  }
});

// ================= ACHIEVEMENTS CRUD =================
router.get('/achievements', async (req, res) => {
  try {
    const list = await getAllAchievements();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch achievements.' });
  }
});

// Dedicated Certificate Upload for Achievements (PDF, JPG, PNG, WEBP stored in Supabase 'certificates' bucket)
router.post('/achievements/upload-certificate', (req, res, next) => {
  uploadCertificate.single('certificate')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No certificate file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.pdf';
    let mimeType = req.file.mimetype;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else mimeType = 'image/jpeg';
    }

    const cleanFilename = sanitizeFilename(`certificate_${req.file.originalname}`);
    const { publicUrl } = await uploadToStorage('certificates', cleanFilename, req.file.buffer, mimeType);

    // If replacing an old certificate, delete the old file from Supabase Storage
    const oldUrl = req.body.old_certificate_url || req.body.old_url;
    if (oldUrl) {
      const oldStoragePath = extractStoragePathFromUrl(oldUrl, 'certificates');
      if (oldStoragePath && oldStoragePath !== cleanFilename) {
        await deleteFromStorage('certificates', oldStoragePath);
      }
    }

    // If an achievementId was provided, update the achievement record immediately
    const achievementId = req.body.achievement_id;
    if (achievementId) {
      await updateAchievement(achievementId, {
        certificate_url: publicUrl,
        certificate_storage_path: `certificates/${cleanFilename}`,
      });
    }

    return res.status(200).json({
      success: true,
      certificate_url: publicUrl,
      storage_path: `certificates/${cleanFilename}`,
      filename: req.file.originalname,
      mime_type: mimeType,
    });
  } catch (err) {
    console.error('Achievement certificate upload error:', err);
    return res.status(500).json({ error: `Certificate upload failed: ${err.message}` });
  }
});

// Remove certificate from an achievement and delete from Supabase Storage
router.delete('/achievements/:id/certificate', async (req, res) => {
  try {
    const { id } = req.params;
    const achievements = await getAllAchievements();
    const ach = achievements.find((a) => String(a.id) === String(id));
    
    const certUrl = req.body?.certificate_url || ach?.certificate_url;
    if (certUrl) {
      const storagePath = extractStoragePathFromUrl(certUrl, 'certificates');
      if (storagePath) {
        await deleteFromStorage('certificates', storagePath);
      }
    }

    if (ach) {
      await updateAchievement(id, {
        certificate_url: '',
        certificate_storage_path: '',
      });
    }

    return res.json({ success: true, message: 'Certificate removed successfully.' });
  } catch (err) {
    console.error('Delete certificate error:', err);
    return res.status(500).json({ error: `Failed to remove certificate: ${err.message}` });
  }
});

router.post('/achievements', async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    const item = await createAchievement(req.body);
    return res.status(201).json(item);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create achievement.' });
  }
});

router.put('/achievements/:id', async (req, res) => {
  try {
    const updated = await updateAchievement(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update achievement.' });
  }
});

router.delete('/achievements/:id', async (req, res) => {
  try {
    const achievements = await getAllAchievements();
    const ach = achievements.find((a) => String(a.id) === String(req.params.id));
    if (ach && ach.certificate_url) {
      const storagePath = extractStoragePathFromUrl(ach.certificate_url, 'certificates');
      if (storagePath) {
        await deleteFromStorage('certificates', storagePath);
      }
    }
    const result = await deleteAchievement(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete achievement.' });
  }
});

router.post('/achievements/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderAchievements(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder achievements.' });
  }
});
router.patch('/achievements/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderAchievements(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder achievements.' });
  }
});

// ================= EDUCATION CRUD =================
router.get('/education', async (req, res) => {
  try {
    const list = await getAllEducation();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch education.' });
  }
});

router.post('/education', async (req, res) => {
  try {
    if (!req.body.institution || !req.body.degree) {
      return res.status(400).json({ error: 'Institution and degree are required.' });
    }
    const item = await createEducation(req.body);
    return res.status(201).json(item);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create education.' });
  }
});

router.put('/education/:id', async (req, res) => {
  try {
    const updated = await updateEducation(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update education.' });
  }
});

router.delete('/education/:id', async (req, res) => {
  try {
    const result = await deleteEducation(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete education.' });
  }
});

router.post('/education/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderEducation(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder education.' });
  }
});
router.patch('/education/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderEducation(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder education.' });
  }
});

// ================= CERTIFICATIONS CRUD =================
router.get('/certifications', async (req, res) => {
  try {
    const list = await getAllCertifications();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch certifications.' });
  }
});

router.post('/certifications', async (req, res) => {
  try {
    if (!req.body.name || (!req.body.organization && !req.body.issuer)) {
      return res.status(400).json({ error: 'Certification name and organization are required.' });
    }
    const item = await createCertification(req.body);
    return res.status(201).json(item);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create certification.' });
  }
});

router.put('/certifications/:id', async (req, res) => {
  try {
    const updated = await updateCertification(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update certification.' });
  }
});

router.delete('/certifications/:id', async (req, res) => {
  try {
    const result = await deleteCertification(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete certification.' });
  }
});

router.post('/certifications/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderCertifications(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder certifications.' });
  }
});
router.patch('/certifications/reorder', async (req, res) => {
  try {
    const orderList = req.body.order || req.body.orderedIds || req.body;
    const updated = await reorderCertifications(orderList);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reorder certifications.' });
  }
});

// ================= RESUMES MANAGEMENT =================
router.get('/resumes', async (req, res) => {
  try {
    const list = await getAllResumes();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch resumes.' });
  }
});

router.post('/resumes/upload', uploadResume.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const setAsActive = req.body.set_active === 'true' || req.body.set_active === true;
    const cleanFilename = sanitizeFilename(req.file.originalname);
    const storagePath = `resumes/${cleanFilename}`;

    // Upload in-memory buffer directly to Supabase Storage bucket 'resumes'
    const { publicUrl } = await uploadToStorage('resumes', cleanFilename, req.file.buffer, 'application/pdf');

    const newResume = await createResume({
      filename: cleanFilename,
      original_filename: req.file.originalname,
      storage_path: storagePath,
      storage_url: publicUrl,
      file_size: req.file.size,
      set_active: setAsActive,
    });

    return res.status(201).json(newResume);
  } catch (err) {
    console.error('Resume upload error:', err);
    return res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

router.put('/resumes/:id/activate', async (req, res) => {
  try {
    const result = await activateResumeById(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to activate resume.' });
  }
});

router.get('/resumes/:id/download', async (req, res) => {
  try {
    const list = await getAllResumes();
    const resume = list.find((r) => String(r.id) === String(req.params.id));
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.original_filename || 'Amisha_pandey_Resume.pdf'}"`);

    if (resume.storage_path) {
      try {
        const cleanPath = resume.storage_path.replace(/^resumes\//, '');
        const buf = await downloadFromStorage('resumes', cleanPath);
        if (buf) return res.send(buf);
      } catch (e) {
        console.warn('downloadFromStorage error, trying url fallback:', e.message);
      }
    }

    if (resume.storage_url && resume.storage_url.startsWith('http')) {
      const response = await fetch(resume.storage_url);
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuf));
      }
    }

    return res.status(404).json({ error: 'Resume file unavailable.' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to download resume.' });
  }
});

router.delete('/resumes/:id', async (req, res) => {
  try {
    const result = await deleteResumeById(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to delete resume.' });
  }
});

// ================= MEDIA MANAGEMENT =================
router.get('/media', async (req, res) => {
  try {
    const list = await getAllMedia();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch media.' });
  }
});

router.post('/media/upload', uploadMedia.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const cleanFilename = sanitizeFilename(req.file.originalname);
    const mimeType = req.file.mimetype || 'image/jpeg';
    
    // Choose appropriate Supabase Storage bucket based on file type / alt_text
    let bucket = 'portfolio-media';
    const alt = (req.body.alt_text || '').toLowerCase();
    if (mimeType === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
      if (alt.includes('certificate')) {
        bucket = 'certificates';
      } else if (alt.includes('report') || alt.includes('internship') || alt.includes('experience')) {
        bucket = 'experience-reports';
      }
    }

    let folder = 'media/';
    if (alt.includes('profile') || alt.includes('avatar') || alt.includes('about')) {
      folder = 'profile/';
    } else if (alt.includes('education') || alt.includes('institution') || alt.includes('logo')) {
      folder = 'education/';
    }

    const storagePath = `${bucket === 'portfolio-media' ? folder : ''}${cleanFilename}`;
    const { publicUrl } = await uploadToStorage(bucket, storagePath, req.file.buffer, mimeType);

    const newMedia = await createMedia({
      filename: cleanFilename,
      original_filename: req.file.originalname,
      storage_path: `${bucket}/${storagePath}`,
      storage_url: publicUrl,
      mime_type: mimeType,
      file_size: req.file.size,
      alt_text: req.body.alt_text || req.file.originalname,
    });

    return res.status(201).json({
      success: true,
      storage_url: publicUrl,
      storage_path: `${bucket}/${storagePath}`,
      url: publicUrl,
      ...newMedia,
    });
  } catch (err) {
    console.error('Media upload error:', err);
    return res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

router.delete('/media/:id', async (req, res) => {
  try {
    const result = await deleteMediaById(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete media.' });
  }
});

// ================= CONTACT MESSAGES & SMTP =================
router.get('/smtp-status', (req, res) => {
  res.json({
    success: true,
    data: getSmtpStatus(),
  });
});

router.post('/smtp-test', async (req, res) => {
  if (!isSmtpConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured on the server environment.',
    });
  }

  const result = await verifySmtpConnection();
  if (result.success) {
    return res.json({ success: true, message: result.message });
  } else {
    return res.status(502).json({ success: false, error: result.error });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const msgs = await getAllMessages();
    return res.json(msgs);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

router.put('/messages/:id/read', async (req, res) => {
  try {
    const isRead = req.body?.is_read !== undefined ? Boolean(req.body.is_read) : true;
    const updated = await markMessageRead(req.params.id, isRead);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update message read state.' });
  }
});

router.post('/messages/:id/reply', async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, error: 'Reply text cannot be empty.' });
    }

    const messages = await getAllMessages();
    const msg = messages.find((m) => String(m.id) === String(req.params.id));
    if (!msg) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    if (!msg.email || !msg.email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Original sender does not have a valid email address.' });
    }

    if (!isSmtpConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Unable to send email: SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured on the server environment. Please set them in your environment variables.',
      });
    }

    // Attempt SMTP send
    try {
      await sendAdminReplyEmail({
        to: msg.email,
        recipientName: msg.name,
        originalSubject: msg.subject,
        replyText: reply.trim(),
      });
    } catch (mailErr) {
      console.error('[MAIL] Delivery error:', mailErr.message);
      return res.status(502).json({
        success: false,
        error: `Unable to send email: ${mailErr.message}`,
      });
    }

    // ONLY mark as replied after email provider accepts message
    const updatedMsg = await markMessageReplied(req.params.id, reply.trim());

    return res.json({
      success: true,
      message: `Reply email sent successfully to ${msg.email}.`,
      data: updatedMsg,
    });
  } catch (err) {
    console.error('Error in message reply endpoint:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to send reply.' });
  }
});

router.delete('/messages/:id', async (req, res) => {
  try {
    await deleteMessageById(req.params.id);
    return res.json({ success: true, message: 'Message permanently deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete message.' });
  }
});

export default router;
