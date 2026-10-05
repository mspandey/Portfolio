# Amisha Pandey — Personal Portfolio & Headless CMS

> A modern, full-stack personal portfolio and content management system featuring a 60 FPS interactive gaze-tracking canvas, drag-and-drop section reordering, dynamic cloud persistence with Supabase, and a secure administrative dashboard.

---

## Hi, I'm Amisha 👋

I am a Computer Science and Engineering student who loves taking complex ideas and shaping them into fast, reliable, and thoughtful digital experiences. 

Whether it's wiring low-latency computer vision pipelines, designing scalable REST APIs, connecting IoT sensor meshes with real-time browser telemetry, or fine-tuning interactive frontend canvases down to the millisecond, I care deeply about building software that is practical, robust, and delightful to interact with.

This repository houses the complete source code for my personal portfolio website and its built-in headless Content Management System (CMS).

---



---

## About Me

I am currently pursuing my **B.Tech in Computer Science & Engineering** at **Amity University Jaipur** (2025–2029)

My technical journey centers on the intersection of **software engineering, systems development, AI/ML, and hardware**:

- **Software & Full-Stack Development**: Writing clean, modular applications with React, Node.js, Express, Flask, and Django.
- **AI/ML & Computer Vision**: Building local RAG workflows with HuggingFace, biometric verification with OpenCV, and intelligent classification systems.
- **IoT, Robotics & Automation**: Interfacing microcontrollers (ESP32, Arduino) with cloud and local networks to bridge physical hardware with responsive web dashboards.
- **Data Engineering & Database Systems**: Designing and optimizing relational SQL schemas, ETL pipelines, and high-performance vector indexing.

Beyond code, I enjoy competitive hackathons and exploring how emerging software architectures can tackle real-world challenges in safety, healthcare, and industrial automation.

---

## Portfolio Overview

Most personal portfolios are static, hardcoded pages: adding a new project, updating an internship bullet point, or uploading an updated resume means modifying code, committing changes, and triggering full production redeployments.

This portfolio is engineered differently. It is an **active, full-stack application coupled with a dedicated headless CMS**:

- **Live Content Flexibility**: Sections, projects, work experiences, skills, achievements, certifications, and media are served through a dynamic backend API.
- **Dynamic Layout Control**: The site owner can reorder entire page sections on the fly using a drag-and-drop interface, instantly restructuring the public layout.
- **Centralized Admin Dashboard**: Authenticated control center at `/admin` for seamless content authoring, asset uploading, and communication management.
- **Active Resume Versioning**: Upload and store multiple revisions of a resume PDF; selecting one activates it instantly for public download without link breakage.
- **Direct Visitor Communication**: Inquiries submitted through the contact form arrive directly in an administrative inbox, with built-in SMTP email reply capabilities.

---

## Key Features

### 🌟 Public Experience
- **Cinematic Gaze-Tracking Hero Canvas**: An HTML5 Canvas engine tracks visitor mouse movements or mobile touch coordinates with 2D spring inertia, animating through 64 extracted WebP frames for a lifelike, responsive portrait experience.
- **Dynamic Section Architecture**: Sections render dynamically from database state; toggling visibility or reordering sections in the CMS immediately updates the public UI.
- **Fluid Magnetic Cursor**: A spring-interpolated dual cursor (aura and focal point) that responds dynamically to interactive buttons, links, and cards on pointer-enabled devices.
- **Subtle Viewport Scroll Animations**: Lightweight `IntersectionObserver` triggers smooth fade-and-slide reveals as content enters the viewport.
- **Direct Resume Streaming**: The public "Resume" button requests a dedicated download endpoint that streams the currently active PDF with clean download headers.
- **Filterable Project Showcase**: Tag-based category filtering, live project links, GitHub shortcuts, and multi-image modal galleries.
- **Interactive Experience & Education Cards**: Accordion-style expandable detail cards, credential links, and downloadable verification documentation.

### 🛡️ Headless CMS & Backend (Admin Center)
- **Protected Admin Dashboard**: Secure authentication via signed JWTs stored in HTTP-only, `sameSite` cookies with Bearer header support.
- **Drag-and-Drop Reordering**: Visual drag handles powered by `@dnd-kit/core` and `@dnd-kit/sortable` for intuitive section arrangement.
- **Multi-File Cloud Storage**: Multer in-memory upload pipeline streaming directly to Supabase Storage buckets for project media, resumes, and certification PDFs.
- **In-App Message Center**: View incoming contact inquiries with read/unread tracking, deletion, and direct one-click email replies via Nodemailer SMTP.
- **Hybrid Persistence Resilience**: Production database runs on Supabase PostgreSQL with local SQLite (`better-sqlite3` WAL mode) and in-memory fallbacks for zero-setup local development.

