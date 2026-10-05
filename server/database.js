import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

try {
  // Check if server folder is writable, otherwise use /tmp for serverless runtime
  const isProductionServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dbDir = isProductionServerless ? '/tmp' : __dirname;
  const dbPath = path.join(dbDir, 'portfolio.db');

  db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
  } catch (pragmaErr) {
    // WAL may not be supported on all virtual filesystems
  }
} catch (err) {
  console.warn('⚠️ SQLite initialization note (using in-memory fallback):', err.message);
  try {
    db = new Database(':memory:');
  } catch (memErr) {
    console.warn('⚠️ Memory database note:', memErr.message);
  }
}

// Safely ensure upload directories exist if filesystem is writable
const uploadBase = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) ? '/tmp' : __dirname;
const uploadDirs = [
  path.join(uploadBase, 'uploads'),
  path.join(uploadBase, 'uploads', 'resumes'),
  path.join(uploadBase, 'uploads', 'media'),
  path.join(uploadBase, 'uploads', 'temp'),
];

uploadDirs.forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (dirErr) {
    // Read-only filesystem in serverless production is expected
  }
});

export function initDatabase() {
  if (!db) return;
  try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT 'Amisha Pandey',
      professional_title TEXT DEFAULT 'AI/ML Engineer & Systems Developer',
      tagline TEXT DEFAULT 'Where data meets intelligence.',
      description TEXT DEFAULT 'Building intelligent systems, scalable machine learning models, and high-performance databases.',
      email TEXT DEFAULT 'amisha.pandey@example.com',
      phone TEXT DEFAULT '',
      location TEXT DEFAULT 'India',
      github TEXT DEFAULT 'https://github.com/mspandey',
      linkedin TEXT DEFAULT 'https://linkedin.com/in/amisha-pandey',
      twitter TEXT DEFAULT '',
      instagram TEXT DEFAULT '',
      website TEXT DEFAULT '',
      seo_title TEXT DEFAULT 'Amisha Pandey | Personal Portfolio',
      seo_description TEXT DEFAULT 'Portfolio of Amisha Pandey - AI/ML Engineer, Data Systems & Software Developer.',
      og_image TEXT DEFAULT '',
      favicon TEXT DEFAULT '',
      analytics_id TEXT DEFAULT '',
      custom_css TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS hero_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      greeting TEXT DEFAULT "Hi, I'm",
      name TEXT DEFAULT 'Amisha Pandey',
      tagline TEXT DEFAULT 'Where data meets intelligence.',
      description TEXT DEFAULT 'I work with databases, AI/ML & systems that solve real problems. Building things that think, learn, and work.',
      hero_image TEXT DEFAULT '/character.png',
      hero_video TEXT DEFAULT '/character-scrub.mp4',
      resume_button_label TEXT DEFAULT 'Resume ↗',
      resume_button_visible INTEGER DEFAULT 1,
      talk_button_label TEXT DEFAULT "Let's Talk ↗",
      talk_button_url TEXT DEFAULT '#contact',
      cursor_interaction INTEGER DEFAULT 1,
      eye_tracking INTEGER DEFAULT 1,
      facial_interaction INTEGER DEFAULT 1,
      animation_intensity REAL DEFAULT 1.0,
      overlay_intensity REAL DEFAULT 0.25,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS about_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      heading TEXT DEFAULT 'About Me',
      introduction TEXT DEFAULT 'Passionate about engineering systems that merge machine intelligence with robust backend architectures.',
      biography TEXT DEFAULT 'I specialize in artificial intelligence, machine learning pipelines, database optimization, and high-throughput software systems. My goal is to build software that is not only powerful and efficient but also intuitive and beautifully designed.',
      professional_summary TEXT DEFAULT 'Background in Computer Science & Artificial Intelligence with hands-on experience in full-stack architecture, ML model deployment, and distributed systems.',
      profile_image TEXT DEFAULT '/character.png',
      stats_json TEXT DEFAULT '[{"label":"Years Experience","value":"3+"},{"label":"Projects Built","value":"25+"},{"label":"ML Models Deployed","value":"10+"},{"label":"Articles & Research","value":"5"}]',
      custom_content TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      heading TEXT DEFAULT '',
      subheading TEXT DEFAULT '',
      content TEXT DEFAULT '',
      content_json TEXT DEFAULT '{}',
      image TEXT DEFAULT '',
      video TEXT DEFAULT '',
      display_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      is_locked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      short_description TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      video TEXT DEFAULT '',
      gallery_json TEXT DEFAULT '[]',
      technologies_json TEXT DEFAULT '[]',
      github_url TEXT DEFAULT '',
      demo_url TEXT DEFAULT '',
      achievement TEXT DEFAULT '',
      category TEXT DEFAULT '',
      is_featured INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      project_date TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS experiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      location TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      is_current INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      responsibilities_json TEXT DEFAULT '[]',
      technologies_json TEXT DEFAULT '[]',
      logo TEXT DEFAULT '',
      company_url TEXT DEFAULT '',
      display_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT DEFAULT '',
      proficiency INTEGER DEFAULT 90,
      description TEXT DEFAULT '',
      display_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      organization TEXT DEFAULT '',
      year TEXT DEFAULT '',
      description TEXT DEFAULT '',
      rank_result TEXT DEFAULT '',
      participant_count TEXT DEFAULT '',
      certificate_url TEXT DEFAULT '',
      external_url TEXT DEFAULT '',
      image TEXT DEFAULT '',
      display_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution TEXT NOT NULL,
      degree TEXT NOT NULL,
      field TEXT DEFAULT '',
      start_year TEXT DEFAULT '',
      end_year TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      is_current INTEGER DEFAULT 0,
      short_description TEXT DEFAULT '',
      description TEXT DEFAULT '',
      achievements_json TEXT DEFAULT '[]',
      logo TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      url TEXT DEFAULT '',
      institution_url TEXT DEFAULT '',
      display_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organization TEXT NOT NULL,
      issue_date TEXT DEFAULT '',
      expiry_date TEXT DEFAULT '',
      credential_id TEXT DEFAULT '',
      credential_url TEXT DEFAULT '',
      certificate_file TEXT DEFAULT '',
      logo TEXT DEFAULT '',
      display_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      file_size INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      mime_type TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      alt_text TEXT DEFAULT '',
      tags_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT DEFAULT '',
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      ip_address TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      session_id TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      page_path TEXT DEFAULT '/',
      project_id INTEGER DEFAULT NULL,
      project_slug TEXT DEFAULT '',
      project_title TEXT DEFAULT '',
      referrer TEXT DEFAULT '',
      referrer_domain TEXT DEFAULT '',
      device_type TEXT DEFAULT 'desktop',
      country TEXT DEFAULT '',
      metadata_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);
  `);

  // Migrations for education table columns
  try { db.exec('ALTER TABLE education ADD COLUMN short_description TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE education ADD COLUMN institution_url TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE education ADD COLUMN logo_url TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE education ADD COLUMN start_date TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE education ADD COLUMN end_date TEXT DEFAULT ""'); } catch (e) {}

  // Migrations for experiences table columns
  try { db.exec('ALTER TABLE experiences ADD COLUMN report_url TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE experiences ADD COLUMN report_path TEXT DEFAULT ""'); } catch (e) {}

  // Migrations for contact_messages table columns
  try { db.exec('ALTER TABLE contact_messages ADD COLUMN status TEXT DEFAULT "unread"'); } catch (e) {}
  try { db.exec('ALTER TABLE contact_messages ADD COLUMN reply_message TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE contact_messages ADD COLUMN replied_at DATETIME'); } catch (e) {}
  try { db.exec('ALTER TABLE contact_messages ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch (e) {}
  try { db.exec('ALTER TABLE contact_messages ADD COLUMN reply_message TEXT DEFAULT ""'); } catch (e) {}
  seedData();
  } catch (err) {
    console.warn('initDatabase error:', err.message);
  }
}

function seedData() {
  // Ensure Admin user only if configured via environment variables
  const envAdminUser = process.env.ADMIN_USERNAME || process.env.TEST_ADMIN_EMAIL;
  const envAdminPass = process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD;

  if (envAdminUser && envAdminPass) {
    const adminUser = db.prepare('SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?)').get(envAdminUser.toLowerCase());
    const passwordHash = bcrypt.hashSync(envAdminPass, 10);

    if (!adminUser) {
      db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(envAdminUser, passwordHash);
      console.log(`✅ Admin user created in local database: ${envAdminUser}`);
    } else {
      db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(passwordHash, adminUser.id);
    }
  }

  // Ensure Single Rows for Site, Hero, About Settings
  const siteCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get().count;
  if (siteCount === 0) {
    db.prepare('INSERT INTO site_settings (name) VALUES (?)').run('Amisha Pandey');
  }

  const heroCount = db.prepare('SELECT COUNT(*) as count FROM hero_settings').get().count;
  if (heroCount === 0) {
    db.prepare('INSERT INTO hero_settings (name) VALUES (?)').run('Amisha Pandey');
  }

  const aboutCount = db.prepare('SELECT COUNT(*) as count FROM about_settings').get().count;
  if (aboutCount === 0) {
    db.prepare('INSERT INTO about_settings (heading) VALUES (?)').run('About Me');
  }

  // Ensure Default Sections
  const defaultSections = [
    { slug: 'hero', name: 'Hero', type: 'hero', display_order: 0, is_locked: 1 },
    { slug: 'about', name: 'About', type: 'about', display_order: 1, is_locked: 0 },
    { slug: 'experience', name: 'Experience', type: 'experience', display_order: 2, is_locked: 0 },
    { slug: 'projects', name: 'Projects', type: 'projects', display_order: 3, is_locked: 0 },
    { slug: 'skills', name: 'Skills', type: 'skills', display_order: 4, is_locked: 0 },
    { slug: 'achievements', name: 'Achievements', type: 'achievements', display_order: 5, is_locked: 0 },
    { slug: 'education', name: 'Education', type: 'education', display_order: 6, is_locked: 0 },
    { slug: 'certifications', name: 'Certifications', type: 'certifications', display_order: 7, is_locked: 0 },
    { slug: 'contact', name: 'Contact', type: 'contact', display_order: 8, is_locked: 0 },
  ];

  const insertSectionStmt = db.prepare(`
    INSERT INTO sections (slug, name, type, display_order, is_locked, is_visible)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(slug) DO UPDATE SET name = excluded.name, is_locked = excluded.is_locked
  `);

  defaultSections.forEach((s) => {
    const existing = db.prepare('SELECT id FROM sections WHERE slug = ?').get(s.slug);
    if (!existing) {
      insertSectionStmt.run(s.slug, s.name, s.type, s.display_order, s.is_locked);
    }
  });

  // Seed Projects if empty
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  if (projectCount === 0) {
    const sampleProjects = [
      {
        slug: 'neural-vision-engine',
        title: 'Neural Vision & Perception Engine',
        short_description: 'Real-time multi-object detection and tracking system using custom lightweight CNN architectures.',
        description: 'Engineered an end-to-end computer vision platform designed for edge devices. Optimized inference speed by 4x using TensorRT quantization and custom CUDA kernels.',
        technologies_json: JSON.stringify(['Python', 'PyTorch', 'OpenCV', 'TensorRT', 'CUDA', 'FastAPI']),
        github_url: 'https://github.com/mspandey/neural-vision',
        demo_url: 'https://demo.example.com/vision',
        achievement: 'Achieved 98.4% mAP @ 60 FPS on edge TPU hardware',
        category: 'AI/ML',
        is_featured: 1,
        display_order: 1,
        project_date: '2026',
      },
      {
        slug: 'distributed-vector-db',
        title: 'Distributed High-Throughput Vector Index',
        short_description: 'Sub-millisecond similarity search index for multi-dimensional embeddings.',
        description: 'Built a high-performance vector search engine using HNSW graphs and memory-mapped files. Handled over 10 million vectors with low latency and seamless sharding across cluster nodes.',
        technologies_json: JSON.stringify(['C++', 'Rust', 'Python', 'gRPC', 'RocksDB', 'Docker']),
        github_url: 'https://github.com/mspandey/vector-db',
        demo_url: 'https://demo.example.com/vectordb',
        achievement: 'Processed 10,000 queries per second with <5ms latency',
        category: 'Databases',
        is_featured: 1,
        display_order: 2,
        project_date: '2025',
      },
      {
        slug: 'autonomous-iot-sentinel',
        title: 'Autonomous IoT Telemetry & Anomaly Detector',
        short_description: 'Edge computing pipeline for real-time sensor anomaly detection and predictive maintenance.',
        description: 'Designed a real-time data streaming pipeline for thousands of IoT sensors. Deployed unsupervised LSTM autoencoders to predict equipment failures days in advance.',
        technologies_json: JSON.stringify(['Python', 'Apache Kafka', 'TensorFlow', 'MQTT', 'TimescaleDB', 'React']),
        github_url: 'https://github.com/mspandey/iot-sentinel',
        demo_url: '',
        achievement: 'Reduced system downtime by 35% in simulated field tests',
        category: 'IoT',
        is_featured: 0,
        display_order: 3,
        project_date: '2025',
      },
    ];

    const insertProject = db.prepare(`
      INSERT INTO projects (slug, title, short_description, description, technologies_json, github_url, demo_url, achievement, category, is_featured, display_order, project_date, is_visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    sampleProjects.forEach((p) => insertProject.run(
      p.slug, p.title, p.short_description, p.description, p.technologies_json, p.github_url, p.demo_url, p.achievement, p.category, p.is_featured, p.display_order, p.project_date
    ));
  }

  // Seed Experiences if empty
  const expCount = db.prepare('SELECT COUNT(*) as count FROM experiences').get().count;
  if (expCount === 0) {
    const sampleExp = [
      {
        company: 'Apex AI & Data Labs',
        role: 'Senior Machine Learning & Systems Engineer',
        location: 'Bengaluru, India',
        start_date: '2024-06',
        end_date: 'Present',
        is_current: 1,
        description: 'Leading the design and deployment of scalable deep learning workflows, vector databases, and real-time inference APIs.',
        responsibilities_json: JSON.stringify([
          'Architected high-throughput RAG and LLM agent pipelines processing millions of daily requests.',
          'Reduced server infrastructure costs by 30% through dynamic model batching and GPU memory optimization.',
          'Mentored junior engineers and led technical architecture reviews for database scaling.',
        ]),
        technologies_json: JSON.stringify(['Python', 'PyTorch', 'LangChain', 'FastAPI', 'PostgreSQL', 'Docker', 'Kubernetes']),
        display_order: 1,
      },
      {
        company: 'Quantum Systems Inc.',
        role: 'Full Stack & Data Systems Engineer',
        location: 'Remote',
        start_date: '2023-01',
        end_date: '2024-05',
        is_current: 0,
        description: 'Developed analytics platforms, interactive data visualization dashboards, and microservice REST APIs.',
        responsibilities_json: JSON.stringify([
          'Built custom React and Node.js analytics engines with real-time WebSocket telemetry updates.',
          'Optimized SQL database query execution plans, improving search speed by 60%.',
        ]),
        technologies_json: JSON.stringify(['React', 'Node.js', 'Express', 'SQLite', 'Redis', 'TailwindCSS']),
        display_order: 2,
      },
    ];

    const insertExp = db.prepare(`
      INSERT INTO experiences (company, role, location, start_date, end_date, is_current, description, responsibilities_json, technologies_json, display_order, is_visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    sampleExp.forEach((e) => insertExp.run(
      e.company, e.role, e.location, e.start_date, e.end_date, e.is_current, e.description, e.responsibilities_json, e.technologies_json, e.display_order
    ));
  }

  // Seed Skills if empty
  const skillCount = db.prepare('SELECT COUNT(*) as count FROM skills').get().count;
  if (skillCount === 0) {
    const sampleSkills = [
      { name: 'Python', category: 'Programming', proficiency: 95, display_order: 1 },
      { name: 'C++ / Rust', category: 'Programming', proficiency: 85, display_order: 2 },
      { name: 'JavaScript / TypeScript', category: 'Programming', proficiency: 90, display_order: 3 },
      { name: 'PyTorch & TensorFlow', category: 'AI/ML', proficiency: 92, display_order: 4 },
      { name: 'Computer Vision (OpenCV)', category: 'AI/ML', proficiency: 88, display_order: 5 },
      { name: 'LLMs & RAG Architectures', category: 'AI/ML', proficiency: 90, display_order: 6 },
      { name: 'React.js & Next.js', category: 'Web Development', proficiency: 90, display_order: 7 },
      { name: 'Node.js & Express', category: 'Web Development', proficiency: 88, display_order: 8 },
      { name: 'PostgreSQL & SQLite', category: 'Databases', proficiency: 92, display_order: 9 },
      { name: 'Vector Databases (Chroma/FAISS)', category: 'Databases', proficiency: 88, display_order: 10 },
      { name: 'Docker & Kubernetes', category: 'DevOps', proficiency: 84, display_order: 11 },
      { name: 'Git & CI/CD Pipelines', category: 'Tools', proficiency: 92, display_order: 12 },
    ];

    const insertSkill = db.prepare(`
      INSERT INTO skills (name, category, proficiency, display_order, is_visible)
      VALUES (?, ?, ?, ?, 1)
    `);

    sampleSkills.forEach((s) => insertSkill.run(s.name, s.category, s.proficiency, s.display_order));
  }

  // Seed Achievements if empty
  const achCount = db.prepare('SELECT COUNT(*) as count FROM achievements').get().count;
  if (achCount === 0) {
    const sampleAch = [
      {
        title: 'National AI Innovation Hackathon Winner',
        organization: 'Ministry of Electronics & IT',
        year: '2025',
        description: 'Secured 1st place out of 500+ competing teams for creating an autonomous computer vision system for industrial safety.',
        rank_result: '1st Place Winner',
        participant_count: '500+ Teams',
        display_order: 1,
      },
      {
        title: 'Best Research Paper Award - Smart Systems',
        organization: 'International Conference on Machine Learning',
        year: '2024',
        description: 'Published research on hyper-efficient quantization for convolutional networks on low-power microcontrollers.',
        rank_result: 'Best Paper',
        participant_count: '200+ Submissions',
        display_order: 2,
      },
    ];

    const insertAch = db.prepare(`
      INSERT INTO achievements (title, organization, year, description, rank_result, participant_count, display_order, is_visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    sampleAch.forEach((a) => insertAch.run(a.title, a.organization, a.year, a.description, a.rank_result, a.participant_count, a.display_order));
  }

  // Seed Education if empty
  const eduCount = db.prepare('SELECT COUNT(*) as count FROM education').get().count;
  if (eduCount === 0) {
    const sampleEdu = [
      {
        institution: 'Institute of Engineering & Technology',
        degree: 'Bachelor of Technology (B.Tech)',
        field: 'Computer Science & Artificial Intelligence',
        start_year: '2021',
        end_year: '2025',
        is_current: 0,
        description: 'Graduated with distinction. Focused on Machine Learning, Algorithms, Database Systems, and Computer Architecture.',
        display_order: 1,
      },
    ];

    const insertEdu = db.prepare(`
      INSERT INTO education (institution, degree, field, start_year, end_year, is_current, description, display_order, is_visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    sampleEdu.forEach((e) => insertEdu.run(e.institution, e.degree, e.field, e.start_year, e.end_year, e.is_current, e.description, e.display_order));
  }

  // Seed Certifications if empty
  const certCount = db.prepare('SELECT COUNT(*) as count FROM certifications').get().count;
  if (certCount === 0) {
    const sampleCert = [
      {
        name: 'AWS Certified Machine Learning - Specialty',
        organization: 'Amazon Web Services',
        issue_date: '2025-03',
        credential_id: 'AWS-ML-9847291',
        credential_url: 'https://aws.amazon.com/verification',
        display_order: 1,
      },
      {
        name: 'Deep Learning Specialization',
        organization: 'DeepLearning.AI / Coursera',
        issue_date: '2024-08',
        credential_id: 'DL-SPEC-38291',
        credential_url: 'https://coursera.org/verify',
        display_order: 2,
      },
    ];

    const insertCert = db.prepare(`
      INSERT INTO certifications (name, organization, issue_date, credential_id, credential_url, display_order, is_visible)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    sampleCert.forEach((c) => insertCert.run(c.name, c.organization, c.issue_date, c.credential_id, c.credential_url, c.display_order));
  }
}

export default db;
