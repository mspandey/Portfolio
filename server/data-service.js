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

// ══════════════════════════════════════════════════════════════════════════════
// 15. PORTFOLIO ANALYTICS & ENGAGEMENT TRACKING
// ══════════════════════════════════════════════════════════════════════════════

let analyticsEventsCache = null;
let lastAnalyticsSync = 0;
let analyticsSaveTimeout = null;

// Helper: Normalize referrer to friendly name
export function normalizeReferrer(referrer) {
  if (!referrer || typeof referrer !== 'string') return 'Direct';
  try {
    const trimmed = referrer.trim();
    if (!trimmed) return 'Direct';
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('github')) return 'GitHub';
    if (host.includes('google')) return 'Google';
    if (host.includes('t.co') || host.includes('twitter') || host.includes('x.com')) return 'X / Twitter';
    if (host.includes('youtube')) return 'YouTube';
    if (host.includes('facebook') || host.includes('instagram')) return 'Meta / Instagram';
    if (host.includes('reddit')) return 'Reddit';
    if (host.includes('vercel')) return 'Vercel';
    if (host === 'localhost' || host === '127.0.0.1') return 'Direct';
    return host.replace(/^www\./, '');
  } catch {
    return 'Other';
  }
}

async function loadAnalyticsEvents(forceRefresh = false) {
  const now = Date.now();
  if (analyticsEventsCache && !forceRefresh && (now - lastAnalyticsSync < 10000)) {
    return analyticsEventsCache;
  }

  let events = [];

  // 1. Try reading from Supabase Storage
  if (isSupabaseConfigured()) {
    try {
      const buffer = await downloadFromStorage('portfolio-media', 'analytics/events.json');
      if (buffer && buffer.length > 0) {
        const cloudEvents = JSON.parse(buffer.toString('utf8'));
        if (Array.isArray(cloudEvents)) {
          events = cloudEvents;
        }
      }
    } catch (err) {
      // file might not exist yet on fresh deployment
    }
  }

  // 2. If storage empty or offline, check SQLite
  if (events.length === 0 && db) {
    try {
      const rows = db.prepare('SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 5000').all();
      if (rows && rows.length > 0) {
        events = rows.map((r) => ({
          ...r,
          metadata: safeParseJson(r.metadata_json, {}),
        }));
      }
    } catch (sqlErr) {
      // Table may not have been created yet
    }
  }

  analyticsEventsCache = events;
  lastAnalyticsSync = now;
  return analyticsEventsCache;
}

async function flushAnalyticsToStorage() {
  if (!analyticsEventsCache || !isSupabaseConfigured()) return;
  try {
    const payload = JSON.stringify(analyticsEventsCache.slice(0, 5000));
    await uploadToStorage('portfolio-media', 'analytics/events.json', Buffer.from(payload, 'utf8'), 'application/json');
  } catch (err) {
    console.warn('⚠️ Supabase analytics sync note:', err.message);
  }
}

function scheduleAnalyticsFlush() {
  if (analyticsSaveTimeout) clearTimeout(analyticsSaveTimeout);
  analyticsSaveTimeout = setTimeout(() => {
    flushAnalyticsToStorage();
  }, 2000);
}