---



## Technical Skills

A curated breakdown of the tools and technologies I use across projects:

| Category | Technologies & Tools |
|---|---|
| **Languages** | Python, JavaScript (ES6+), C, Arduino C, SQL, Java, HTML5, CSS3 |
| **Frontend Development** | React 19, Vite, React Router, Canvas API, Modern CSS Custom Properties, `@dnd-kit` |
| **Backend & APIs** | Node.js, Express 5, Flask, Django, RESTful Architecture, JWT Authentication, Nodemailer |
| **AI, ML & Computer Vision** | OpenCV, HuggingFace (Phi-3-mini), RAG Pipelines, PyTorch, Local LLM Integration |
| **IoT & Embedded Systems** | ESP32, Arduino, Sensor Networks, Microcontroller Interfacing, Hardware-Software Integration |
| **Databases & Cloud** | Supabase (PostgreSQL), SQLite (`better-sqlite3`), Supabase Storage, Vercel Edge Hosting |
| **Data Engineering** | ETL / ELT Pipelines, Data Cleaning & Transformation, Analytics Visualization |
| **DevOps & Developer Tools** | Git, GitHub, Docker, n8n Automation, Postman, Linux Terminal, LaTeX |

---






## Technical Architecture

The application adopts a decoupled full-stack model with resilient data fallbacks:

```
┌────────────────────────────────────────────────────────┐
│               Client (React 19 + Vite 7)               │
│  - Public Single-Page Application (SPA)                │
│  - 60 FPS HTML5 Canvas Gaze Engine                     │
│  - Protected Headless Admin CMS (/admin)               │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON / JWT Cookie
                            ▼
┌────────────────────────────────────────────────────────┐
│             Backend API (Express 5 / Node.js)          │
│  - Public Data Aggregator: /api/public/*               │
│  - Auth Interceptor & Route Guards: authenticateAdmin  │
│  - Multi-part Media Handler: Multer (Memory Storage)   │
│  - Communications Dispatcher: Nodemailer SMTP Relay    │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
       (Cloud Mode)                  (Local Mode)
               ▼                           ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│       Supabase Cloud          │ │     Local SQLite     │
│  - PostgreSQL with RLS        │ │  - better-sqlite3    │
│  - Storage (Media & Resumes)  │ │  - Local disk uploads│
└───────────────────────────────┘ └──────────────────────┘
```

### High-Level Request Flow
1. **Public Visitor**: The browser loads the lightweight React client. A single request (`GET /api/public/data`) fetches active site settings, ordered sections, featured projects, experiences, and resume metadata in one round trip.
2. **Interactive Hero**: Concurrently, the canvas controller initializes 64 WebP frames. Mouse or touch movements calculate radial offsets, smoothly interpolating character head tilt and eye orientation via `requestAnimationFrame`.
3. **Admin Actions**: Content edits made in the admin panel submit authenticated `PUT` or `POST` payloads. The server validates the session, writes updates to the database, and invalidates cached public responses.

---

## Admin CMS Control Center

The built-in dashboard accessible at `/admin` empowers complete content governance without requiring source code edits:

| Panel | Functionality |
|---|---|
| **Dashboard** | Real-time counts of published projects, experiences, certifications, active resumes, and unread inquiries. |
| **Site Settings** | Manage owner name, professional title, contact email, social profile URLs, and global SEO meta tags. |
| **Hero Stage** | Customize greeting copy, tagline, call-to-action button labels, target URLs, and animation toggles. |
| **About Section** | Edit biography paragraphs, professional summary, profile picture, and numerical accomplishment stats. |
| **Projects Manager** | Create, edit, clone, or delete projects with tag categorization, demo URLs, GitHub links, and gallery uploads. |
| **Experience Timeline** | Maintain employment history, company links, date ranges, responsibility bullet points, and report attachments. |
| **Skills Matrix** | Group technical capabilities by category and configure proficiency levels with live preview sliders. |
| **Achievements** | Document competition placements, hackathon wins, awards, and external verification links. |
| **Education** | Manage academic degrees, universities, course highlights, and institutional logos. |
| **Certifications** | Catalog earned credentials, issuing organizations, credential IDs, and certificate documents. |
| **Resume Versions** | Upload new resume revisions with one-click atomic activation for instant public download updates. |
| **Media Library** | Upload, preview, copy URLs, and organize image and document assets stored in cloud buckets. |
| **Section Ordering** | Drag-and-drop ordering interface (`@dnd-kit`) to visually customize the layout of the public portfolio. |
| **Messages & SMTP** | Review visitor contact submissions and reply directly from the dashboard via configured SMTP email transport. |

