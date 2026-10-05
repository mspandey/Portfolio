-- =============================================================================
-- AMISHA PANDEY PORTFOLIO CMS — SUPABASE POSTGRESQL SCHEMA & STORAGE CONFIG
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ADMIN USERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. SITE SETTINGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. HERO SETTINGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hero_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    greeting TEXT DEFAULT 'Hi, I''m',
    name TEXT DEFAULT 'Amisha Pandey',
    tagline TEXT DEFAULT 'Where data meets intelligence.',
    description TEXT DEFAULT 'I work with databases, AI/ML & systems that solve real problems. Building things that think, learn, and work.',
    hero_image TEXT DEFAULT '/character.png',
    hero_video TEXT DEFAULT '/character-scrub.mp4',
    resume_button_label TEXT DEFAULT 'Resume ↗',
    resume_button_visible BOOLEAN DEFAULT TRUE,
    talk_button_label TEXT DEFAULT 'Let''s Talk ↗',
    talk_button_url TEXT DEFAULT '#contact',
    cursor_interaction BOOLEAN DEFAULT TRUE,
    eye_tracking BOOLEAN DEFAULT TRUE,
    facial_interaction BOOLEAN DEFAULT TRUE,
    animation_intensity NUMERIC DEFAULT 1.0,
    overlay_intensity NUMERIC DEFAULT 0.25,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. ABOUT SETTINGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS about_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    heading TEXT DEFAULT 'About Me',
    introduction TEXT DEFAULT 'Passionate about engineering systems that merge machine intelligence with robust backend architectures.',
    biography TEXT DEFAULT 'I specialize in artificial intelligence, machine learning pipelines, database optimization, and high-throughput software systems.',
    professional_summary TEXT DEFAULT 'Background in Computer Science & Artificial Intelligence with hands-on experience in full-stack architecture, ML model deployment, and distributed systems.',
    profile_image TEXT DEFAULT '/character.png',
    stats_json JSONB DEFAULT '[{"label":"Years Experience","value":"3+"},{"label":"Projects Built","value":"25+"},{"label":"ML Models Deployed","value":"10+"},{"label":"Articles & Research","value":"5"}]'::jsonb,
    custom_content TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. SECTIONS TABLE (Ordered CMS Sections)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    heading TEXT DEFAULT '',
    subheading TEXT DEFAULT '',
    content TEXT DEFAULT '',
    content_json JSONB DEFAULT '{}'::jsonb,
    image TEXT DEFAULT '',
    video TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. PROJECTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    short_description TEXT DEFAULT '',
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    video TEXT DEFAULT '',
    gallery JSONB DEFAULT '[]'::jsonb,
    technologies JSONB DEFAULT '[]'::jsonb,
    github_url TEXT DEFAULT '',
    live_url TEXT DEFAULT '',
    demo_url TEXT DEFAULT '',
    achievement TEXT DEFAULT '',
    category TEXT DEFAULT '',
    year TEXT DEFAULT '',
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. EXPERIENCES TABLE (With Dual Logo & PDF Report Support)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    location TEXT DEFAULT '',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT DEFAULT '',
    responsibilities JSONB DEFAULT '[]'::jsonb,
    technologies JSONB DEFAULT '[]'::jsonb,
    company_website TEXT DEFAULT '',
    company_logo_url TEXT DEFAULT '',
    company_logo_storage_path TEXT DEFAULT '',
    report_url TEXT DEFAULT '',
    report_storage_path TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. SKILLS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT DEFAULT '',
    proficiency INTEGER DEFAULT 90,
    description TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. ACHIEVEMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. EDUCATION TABLE (With Strict Manual Order Persistence)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field TEXT DEFAULT '',
    start_year TEXT DEFAULT '',
    end_year TEXT DEFAULT '',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    is_current BOOLEAN DEFAULT FALSE,
    short_description TEXT DEFAULT '',
    description TEXT DEFAULT '',
    achievements JSONB DEFAULT '[]'::jsonb,
    logo TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    institution_url TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. CERTIFICATIONS TABLE (With Dual URL & PDF Upload Support)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issue_date TEXT DEFAULT '',
    expiry_date TEXT DEFAULT '',
    credential_id TEXT DEFAULT '',
    description TEXT DEFAULT '',
    certificate_url TEXT DEFAULT '',
    certificate_storage_path TEXT DEFAULT '',
    external_url TEXT DEFAULT '',
    logo TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. RESUMES TABLE (Single Active Resume Versioning)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    file_size BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 13. MEDIA TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    bucket TEXT DEFAULT 'portfolio-media',
    mime_type TEXT DEFAULT '',
    file_size BIGINT DEFAULT 0,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    alt_text TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 14. MESSAGES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_replied BOOLEAN DEFAULT FALSE,
    replied_at TIMESTAMPTZ,
    reply_message TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE & FAST ORDERED LOOKUPS
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sections_order ON sections (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_projects_order ON projects (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_experiences_order ON experiences (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_skills_order ON skills (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_achievements_order ON achievements (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_education_order ON education (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_certifications_order ON certifications (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_resumes_active ON resumes (is_active);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE about_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies for Visible Content
CREATE POLICY "Public Read Site Settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Hero Settings" ON hero_settings FOR SELECT USING (true);
CREATE POLICY "Public Read About Settings" ON about_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Sections" ON sections FOR SELECT USING (is_visible = true);
CREATE POLICY "Public Read Projects" ON projects FOR SELECT USING (is_visible = true);
CREATE POLICY "Public Read Experiences" ON experiences FOR SELECT USING (is_visible = true);
CREATE POLICY "Public Read Skills" ON skills FOR SELECT USING (is_visible = true);
CREATE POLICY "Public Read Achievements" ON achievements FOR SELECT USING (is_visible = true);
CREATE POLICY "Public Read Education" ON education FOR SELECT USING (is_visible = true);
CREATE POLICY "Public Read Certifications" ON certifications FOR SELECT USING (is_visible = true);
CREATE POLICY "Public Read Active Resume" ON resumes FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Media" ON media FOR SELECT USING (true);

-- 2. Public Insert for Contact Messages
CREATE POLICY "Public Insert Messages" ON messages FOR INSERT WITH CHECK (true);

-- 3. Service Role (Server-side) Full Access for All Tables
-- (Supabase service role automatically bypasses RLS, ensuring server-side CRUD functions cleanly)

-- =============================================================================
-- STORAGE BUCKETS SETUP INSTRUCTIONS
-- =============================================================================
-- Run the following in Supabase SQL Editor if storage extensions are enabled,
-- or create these 4 public buckets in the Supabase Dashboard -> Storage:
-- 1. portfolio-media (Public) -> Dynamic CMS images, logos, gallery
-- 2. resumes (Public)        -> Resume PDFs
-- 3. certificates (Public)   -> Certification PDFs/images
-- 4. experience-reports (Public) -> Internship/Job Report PDFs

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('portfolio-media', 'portfolio-media', true),
    ('resumes', 'resumes', true),
    ('certificates', 'certificates', true),
    ('experience-reports', 'experience-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage public read policy
CREATE POLICY "Public Read Storage" ON storage.objects FOR SELECT USING (bucket_id IN ('portfolio-media', 'resumes', 'certificates', 'experience-reports'));