export async function recordAnalyticsEvent({
  eventType,
  sessionId,
  visitorId,
  pagePath = '/',
  projectId = null,
  projectSlug = '',
  projectTitle = '',
  referrer = '',
  deviceType = 'desktop',
  country = '',
  metadata = {},
}) {
  if (!eventType || !visitorId) {
    throw new Error('Event type and visitor ID are required.');
  }

  const events = await loadAnalyticsEvents();
  const id = `ae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cleanReferrer = String(referrer || '').trim();
  const referrerDomain = normalizeReferrer(cleanReferrer);
  const nowIso = new Date().toISOString();

  // If project title missing but projectId present, look up from CMS projects
  let resolvedTitle = projectTitle;
  if (!resolvedTitle && (projectId || projectSlug)) {
    try {
      const cms = await getCmsState();
      const match = (cms.projects || []).find((p) => String(p.id) === String(projectId) || p.slug === projectSlug);
      if (match) resolvedTitle = match.title;
    } catch {}
  }

  const newEvent = {
    id,
    event_type: eventType,
    session_id: sessionId || visitorId,
    visitor_id: visitorId,
    page_path: pagePath || '/',
    project_id: projectId ? Number(projectId) : null,
    project_slug: projectSlug || '',
    project_title: resolvedTitle || '',
    referrer: cleanReferrer,
    referrer_domain: referrerDomain,
    device_type: ['desktop', 'mobile', 'tablet'].includes(deviceType) ? deviceType : 'desktop',
    country: country || '',
    metadata: metadata || {},
    created_at: nowIso,
  };

  // Add to in-memory events (newest first)
  events.unshift(newEvent);
  if (events.length > 5000) {
    events.length = 5000;
  }

  // Insert into SQLite
  if (db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO analytics_events (
          id, event_type, session_id, visitor_id, page_path,
          project_id, project_slug, project_title, referrer, referrer_domain,
          device_type, country, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        newEvent.id,
        newEvent.event_type,
        newEvent.session_id,
        newEvent.visitor_id,
        newEvent.page_path,
        newEvent.project_id,
        newEvent.project_slug,
        newEvent.project_title,
        newEvent.referrer,
        newEvent.referrer_domain,
        newEvent.device_type,
        newEvent.country,
        JSON.stringify(newEvent.metadata),
        newEvent.created_at
      );
    } catch (e) {
      // Ignore SQLite write error in serverless read-only mode
    }
  }

  // Attempt insert to Supabase Postgres if table exists
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      sb.from('analytics_events').insert({
        id: newEvent.id,
        event_type: newEvent.event_type,
        session_id: newEvent.session_id,
        visitor_id: newEvent.visitor_id,
        page_path: newEvent.page_path,
        project_id: newEvent.project_id,
        project_slug: newEvent.project_slug,
        project_title: newEvent.project_title,
        referrer: newEvent.referrer,
        referrer_domain: newEvent.referrer_domain,
        device_type: newEvent.device_type,
        country: newEvent.country,
        metadata_json: newEvent.metadata,
        created_at: newEvent.created_at,
      }).then(() => {}).catch(() => {});
    } catch {}
  }

  // Schedule storage flush
  scheduleAnalyticsFlush();

  return newEvent;
}

export async function getAnalyticsOverview(period = '7d') {
  const events = await loadAnalyticsEvents(true);
  const now = new Date();
  let cutoff = new Date();

  if (period === 'today') {
    cutoff.setHours(0, 0, 0, 0);
  } else if (period === '30d') {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === '90d') {
    cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else {
    // default: 7d
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const cutoffTime = cutoff.getTime();
  const periodEvents = events.filter((e) => new Date(e.created_at).getTime() >= cutoffTime);

  // Global time windows for top cards
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayTime = startOfToday.getTime();

  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
  const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();

  // Metrics
  const uniqueVisitorSet = new Set();
  const visitorsTodaySet = new Set();
  const visitorsWeekSet = new Set();
  const visitorsMonthSet = new Set();

  let totalViews = 0;
  let resumeDownloads = 0;
  let linkedinClicks = 0;
  let githubClicks = 0;
  let contactSubmissions = 0;
  let projectViewsCount = 0;
  let certificateViews = 0;
  let certificateDownloads = 0;
  let externalClicks = 0;

  // For charts & breakdowns
  const trafficSourcesMap = {};
  const deviceMap = { desktop: 0, mobile: 0, tablet: 0 };
  const countryMap = {};
  const projectMap = {};

  // All events calculate windowed visitors
  events.forEach((e) => {
    const t = new Date(e.created_at).getTime();
    if (t >= startOfTodayTime) visitorsTodaySet.add(e.visitor_id);
    if (t >= startOfWeek) visitorsWeekSet.add(e.visitor_id);
    if (t >= startOfMonth) visitorsMonthSet.add(e.visitor_id);
  });

  // Calculate period specific metrics
  periodEvents.forEach((e) => {
    uniqueVisitorSet.add(e.visitor_id);

    if (e.event_type === 'page_view') {
      totalViews += 1;
    } else if (e.event_type === 'resume_download') {
      resumeDownloads += 1;
    } else if (e.event_type === 'linkedin_click') {
      linkedinClicks += 1;
    } else if (e.event_type === 'github_click') {
      githubClicks += 1;
    } else if (e.event_type === 'contact_submit') {
      contactSubmissions += 1;
    } else if (e.event_type === 'project_view') {
      projectViewsCount += 1;
    } else if (e.event_type === 'certificate_view') {
      certificateViews += 1;
    } else if (e.event_type === 'certificate_download') {
      certificateDownloads += 1;
    } else if (e.event_type === 'external_link_click') {
      externalClicks += 1;
    }

    // Traffic sources
    const source = e.referrer_domain || 'Direct';
    trafficSourcesMap[source] = (trafficSourcesMap[source] || 0) + 1;

    // Devices
    const dev = e.device_type || 'desktop';
    if (deviceMap[dev] !== undefined) {
      deviceMap[dev] += 1;
    } else {
      deviceMap.desktop += 1;
    }

    // Countries
    if (e.country && e.country !== 'Unknown') {
      countryMap[e.country] = (countryMap[e.country] || 0) + 1;
    }

    // Projects
    if (e.project_title || e.project_slug || e.project_id) {
      const projKey = e.project_title || e.project_slug || `Project #${e.project_id}`;
      projectMap[projKey] = (projectMap[projKey] || 0) + 1;
    }
  });

  // Device percentage calculation
  const totalDeviceEvents = deviceMap.desktop + deviceMap.mobile + deviceMap.tablet;
  const deviceBreakdown = {
    desktop: {
      count: deviceMap.desktop,
      percent: totalDeviceEvents > 0 ? Math.round((deviceMap.desktop / totalDeviceEvents) * 100) : 0,
    },
    mobile: {
      count: deviceMap.mobile,
      percent: totalDeviceEvents > 0 ? Math.round((deviceMap.mobile / totalDeviceEvents) * 100) : 0,
    },
    tablet: {
      count: deviceMap.tablet,
      percent: totalDeviceEvents > 0 ? Math.round((deviceMap.tablet / totalDeviceEvents) * 100) : 0,
    },
  };

  // Top Traffic Sources sorted
  const topSources = Object.entries(trafficSourcesMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Top Countries sorted
  const topCountries = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Most Viewed Projects sorted
  const topProjects = Object.entries(projectMap)
    .map(([title, views]) => ({ title, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  // Generate Time-Series Graph Buckets
  const chartData = generateChartData(period, periodEvents, now);

  return {
    period,
    summary: {
      unique_visitors: uniqueVisitorSet.size,
      total_views: totalViews,
      visitors_today: visitorsTodaySet.size,
      visitors_this_week: visitorsWeekSet.size,
      visitors_this_month: visitorsMonthSet.size,
      resume_downloads: resumeDownloads,
      linkedin_clicks: linkedinClicks,
      github_clicks: githubClicks,
      contact_submissions: contactSubmissions,
      project_views: projectViewsCount,
      certificate_views: certificateViews,
      certificate_downloads: certificateDownloads,
    },
    recruiter_signals: {
      resume_downloads: resumeDownloads,
      linkedin_clicks: linkedinClicks,
      github_clicks: githubClicks,
      project_interactions: projectViewsCount + externalClicks,
      contact_submissions: contactSubmissions,
    },
    chart: chartData,
    traffic_sources: topSources,
    device_breakdown: deviceBreakdown,
    countries: topCountries,
    top_projects: topProjects,
    total_events_recorded: periodEvents.length,
    generated_at: new Date().toISOString(),
  };
}

// Generate bucketing for the visual SVG graph
function generateChartData(period, events, now) {
  const buckets = [];

  if (period === 'today') {
    // 24 Hourly buckets
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    for (let h = 0; h < 24; h++) {
      const bucketDate = new Date(startOfDay.getTime() + h * 3600 * 1000);
      const label = `${String(h).padStart(2, '0')}:00`;
      buckets.push({
        label,
        key: label,
        date: bucketDate.toISOString().slice(0, 10),
        visitorsSet: new Set(),
        views: 0,
      });
    }

    events.forEach((e) => {
      const d = new Date(e.created_at);
      const h = d.getHours();
      if (buckets[h]) {
        buckets[h].visitorsSet.add(e.visitor_id);
        if (e.event_type === 'page_view') buckets[h].views += 1;
      }
    });
  } else {
    // Daily buckets (7d, 30d, 90d)
    const numDays = period === '90d' ? 90 : period === '30d' ? 30 : 7;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const bucketMap = {};

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = dayNames[d.getDay()];
      const label = numDays === 7 ? dayName : `${d.getMonth() + 1}/${d.getDate()}`;
      const bucket = {
        label,
        date: dateStr,
        visitorsSet: new Set(),
        views: 0,
      };
      buckets.push(bucket);
      bucketMap[dateStr] = bucket;
    }

    events.forEach((e) => {
      const dateStr = e.created_at.slice(0, 10);
      if (bucketMap[dateStr]) {
        bucketMap[dateStr].visitorsSet.add(e.visitor_id);
        if (e.event_type === 'page_view') bucketMap[dateStr].views += 1;
      }
    });
  }

  // Convert visitorsSet to count
  return buckets.map((b) => ({
    label: b.label,
    date: b.date,
    visitors: b.visitorsSet.size,
    views: b.views,
  }));
}

export async function clearAnalyticsEvents() {
  analyticsEventsCache = [];
  lastAnalyticsSync = Date.now();
  if (db) {
    try {
      db.prepare('DELETE FROM analytics_events').run();
    } catch {}
  }
  if (isSupabaseConfigured()) {
    try {
      await uploadToStorage('portfolio-media', 'analytics/events.json', Buffer.from('[]', 'utf8'), 'application/json');
      const sb = getSupabase();
      await sb.from('analytics_events').delete().neq('id', '');
    } catch {}
  }
  return { success: true };
}