---

## Responsive Design & Accessibility

- **Mobile First & Cross-Device**: Fully responsive layouts tested across smartphones (390px–430px), tablets (768px–1024px), and ultra-wide desktop monitors.
- **Adaptive Navigation**: Desktop displays an unobtrusive floating glassmorphism pill; mobile displays a swipeable drawer with backdrop blur and touch body-lock.
- **Touch-Aware Gaze Control**: Mobile touch events on the hero portrait mirror desktop cursor tracking. If a vertical scroll gesture is detected, touch-gaze automatically yields control so normal page scrolling is never blocked.
- **Reduced Motion Support**: Strict adherence to `prefers-reduced-motion: reduce`. When active, canvas frame animations and parallax effects are replaced with a crisp, static portrait.
- **Semantic Structure**: Semantic HTML tags (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), valid ARIA attributes, and accessible color contrast.

---

## Why This Portfolio?

I built this portfolio not just as a showroom for completed projects, but as a project in its own right.

I wanted to demonstrate:
1. **End-to-End Ownership**: Building both the user-facing interface and the administrative systems that sustain it over time.
2. **Performance Craftsmanship**: Choosing lightweight, purpose-built solutions (like custom canvas rendering and zero-dependency local RAG pipelines) over heavy third-party bundles.
3. **Engineering Discipline**: Structuring code with clear separation of concerns, defensive error handling, secure credential handling, and graceful offline fallbacks.

Every component, route, and line of CSS represents my passion for learning by doing and building software designed to last.

---

## Opportunities & Looking Ahead

I am actively looking for **Software Engineering, Full-Stack Development, AI/ML, and IoT / Systems Engineering** opportunities, including:

- 🚀 **Summer / Semester Internships**
- 🤝 **Open-Source Collaborations & Research Projects**
- 💡 **Engineering Fellowships & Innovation Programs**

If your team is solving hard problems and values curiosity, disciplined execution, and a willingness to roll up sleeves and build, I would love to connect.

---

## Getting Started Locally

Follow these steps to run the portfolio on your local machine:

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/mspandey/Portfolio.git
cd Portfolio
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy the template configuration into a new `.env` file:
```bash
cp .env.example .env
```

Review `.env` settings (defaults work out of the box with local SQLite):
```env
# Server
PORT=3001
JWT_SECRET=your-local-jwt-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Supabase (Optional for local development; SQLite will be used if omitted)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-supabase-key

# Email Replies (Optional - Required for sending email replies from admin)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=your-email@gmail.com
```

### 5. Launch the Development Server
Run the full application (Express API on `:3001` and Vite client on `:5173`) with a single command:
```bash
npm run dev
```

Visit the application in your browser:
- **Public Portfolio**: [http://localhost:5173](http://localhost:5173)
- **Admin Dashboard**: [http://localhost:5173/admin](http://localhost:5173/admin)
- **API Health Check**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

### Additional Scripts
```bash
npm run client   # Starts Vite development server only
npm run server   # Starts Express backend with nodemon file watching
npm run build    # Generates optimized production build in /dist
npm run preview  # Previews production build locally
```

---

## Connect & Contact

Have an interesting project, internship opportunity, collaboration, or simply want to talk tech? I'd love to hear from you:

- 📧 **Email**: [amisha.pandey2006@gmail.com](mailto:amisha.pandey2006@gmail.com)
- 💼 **LinkedIn**: [linkedin.com/in/amisha-pandey](https://linkedin.com/in/amisha-pandey)
- 🐙 **GitHub**: [@mspandey](https://github.com/mspandey)
- 🌐 **Live Portfolio**: [public-five-psi-47.vercel.app](https://public-five-psi-47.vercel.app)

---

<p align="center">
  <sub>Designed & Developed with ❤️ by <b>Amisha Pandey</b></sub>
</p>
