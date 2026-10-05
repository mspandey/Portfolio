import { supabase, getSupabase, isSupabaseConfigured, uploadToStorage, downloadFromStorage, deleteFromStorage } from './supabase.js';
import db from './database.js';

/**
 * Universal Data Service
 * 
 * Provides unified, fail-safe CMS and Public operations.
 * Supabase (PostgreSQL tables + Cloud Storage JSON state) serves as the persistent
 * single source of truth across all serverless instances and deployments.
 */

// Helper: Safely parse JSON strings or return array/object
function safeParseJson(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// In-memory cache synced with Supabase Cloud
let cmsCache = null;
let lastSyncTimestamp = 0;
const CACHE_TTL_MS = 5000; // 5 seconds fresh cache per instance

/**
 * Load initial default data from SQLite backing store
 */
function getInitialLocalState() {
  const siteSettings = db.prepare('SELECT * FROM site_settings LIMIT 1').get() || {};
  const heroSettings = db.prepare('SELECT * FROM hero_settings LIMIT 1').get() || {};
  const aboutSettings = db.prepare('SELECT * FROM about_settings LIMIT 1').get() || {};
  const sections = db.prepare('SELECT * FROM sections ORDER BY display_order ASC').all() || [];
  const projects = db.prepare('SELECT * FROM projects ORDER BY display_order ASC').all() || [];
  const experiences = db.prepare('SELECT * FROM experiences ORDER BY display_order ASC').all() || [];
  const skills = db.prepare('SELECT * FROM skills ORDER BY display_order ASC').all() || [];
  const achievements = db.prepare('SELECT * FROM achievements ORDER BY display_order ASC').all() || [];
  const education = db.prepare('SELECT * FROM education ORDER BY display_order ASC').all() || [];
  const certifications = db.prepare('SELECT * FROM certifications ORDER BY display_order ASC').all() || [];
  const resumes = db.prepare('SELECT * FROM resumes ORDER BY version DESC, uploaded_at DESC').all() || [];
  const media = db.prepare('SELECT * FROM media ORDER BY created_at DESC').all() || [];
  
  const msgTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contact_messages'").get() ? 'contact_messages' : 'messages';
  let messages = [];
  try {
    messages = db.prepare(`SELECT * FROM ${msgTable} ORDER BY created_at DESC`).all() || [];
  } catch {}

  return {
    site_settings: siteSettings,
    hero_settings: heroSettings,
    about_settings: aboutSettings,
    sections: sections.map((s) => ({ ...s, content_json: safeParseJson(s.content_json, {}) })),
    projects: projects.map((p) => ({
      ...p,
      gallery: safeParseJson(p.gallery_json || p.gallery, []),
      technologies: safeParseJson(p.technologies_json || p.technologies, []),
    })),
    experiences: experiences.map((e) => ({
      ...e,
      responsibilities: safeParseJson(e.responsibilities_json || e.responsibilities, []),
      technologies: safeParseJson(e.technologies_json || e.technologies, []),
    })),
    skills: skills || [],
    achievements: achievements || [],
    education: education.map((ed) => ({
      ...ed,
      achievements: safeParseJson(ed.achievements_json || ed.achievements, []),
    })),
    certifications: certifications || [],
    resumes: resumes || [],
    media: media || [],
    messages: messages || [],
    last_updated: new Date().toISOString(),
  };
}

/**
 * Fetch authoritative CMS state from Supabase Cloud
 */
export async function getCmsState(forceRefresh = false) {
  const now = Date.now();
  if (cmsCache && !forceRefresh && (now - lastSyncTimestamp < CACHE_TTL_MS)) {
    return cmsCache;
  }

  // 1. Try reading from Supabase Storage cloud state
  if (isSupabaseConfigured()) {
    try {
      const buffer = await downloadFromStorage('portfolio-media', 'cms-data/cms_state.json');
      if (buffer && buffer.length > 0) {
        const cloudState = JSON.parse(buffer.toString('utf8'));
        if (cloudState && cloudState.sections && cloudState.sections.length > 0) {
          if (Array.isArray(cloudState.projects)) {
            let orderChanged = false;
            cloudState.projects.forEach((p, idx) => {
              if (p.display_order === undefined || p.display_order === null) {
                p.display_order = idx + 1;
                orderChanged = true;
              }
            });
            if (orderChanged) {
              saveCmsState(cloudState).catch(() => {});
            }
          }
          cmsCache = cloudState;
          lastSyncTimestamp = now;
          return cmsCache;
        }
      }
    } catch (storageErr) {
      // Not yet created in cloud storage
    }
  }

  // 2. Fallback to Local Initial Seed & Sync to Cloud
  const localState = getInitialLocalState();
  cmsCache = localState;
  lastSyncTimestamp = now;

  if (isSupabaseConfigured()) {
    try {
      const stateBuffer = Buffer.from(JSON.stringify(localState, null, 2), 'utf8');
      await uploadToStorage('portfolio-media', 'cms-data/cms_state.json', stateBuffer, 'application/json');
    } catch (syncErr) {
      console.warn('Initial cloud state push note:', syncErr.message);
    }
  }

  return cmsCache;
}

/**
 * Persist updated CMS state to Supabase Cloud & Local DB
 */
export async function saveCmsState(state) {
  state.last_updated = new Date().toISOString();
  cmsCache = state;
  lastSyncTimestamp = Date.now();

  if (isSupabaseConfigured()) {
    try {
      const stateBuffer = Buffer.from(JSON.stringify(state, null, 2), 'utf8');
      await uploadToStorage('portfolio-media', 'cms-data/cms_state.json', stateBuffer, 'application/json');
    } catch (err) {
      console.error('Failed to persist CMS state to Supabase Storage:', err.message);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. PUBLIC PORTFOLIO DATA
// ══════════════════════════════════════════════════════════════════════════════

export async function getPublicPortfolioData() {
  const state = await getCmsState();
  const visibleSections = (state.sections || [])
    .filter((s) => Boolean(s.is_visible))
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

  const visibleProjects = (state.projects || [])
    .filter((p) => Boolean(p.is_visible))
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    .map((p) => ({
      ...p,
      gallery: safeParseJson(p.gallery || p.gallery_json, []),
      technologies: safeParseJson(p.technologies || p.technologies_json, []),
    }));

  const visibleExperiences = (state.experiences || [])
    .filter((e) => Boolean(e.is_visible))
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    .map((e) => ({
      ...e,
      responsibilities: safeParseJson(e.responsibilities || e.responsibilities_json, []),
      technologies: safeParseJson(e.technologies || e.technologies_json, []),
    }));

  const visibleSkills = (state.skills || [])
    .filter((s) => Boolean(s.is_visible))
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

  const visibleAchievements = (state.achievements || [])
    .filter((a) => Boolean(a.is_visible))
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

  const visibleEducation = (state.education || [])
    .filter((ed) => Boolean(ed.is_visible))
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    .map((ed) => ({
      ...ed,
      achievements: safeParseJson(ed.achievements || ed.achievements_json, []),
    }));

  const visibleCertifications = (state.certifications || [])
    .filter((c) => Boolean(c.is_visible))
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

  const activeResume = (state.resumes || []).find((r) => Boolean(r.is_active)) || null;

  return {
    siteSettings: state.site_settings || {},
    heroSettings: state.hero_settings || {},
    aboutSettings: state.about_settings || {},
    sections: visibleSections,
    projects: visibleProjects,
    experiences: visibleExperiences,
    skills: visibleSkills,
    achievements: visibleAchievements,
    education: visibleEducation,
    certifications: visibleCertifications,
    activeResume,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. ACTIVE RESUME
// ══════════════════════════════════════════════════════════════════════════════

export async function getActiveResume() {
  const state = await getCmsState();
  return (state.resumes || []).find((r) => Boolean(r.is_active)) || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. SETTINGS (SITE, HERO, ABOUT)
// ══════════════════════════════════════════════════════════════════════════════

export async function getSiteSettings() {
  const state = await getCmsState();
  return state.site_settings || {};
}

export async function updateSiteSettings(updates) {
  const state = await getCmsState(true);
  state.site_settings = {
    ...state.site_settings,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.site_settings;
}

export async function getHeroSettings() {
  const state = await getCmsState();
  return state.hero_settings || {};
}

export async function updateHeroSettings(updates) {
  const state = await getCmsState(true);
  state.hero_settings = {
    ...state.hero_settings,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.hero_settings;
}

export async function getAboutSettings() {
  const state = await getCmsState();
  return state.about_settings || {};
}

export async function updateAboutSettings(updates) {
  const state = await getCmsState(true);
  state.about_settings = {
    ...state.about_settings,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.about_settings;
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. SECTIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllSections() {
  const state = await getCmsState();
  return [...(state.sections || [])].sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
}

export async function createSection(data) {
  const state = await getCmsState(true);
  const maxOrder = state.sections.reduce((max, s) => Math.max(max, Number(s.display_order) || 0), 0);
  const newSection = {
    id: Date.now(),
    slug: (data.slug || data.name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    name: data.name,
    type: data.type || 'custom',
    heading: data.heading || '',
    subheading: data.subheading || '',
    content: data.content || '',
    content_json: safeParseJson(data.content_json, {}),
    image: data.image || '',
    video: data.video || '',
    display_order: maxOrder + 1,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    is_locked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  state.sections.push(newSection);
  await saveCmsState(state);
  return newSection;
}

export async function updateSection(id, updates) {
  const state = await getCmsState(true);
  const index = state.sections.findIndex((s) => String(s.id) === String(id) || s.slug === String(id));
  if (index === -1) throw new Error(`Section not found with ID ${id}`);

  state.sections[index] = {
    ...state.sections[index],
    ...updates,
    is_visible: updates.is_visible !== undefined ? Boolean(updates.is_visible) : state.sections[index].is_visible,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.sections[index];
}

export async function deleteSection(id) {
  const state = await getCmsState(true);
  const target = state.sections.find((s) => String(s.id) === String(id) || s.slug === String(id));
  if (target && target.is_locked) {
    throw new Error('System core sections cannot be deleted. You can hide them instead.');
  }
  state.sections = state.sections.filter((s) => String(s.id) !== String(id) && s.slug !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

export async function reorderSections(orderList) {
  const state = await getCmsState(true);
  orderList.forEach((item, index) => {
    const id = typeof item === 'object' && item !== null ? item.id : item;
    const order = typeof item === 'object' && item !== null && item.display_order !== undefined
      ? Number(item.display_order)
      : (typeof item === 'object' && item !== null && item.sort_order !== undefined ? Number(item.sort_order) : index + 1);

    const s = state.sections.find((sec) => String(sec.id) === String(id) || sec.slug === String(id));
    if (s) {
      s.display_order = order;
      s.updated_at = new Date().toISOString();
    }
  });
  await saveCmsState(state);
  return getAllSections();
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. PROJECTS
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllProjects() {
  const state = await getCmsState();
  return [...(state.projects || [])]
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    .map((p) => ({
      ...p,
      gallery: safeParseJson(p.gallery || p.gallery_json, []),
      technologies: safeParseJson(p.technologies || p.technologies_json, []),
    }));
}

export async function createProject(data) {
  const state = await getCmsState(true);
  const maxOrder = state.projects.reduce((max, p) => Math.max(max, Number(p.display_order) || 0), 0);
  const newProject = {
    id: Date.now(),
    slug: (data.slug || data.title || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    title: data.title,
    short_description: data.short_description || '',
    description: data.description || '',
    image: data.image || '',
    video: data.video || '',
    gallery: safeParseJson(data.gallery || data.gallery_json, []),
    technologies: safeParseJson(data.technologies || data.technologies_json, []),
    github_url: data.github_url || '',
    live_url: data.live_url || data.demo_url || '',
    demo_url: data.demo_url || data.live_url || '',
    achievement: data.achievement || '',
    category: data.category !== undefined && data.category !== null ? String(data.category).trim() : '',
    project_date: data.project_date || '2026',
    is_featured: Boolean(data.is_featured),
    display_order: maxOrder + 1,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.projects.push(newProject);
  await saveCmsState(state);
  return newProject;
}

export async function updateProject(id, updates) {
  const state = await getCmsState(true);
  const index = state.projects.findIndex((p) => String(p.id) === String(id) || p.slug === String(id));
  if (index === -1) throw new Error(`Project not found with ID ${id}`);

  const categoryUpdate = updates.category !== undefined
    ? (updates.category !== null ? String(updates.category).trim() : '')
    : state.projects[index].category;

  state.projects[index] = {
    ...state.projects[index],
    ...updates,
    category: categoryUpdate,
    gallery: updates.gallery ? safeParseJson(updates.gallery) : state.projects[index].gallery,
    technologies: updates.technologies ? safeParseJson(updates.technologies) : state.projects[index].technologies,
    is_visible: updates.is_visible !== undefined ? Boolean(updates.is_visible) : state.projects[index].is_visible,
    is_featured: updates.is_featured !== undefined ? Boolean(updates.is_featured) : state.projects[index].is_featured,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.projects[index];
}

export async function duplicateProject(id) {
  const state = await getCmsState(true);
  const orig = state.projects.find((p) => String(p.id) === String(id));
  if (!orig) throw new Error(`Project not found with ID ${id}`);

  const maxOrder = state.projects.reduce((max, p) => Math.max(max, Number(p.display_order) || 0), 0);
  const dup = {
    ...orig,
    id: Date.now(),
    title: `${orig.title} (Copy)`,
    slug: `${orig.slug}-copy-${Date.now()}`,
    display_order: maxOrder + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.projects.push(dup);
  await saveCmsState(state);
  return dup;
}

export async function deleteProject(id) {
  const state = await getCmsState(true);
  state.projects = state.projects.filter((p) => String(p.id) !== String(id) && p.slug !== String(id));

  // Maintain clean sequential ordering on deletion (1..N)
  state.projects.sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
  state.projects.forEach((p, idx) => {
    p.display_order = idx + 1;
  });

  await saveCmsState(state);

  // Sync delete and renumbering to Supabase PostgreSQL if configured
  if (isSupabaseConfigured()) {
    try {
      const supa = getSupabase();
      if (supa) {
        await supa.from('projects').delete().or(`id.eq.${id},slug.eq.${id}`);
        for (const p of state.projects) {
          await supa.from('projects').update({ display_order: p.display_order }).or(`id.eq.${p.id},slug.eq.${p.slug}`);
        }
      }
    } catch (supaErr) {
      console.warn('Supabase DB delete project sync note:', supaErr.message);
    }
  }

  // Sync to SQLite if present
  if (db) {
    try {
      db.prepare('DELETE FROM projects WHERE id = ? OR slug = ?').run(id, id);
      const updateStmt = db.prepare('UPDATE projects SET display_order = ? WHERE id = ? OR slug = ?');
      for (const p of state.projects) {
        updateStmt.run(p.display_order, p.id, p.slug);
      }
    } catch (dbErr) {
      console.warn('SQLite delete project sync note:', dbErr.message);
    }
  }

  return { success: true, id };
}

export async function reorderProjects(orderList) {
  const state = await getCmsState(true);

  if (Array.isArray(orderList)) {
    orderList.forEach((item, index) => {
      const id = typeof item === 'object' && item !== null ? item.id : item;
      const order = typeof item === 'object' && item !== null && item.display_order !== undefined
        ? Number(item.display_order)
        : index + 1;

      const p = state.projects.find((proj) => String(proj.id) === String(id) || proj.slug === String(id));
      if (p) {
        p.display_order = order;
        p.updated_at = new Date().toISOString();
      }
    });
  }

  // Strictly sort state.projects in place by display_order
  state.projects.sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

  // Guarantee clean, sequential 1..N order with no gaps or duplicates
  state.projects.forEach((p, idx) => {
    p.display_order = idx + 1;
  });

  await saveCmsState(state);

  // Sync display_order to Supabase PostgreSQL table if configured
  if (isSupabaseConfigured()) {
    try {
      const supa = getSupabase();
      if (supa) {
        for (const p of state.projects) {
          await supa
            .from('projects')
            .update({ display_order: p.display_order, updated_at: new Date().toISOString() })
            .or(`id.eq.${p.id},slug.eq.${p.slug}`);
        }
      }
    } catch (supaErr) {
      console.warn('Supabase DB reorder projects sync note:', supaErr.message);
    }
  }

  // Sync display_order to local SQLite if present
  if (db) {
    try {
      const stmt = db.prepare('UPDATE projects SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR slug = ?');
      for (const p of state.projects) {
        stmt.run(p.display_order, p.id, p.slug);
      }
    } catch (dbErr) {
      console.warn('SQLite reorder projects sync note:', dbErr.message);
    }
  }

  return getAllProjects();
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. EXPERIENCES
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllExperiences() {
  const state = await getCmsState();
  return [...(state.experiences || [])]
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    .map((e) => ({
      ...e,
      responsibilities: safeParseJson(e.responsibilities || e.responsibilities_json, []),
      technologies: safeParseJson(e.technologies || e.technologies_json, []),
    }));
}

export async function createExperience(data) {
  const state = await getCmsState(true);
  const maxOrder = state.experiences.reduce((max, e) => Math.max(max, Number(e.display_order) || 0), 0);
  const newExp = {
    id: Date.now(),
    company: data.company,
    role: data.role,
    location: data.location || '',
    start_date: data.start_date || '',
    end_date: data.is_current ? 'Present' : (data.end_date || ''),
    is_current: Boolean(data.is_current),
    description: data.description || '',
    responsibilities: safeParseJson(data.responsibilities || data.responsibilities_json, []),
    technologies: safeParseJson(data.technologies || data.technologies_json, []),
    logo: data.logo || data.company_logo_url || '',
    company_url: data.company_url || data.company_website || '',
    company_website: data.company_url || data.company_website || '',
    report_url: data.report_url || '',
    report_path: data.report_path || data.report_storage_path || '',
    display_order: maxOrder + 1,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.experiences.push(newExp);
  await saveCmsState(state);
  return newExp;
}

export async function updateExperience(id, updates) {
  const state = await getCmsState(true);
  const index = state.experiences.findIndex((e) => String(e.id) === String(id));
  if (index === -1) throw new Error(`Experience not found with ID ${id}`);

  state.experiences[index] = {
    ...state.experiences[index],
    ...updates,
    responsibilities: updates.responsibilities ? safeParseJson(updates.responsibilities) : state.experiences[index].responsibilities,
    technologies: updates.technologies ? safeParseJson(updates.technologies) : state.experiences[index].technologies,
    is_visible: updates.is_visible !== undefined ? Boolean(updates.is_visible) : state.experiences[index].is_visible,
    is_current: updates.is_current !== undefined ? Boolean(updates.is_current) : state.experiences[index].is_current,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.experiences[index];
}

export async function deleteExperience(id) {
  const state = await getCmsState(true);
  state.experiences = state.experiences.filter((e) => String(e.id) !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

export async function reorderExperiences(orderList) {
  const state = await getCmsState(true);
  orderList.forEach((item, index) => {
    const id = typeof item === 'object' && item !== null ? item.id : item;
    const order = typeof item === 'object' && item !== null && item.display_order !== undefined
      ? Number(item.display_order)
      : index + 1;

    const e = state.experiences.find((exp) => String(exp.id) === String(id));
    if (e) {
      e.display_order = order;
      e.updated_at = new Date().toISOString();
    }
  });
  await saveCmsState(state);
  return getAllExperiences();
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. SKILLS
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllSkills() {
  const state = await getCmsState();
  return [...(state.skills || [])].sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
}

export async function createSkill(data) {
  const state = await getCmsState(true);
  const maxOrder = state.skills.reduce((max, s) => Math.max(max, Number(s.display_order) || 0), 0);
  const newSkill = {
    id: Date.now(),
    name: data.name,
    category: data.category || 'General',
    icon: data.icon || '',
    proficiency: Number(data.proficiency) || 90,
    description: data.description || '',
    display_order: maxOrder + 1,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.skills.push(newSkill);
  await saveCmsState(state);
  return newSkill;
}

export async function updateSkill(id, updates) {
  const state = await getCmsState(true);
  const index = state.skills.findIndex((s) => String(s.id) === String(id));
  if (index === -1) throw new Error(`Skill not found with ID ${id}`);

  state.skills[index] = {
    ...state.skills[index],
    ...updates,
    is_visible: updates.is_visible !== undefined ? Boolean(updates.is_visible) : state.skills[index].is_visible,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.skills[index];
}

export async function deleteSkill(id) {
  const state = await getCmsState(true);
  state.skills = state.skills.filter((s) => String(s.id) !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

export async function reorderSkills(orderList) {
  const state = await getCmsState(true);
  orderList.forEach((item, index) => {
    const id = typeof item === 'object' && item !== null ? item.id : item;
    const order = typeof item === 'object' && item !== null && item.display_order !== undefined
      ? Number(item.display_order)
      : index + 1;

    const s = state.skills.find((sk) => String(sk.id) === String(id));
    if (s) {
      s.display_order = order;
      s.updated_at = new Date().toISOString();
    }
  });
  await saveCmsState(state);
  return getAllSkills();
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. ACHIEVEMENTS
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllAchievements() {
  const state = await getCmsState();
  return [...(state.achievements || [])].sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
}

export async function createAchievement(data) {
  const state = await getCmsState(true);
  const maxOrder = state.achievements.reduce((max, a) => Math.max(max, Number(a.display_order) || 0), 0);
  const newAch = {
    id: Date.now(),
    title: data.title,
    organization: data.organization || '',
    year: data.year || '',
    description: data.description || '',
    rank_result: data.rank_result || '',
    participant_count: data.participant_count || '',
    certificate_url: data.certificate_url || '',
    external_url: data.external_url || '',
    image: data.image || '',
    display_order: maxOrder + 1,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.achievements.push(newAch);
  await saveCmsState(state);
  return newAch;
}

export async function updateAchievement(id, updates) {
  const state = await getCmsState(true);
  const index = state.achievements.findIndex((a) => String(a.id) === String(id));
  if (index === -1) throw new Error(`Achievement not found with ID ${id}`);

  state.achievements[index] = {
    ...state.achievements[index],
    ...updates,
    is_visible: updates.is_visible !== undefined ? Boolean(updates.is_visible) : state.achievements[index].is_visible,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.achievements[index];
}

export async function deleteAchievement(id) {
  const state = await getCmsState(true);
  state.achievements = state.achievements.filter((a) => String(a.id) !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

export async function reorderAchievements(orderList) {
  const state = await getCmsState(true);
  orderList.forEach((item, index) => {
    const id = typeof item === 'object' && item !== null ? item.id : item;
    const order = typeof item === 'object' && item !== null && item.display_order !== undefined
      ? Number(item.display_order)
      : index + 1;

    const a = state.achievements.find((ach) => String(ach.id) === String(id));
    if (a) {
      a.display_order = order;
      a.updated_at = new Date().toISOString();
    }
  });
  await saveCmsState(state);
  return getAllAchievements();
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. EDUCATION
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllEducation() {
  const state = await getCmsState();
  return [...(state.education || [])]
    .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    .map((ed) => ({
      ...ed,
      start_date: ed.start_date || ed.start_year || '',
      end_date: ed.end_date || ed.end_year || '',
      start_year: ed.start_year || ed.start_date || '',
      end_year: ed.end_year || ed.end_date || '',
      institution_url: ed.institution_url || ed.url || '',
      url: ed.url || ed.institution_url || '',
      logo_url: ed.logo_url || ed.logo || '',
      logo: ed.logo || ed.logo_url || '',
      achievements: safeParseJson(ed.achievements || ed.achievements_json, []),
    }));
}

export async function createEducation(data) {
  const state = await getCmsState(true);
  const maxOrder = state.education.reduce((max, ed) => Math.max(max, Number(ed.display_order) || 0), 0);
  const sDate = data.start_date || data.start_year || '';
  const eDate = data.is_current ? 'Present' : (data.end_date || data.end_year || '');
  const sLogo = data.logo_url || data.logo || '';
  const sUrl = data.institution_url || data.url || '';

  const newEd = {
    id: Date.now(),
    institution: data.institution,
    degree: data.degree,
    field: data.field || '',
    start_date: sDate,
    end_date: eDate,
    start_year: sDate,
    end_year: eDate,
    is_current: Boolean(data.is_current),
    short_description: data.short_description || '',
    description: data.description || '',
    achievements: safeParseJson(data.achievements || data.achievements_json, []),
    logo: sLogo,
    logo_url: sLogo,
    url: sUrl,
    institution_url: sUrl,
    display_order: maxOrder + 1,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.education.push(newEd);
  await saveCmsState(state);
  return newEd;
}

export async function updateEducation(id, updates) {
  const state = await getCmsState(true);
  const index = state.education.findIndex((ed) => String(ed.id) === String(id));
  if (index === -1) throw new Error(`Education entry not found with ID ${id}`);

  const sDate = updates.start_date || updates.start_year || state.education[index].start_date;
  const eDate = updates.is_current ? 'Present' : (updates.end_date || updates.end_year || state.education[index].end_date);
  const sLogo = updates.logo_url || updates.logo || state.education[index].logo;
  const sUrl = updates.institution_url || updates.url || state.education[index].url;

  state.education[index] = {
    ...state.education[index],
    ...updates,
    start_date: sDate,
    end_date: eDate,
    start_year: sDate,
    end_year: eDate,
    logo: sLogo,
    logo_url: sLogo,
    url: sUrl,
    institution_url: sUrl,
    achievements: updates.achievements ? safeParseJson(updates.achievements) : state.education[index].achievements,
    is_visible: updates.is_visible !== undefined ? Boolean(updates.is_visible) : state.education[index].is_visible,
    is_current: updates.is_current !== undefined ? Boolean(updates.is_current) : state.education[index].is_current,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.education[index];
}

export async function deleteEducation(id) {
  const state = await getCmsState(true);
  state.education = state.education.filter((ed) => String(ed.id) !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

export async function reorderEducation(orderList) {
  const state = await getCmsState(true);
  orderList.forEach((item, index) => {
    const id = typeof item === 'object' && item !== null ? item.id : item;
    const order = typeof item === 'object' && item !== null && item.display_order !== undefined
      ? Number(item.display_order)
      : index + 1;

    const ed = state.education.find((e) => String(e.id) === String(id));
    if (ed) {
      ed.display_order = order;
      ed.updated_at = new Date().toISOString();
    }
  });
  await saveCmsState(state);
  return getAllEducation();
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. CERTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllCertifications() {
  const state = await getCmsState();
  return [...(state.certifications || [])].sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
}

export async function createCertification(data) {
  const state = await getCmsState(true);
  const maxOrder = state.certifications.reduce((max, c) => Math.max(max, Number(c.display_order) || 0), 0);
  const newCert = {
    id: Date.now(),
    name: data.name,
    organization: data.organization || data.issuer || '',
    issuer: data.organization || data.issuer || '',
    issue_date: data.issue_date || '',
    expiry_date: data.expiry_date || '',
    credential_id: data.credential_id || '',
    credential_url: data.credential_url || '',
    certificate_file: data.certificate_file || '',
    certificate_url: data.certificate_file || data.certificate_url || '',
    logo: data.logo || '',
    display_order: maxOrder + 1,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.certifications.push(newCert);
  await saveCmsState(state);
  return newCert;
}

export async function updateCertification(id, updates) {
  const state = await getCmsState(true);
  const index = state.certifications.findIndex((c) => String(c.id) === String(id));
  if (index === -1) throw new Error(`Certification not found with ID ${id}`);

  state.certifications[index] = {
    ...state.certifications[index],
    ...updates,
    is_visible: updates.is_visible !== undefined ? Boolean(updates.is_visible) : state.certifications[index].is_visible,
    updated_at: new Date().toISOString(),
  };
  await saveCmsState(state);
  return state.certifications[index];
}

export async function deleteCertification(id) {
  const state = await getCmsState(true);
  state.certifications = state.certifications.filter((c) => String(c.id) !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

export async function reorderCertifications(orderList) {
  const state = await getCmsState(true);
  orderList.forEach((item, index) => {
    const id = typeof item === 'object' && item !== null ? item.id : item;
    const order = typeof item === 'object' && item !== null && item.display_order !== undefined
      ? Number(item.display_order)
      : index + 1;

    const c = state.certifications.find((cert) => String(cert.id) === String(id));
    if (c) {
      c.display_order = order;
      c.updated_at = new Date().toISOString();
    }
  });
  await saveCmsState(state);
  return getAllCertifications();
}

// ══════════════════════════════════════════════════════════════════════════════
// 11. RESUMES
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllResumes() {
  const state = await getCmsState();
  return [...(state.resumes || [])].sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
}

export async function createResume({ filename, original_filename, storage_path, storage_url, file_size, set_active }) {
  const state = await getCmsState(true);
  const maxVersion = state.resumes.reduce((max, r) => Math.max(max, Number(r.version) || 0), 0);
  const nextVersion = maxVersion + 1;
  const makeActive = set_active || state.resumes.length === 0;

  if (makeActive) {
    state.resumes.forEach((r) => { r.is_active = false; });
  }

  const newResume = {
    id: Date.now(),
    filename,
    original_filename: original_filename || filename,
    storage_path,
    storage_url,
    version: nextVersion,
    file_size: Number(file_size) || 0,
    is_active: makeActive,
    uploaded_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  state.resumes.unshift(newResume);
  await saveCmsState(state);
  return newResume;
}

export async function activateResumeById(id) {
  const state = await getCmsState(true);
  const target = state.resumes.find((r) => String(r.id) === String(id));
  if (!target) throw new Error(`Resume not found with ID ${id}`);

  state.resumes.forEach((r) => {
    r.is_active = String(r.id) === String(id);
    r.updated_at = new Date().toISOString();
  });

  await saveCmsState(state);
  return { message: 'Active resume updated.', resumes: getAllResumes() };
}

export async function deleteResumeById(id) {
  const state = await getCmsState(true);
  const target = state.resumes.find((r) => String(r.id) === String(id));
  if (!target) throw new Error(`Resume not found with ID ${id}`);
  if (target.is_active) {
    throw new Error('Cannot delete the active resume. Please activate another version first.');
  }

  // Cleanup from Supabase Storage if path exists
  if (target.storage_path) {
    try {
      const cleanPath = target.storage_path.replace(/^resumes\//, '');
      await deleteFromStorage('resumes', cleanPath);
    } catch (err) {
      console.warn('Storage cleanup note:', err.message);
    }
  }

  state.resumes = state.resumes.filter((r) => String(r.id) !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

// ══════════════════════════════════════════════════════════════════════════════
// 12. MEDIA
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllMedia() {
  const state = await getCmsState();
  return [...(state.media || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function createMedia({ filename, original_filename, storage_path, storage_url, mime_type, file_size, alt_text }) {
  const state = await getCmsState(true);
  const newMedia = {
    id: Date.now(),
    filename,
    original_filename: original_filename || filename,
    storage_path,
    storage_url,
    url: storage_url,
    mime_type: mime_type || 'image/jpeg',
    file_size: Number(file_size) || 0,
    alt_text: alt_text || original_filename || 'Portfolio Media',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  state.media.unshift(newMedia);
  await saveCmsState(state);
  return newMedia;
}

export async function deleteMediaById(id) {
  const state = await getCmsState(true);
  const target = state.media.find((m) => String(m.id) === String(id));
  if (!target) throw new Error(`Media not found with ID ${id}`);

  if (target.storage_path) {
    try {
      const cleanPath = target.storage_path.replace(/^portfolio-media\//, '');
      await deleteFromStorage('portfolio-media', cleanPath);
    } catch (err) {
      console.warn('Media storage cleanup note:', err.message);
    }
  }

  state.media = state.media.filter((m) => String(m.id) !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

// ══════════════════════════════════════════════════════════════════════════════
// 13. MESSAGES (CONTACT & ADMIN)
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllMessages() {
  const state = await getCmsState();
  return [...(state.messages || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function createContactMessage({ name, email, subject, message }) {
  const state = await getCmsState(true);
  const newMsg = {
    id: Date.now(),
    name,
    email,
    subject: subject || '',
    message,
    is_read: false,
    is_replied: false,
    status: 'unread',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.messages.unshift(newMsg);
  await saveCmsState(state);
  return newMsg;
}

export async function markMessageRead(id, isRead = true) {
  const state = await getCmsState(true);
  const msg = state.messages.find((m) => String(m.id) === String(id));
  if (!msg) throw new Error(`Message not found with ID ${id}`);

  msg.is_read = Boolean(isRead);
  msg.updated_at = new Date().toISOString();
  await saveCmsState(state);
  return msg;
}

export async function markMessageReplied(id, replyText) {
  const state = await getCmsState(true);
  const msg = state.messages.find((m) => String(m.id) === String(id));
  if (!msg) throw new Error(`Message not found with ID ${id}`);

  msg.is_replied = true;
  msg.is_read = true;
  msg.status = 'replied';
  msg.reply_message = replyText;
  msg.replied_at = new Date().toISOString();
  msg.updated_at = new Date().toISOString();
  await saveCmsState(state);
  return msg;
}

export async function deleteMessageById(id) {
  const state = await getCmsState(true);
  state.messages = state.messages.filter((m) => String(m.id) !== String(id));
  await saveCmsState(state);
  return { success: true, id };
}

// ══════════════════════════════════════════════════════════════════════════════
// 14. GENERIC TABLE CRUD & REORDER (COMPATIBILITY)
// ══════════════════════════════════════════════════════════════════════════════

export async function getTableRecords(table, { orderBy = 'display_order', ascending = true, filterVisible = false } = {}) {
  const state = await getCmsState();
  const list = state[table] || [];
  let filtered = filterVisible ? list.filter((i) => Boolean(i.is_visible)) : list;
  return [...filtered].sort((a, b) => {
    const valA = a[orderBy] !== undefined ? a[orderBy] : 0;
    const valB = b[orderBy] !== undefined ? b[orderBy] : 0;
    return ascending ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
  });
}
