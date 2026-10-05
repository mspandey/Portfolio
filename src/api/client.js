// API Client helper functions

const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      credentials: 'include',
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new Error(`Network error: ${netErr.message}`);
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  let text = '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      text = await response.text();
    } catch {
      text = '';
    }
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    if (data && (data.error || data.message)) {
      throw new Error(data.error || data.message);
    }
    if (contentType.includes('text/html') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`Server returned an unexpected HTML response (${response.status}). Check the API route.`);
    }
    throw new Error(text?.slice(0, 150) || `Request failed with status ${response.status}`);
  }

  return data ?? { success: true };
}

// Public API
export function fetchPublicData() {
  return request('/public/data');
}

export function sendContactMessage(data) {
  return request('/contact', {
    method: 'POST',
    body: data,
  });
}

/**
 * Downloads the currently active resume PDF from the backend
 * Triggers a native browser file download named "Amisha_pandey_Resume.pdf"
 */
export async function downloadActiveResume() {
  const downloadUrl = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3001/api/public/resume/download'
    : '/api/public/resume/download';

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    let errMsg = 'Failed to download resume.';
    try {
      const errJson = await response.json();
      errMsg = errJson.error || errMsg;
    } catch {
      // response was not JSON
    }
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = 'Amisha_pandey_Resume.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

// Auth API
export async function loginAdmin(username, password) {
  const data = await request('/admin/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  if (data.token) {
    localStorage.setItem('admin_token', data.token);
  }
  return data;
}

export function checkAdminAuth() {
  return request('/admin/auth/me');
}

export function logoutAdmin() {
  localStorage.removeItem('admin_token');
  return request('/admin/auth/logout', { method: 'POST' }).catch(() => {});
}

// Admin Settings
export function fetchSiteSettings() {
  return request('/admin/site-settings');
}

export function updateSiteSettings(data) {
  return request('/admin/site-settings', { method: 'PUT', body: data });
}

export function fetchHeroSettings() {
  return request('/admin/hero-settings');
}

export function updateHeroSettings(data) {
  return request('/admin/hero-settings', { method: 'PUT', body: data });
}

export function fetchAboutSettings() {
  return request('/admin/about-settings');
}

export function updateAboutSettings(data) {
  return request('/admin/about-settings', { method: 'PUT', body: data });
}

// Admin Sections
export function fetchAdminSections() {
  return request('/admin/sections');
}

export function createSection(data) {
  return request('/admin/sections', { method: 'POST', body: data });
}

export function updateSection(id, data) {
  return request(`/admin/sections/${id}`, { method: 'PUT', body: data });
}

export function reorderSections(orderArray) {
  return request('/admin/sections/reorder', { method: 'POST', body: { order: orderArray } });
}

export function deleteSection(id) {
  return request(`/admin/sections/${id}`, { method: 'DELETE' });
}

// Admin Projects
export function fetchAdminProjects() {
  return request('/admin/projects');
}

export function createProject(data) {
  return request('/admin/projects', { method: 'POST', body: data });
}

export function updateProject(id, data) {
  return request(`/admin/projects/${id}`, { method: 'PUT', body: data });
}

export function duplicateProject(id) {
  return request(`/admin/projects/${id}/duplicate`, { method: 'POST' });
}

export function deleteProject(id) {
  return request(`/admin/projects/${id}`, { method: 'DELETE' });
}

export function reorderProjects(orderArray) {
  return request('/admin/projects/reorder', { method: 'PUT', body: orderArray });
}

// Admin Experiences
export function fetchAdminExperiences() {
  return request('/admin/experiences');
}

export function createExperience(data) {
  return request('/admin/experiences', { method: 'POST', body: data });
}

export function updateExperience(id, data) {
  return request(`/admin/experiences/${id}`, { method: 'PUT', body: data });
}

export function deleteExperience(id) {
  return request(`/admin/experiences/${id}`, { method: 'DELETE' });
}

export function reorderExperiences(orderArray) {
  return request('/admin/experiences/reorder', { method: 'POST', body: { order: orderArray } });
}

// Admin Skills
export function fetchAdminSkills() {
  return request('/admin/skills');
}

export function createSkill(data) {
  return request('/admin/skills', { method: 'POST', body: data });
}

export function updateSkill(id, data) {
  return request(`/admin/skills/${id}`, { method: 'PUT', body: data });
}

export function deleteSkill(id) {
  return request(`/admin/skills/${id}`, { method: 'DELETE' });
}

export function reorderSkills(orderArray) {
  return request('/admin/skills/reorder', { method: 'POST', body: { order: orderArray } });
}

// Admin Achievements
export function fetchAdminAchievements() {
  return request('/admin/achievements');
}

export function createAchievement(data) {
  return request('/admin/achievements', { method: 'POST', body: data });
}

export function updateAchievement(id, data) {
  return request(`/admin/achievements/${id}`, { method: 'PUT', body: data });
}

export function deleteAchievement(id) {
  return request(`/admin/achievements/${id}`, { method: 'DELETE' });
}

export function reorderAchievements(orderArray) {
  return request('/admin/achievements/reorder', { method: 'POST', body: { order: orderArray } });
}

export function uploadAchievementCertificate(formData) {
  return request('/admin/achievements/upload-certificate', {
    method: 'POST',
    body: formData,
  });
}

export function deleteAchievementCertificate(id, certificateUrl) {
  return request(`/admin/achievements/${id}/certificate`, {
    method: 'DELETE',
    body: { certificate_url: certificateUrl },
  });
}

// Admin Education
export function fetchAdminEducation() {
  return request('/admin/education');
}

export function createEducation(data) {
  return request('/admin/education', { method: 'POST', body: data });
}

export function updateEducation(id, data) {
  return request(`/admin/education/${id}`, { method: 'PUT', body: data });
}

export function reorderEducation(orderArray) {
  return request('/admin/education/reorder', { method: 'POST', body: { order: orderArray } });
}

export function deleteEducation(id) {
  return request(`/admin/education/${id}`, { method: 'DELETE' });
}

// Admin Certifications
export function fetchAdminCertifications() {
  return request('/admin/certifications');
}

export function createCertification(data) {
  return request('/admin/certifications', { method: 'POST', body: data });
}

export function updateCertification(id, data) {
  return request(`/admin/certifications/${id}`, { method: 'PUT', body: data });
}

export function deleteCertification(id) {
  return request(`/admin/certifications/${id}`, { method: 'DELETE' });
}

export function reorderCertifications(orderArray) {
  return request('/admin/certifications/reorder', { method: 'POST', body: { order: orderArray } });
}

// Admin Resumes
export function fetchAdminResumes() {
  return request('/admin/resumes');
}

export function uploadResumeFile(formData) {
  return request('/admin/resumes/upload', {
    method: 'POST',
    body: formData,
  });
}

export function activateResume(id) {
  return request(`/admin/resumes/${id}/activate`, { method: 'PUT' });
}

export const setActiveResume = activateResume;

export function deleteResume(id) {
  return request(`/admin/resumes/${id}`, { method: 'DELETE' });
}

// Admin Media
export function fetchAdminMedia() {
  return request('/admin/media');
}

export function uploadMediaFile(formData) {
  return request('/admin/media/upload', {
    method: 'POST',
    body: formData,
  });
}

export function deleteMedia(id) {
  return request(`/admin/media/${id}`, { method: 'DELETE' });
}

// Admin Messages
export function fetchAdminMessages() {
  return request('/admin/messages');
}

export function markMessageRead(id, isRead = true) {
  return request(`/admin/messages/${id}/read`, { method: 'PUT', body: { is_read: isRead } });
}

export function replyToMessage(id, replyText) {
  return request(`/admin/messages/${id}/reply`, { method: 'POST', body: { reply: replyText } });
}

export function deleteMessage(id) {
  return request(`/admin/messages/${id}`, { method: 'DELETE' });
}
