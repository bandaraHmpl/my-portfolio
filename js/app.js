// js/app.js
import { initTheme } from './theme.js';
import { initNavigation } from './navigation.js';
import { initTypingEffect, initScrollToTop, initScrollReveal } from './animations.js';
import { getProjects, saveContactMessage, getAchievements, getSkills, subscribeToSkills, getProfileSettings } from './firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Core UI Modules
  initTheme();
  initNavigation();
  initScrollToTop();

  // Load Profile Photo & Resume Link dynamically
  await loadAndRenderProfileAndResume();

  // Subscribe to real-time skill updates from Firestore
  loadAndRenderSkills();

  // Hero Dynamic Stats Update (Projects, Years in Edu, Technologies)
  await updateHeroDynamicStats();

  // Typing Effect on Hero Role Title
  const typedSpan = document.querySelector('.typed-text');
  if (typedSpan) {
    initTypingEffect(typedSpan, [
      'Full-Stack Developer',
      'Machine Learning Practitioner',
      'Software Engineer'
    ]);
  }

  // Dynamic Projects Fetch & Render from Firestore
  await loadAndRenderProjects();

  // Achievements
  await loadAndRenderAchievements();

  // Contact Form Submission
  setupContactForm();

  // Scroll reveal animation trigger
  initScrollReveal();
});

/**
 * Loads and updates Profile Photo & Resume Download link dynamically from Firestore
 */
async function loadAndRenderProfileAndResume() {
  const res = await getProfileSettings();
  if (res.success && res.profile) {
    if (res.profile.photoUrl) {
      const profileImgs = document.querySelectorAll('.hero-img, #hero-profile-photo');
      profileImgs.forEach(img => {
        img.src = res.profile.photoUrl;
      });
    }
    if (res.profile.resumeUrl) {
      const resumeBtn = document.getElementById('download-resume-btn');
      if (resumeBtn) {
        resumeBtn.href = res.profile.resumeUrl;
        resumeBtn.setAttribute('target', '_blank');
      }
    }
  }
}

/**
 * Listens to real-time skills updates from Firestore and renders UI
 */
function loadAndRenderSkills() {
  const wrapper = document.querySelector('.skills-wrapper');
  if (!wrapper) return;

  subscribeToSkills((res) => {
    if (!res.success || !res.skills || res.skills.length === 0) {
      wrapper.innerHTML = '<p style="text-align:center; color: var(--text-muted); grid-column: 1 / -1;">No skills available.</p>';
      return;
    }

    // Group skills by category
    const categories = {};
    res.skills.forEach(skill => {
      const cat = skill.category || 'Other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(skill);
    });

    const categoryIcons = {
      'Frontend': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      'Backend': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
      'AI & Machine Learning': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
      'Database': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
      'Tools & Development': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      'Version Control': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>'
    };

    wrapper.innerHTML = Object.keys(categories).map(cat => `
      <div class="skill-category-group">
        <h3 class="skill-category-title">
          ${categoryIcons[cat] || ''}
          ${escapeHtml(cat)}
        </h3>
        <div class="skills-badges-list">
          ${categories[cat].map(s => `
            <div class="tech-badge">
              ${s.iconClass ? `<i class="${escapeHtml(s.iconClass)} tech-icon"></i>` : ''}
              <span>${escapeHtml(s.name)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  });
}

/**
 * Calculates and updates Hero section stats dynamically
 */
async function updateHeroDynamicStats() {
  const startDate = new Date('2024-08-12');
  const today = new Date();
  const diffInMs = today - startDate;
  const diffInYears = diffInMs / (1000 * 60 * 60 * 24 * 365.25);

  const yearsText = `${diffInYears.toFixed(1)}+`;
  const yearsEl = document.getElementById('hero-stat-years');
  if (yearsEl) {
    yearsEl.textContent = yearsText;
  }

  const projectsRes = await getProjects();
  const projectsCount = (projectsRes.projects || []).length;
  const projectsEl = document.getElementById('hero-stat-projects');
  if (projectsEl) {
    projectsEl.textContent = `${projectsCount}+`;
  }

  // Count total technologies dynamically from Firestore skills collection or fallback to badges
  const skillsRes = await getSkills();
  const skillsCount = (skillsRes.skills || []).length;
  const staticBadgesCount = document.querySelectorAll('.tech-badge').length;
  const techsEl = document.getElementById('hero-stat-techs');
  if (techsEl) {
    techsEl.textContent = `${skillsCount > 0 ? skillsCount : (staticBadgesCount > 0 ? staticBadgesCount : 26)}+`;
  }
}

/**
 * Loads projects dynamically from Firestore and renders card grid
 */
async function loadAndRenderProjects() {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  container.innerHTML = Array(3).fill(0).map(() => `
    <div class="project-card">
      <div class="project-image-container skeleton"></div>
      <div class="project-content">
        <div class="skeleton" style="height: 24px; width: 70%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 16px; width: 100%; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 16px; width: 85%; margin-bottom: 20px;"></div>
        <div class="skeleton" style="height: 32px; width: 40%;"></div>
      </div>
    </div>
  `).join('');

  const result = await getProjects();
  const projects = result.projects || [];

  if (projects.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
        <p style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">No projects to display at this time.</p>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Please check back soon for updates.</p>
      </div>
    `;
    return;
  }

  renderProjectsGrid(projects);
}

/**
 * Renders HTML cards for projects array
 */
function renderProjectsGrid(projectsToRender) {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  container.innerHTML = projectsToRender.map(project => {
    const techBadges = (project.technologies || [])
      .map(tech => `<span class="project-tag">${escapeHtml(tech)}</span>`)
      .join('');

    const defaultImg = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80';
    const galleryImages = Array.isArray(project.images) && project.images.length
      ? project.images
      : (project.imageUrl ? [project.imageUrl] : [defaultImg]);
    const coverImage = galleryImages[0] || defaultImg;

    return `
      <div class="project-card" data-techs="${escapeHtml((project.technologies || []).join(',').toLowerCase())}">
        <div class="project-image-container">
          ${project.featured ? `<span class="featured-badge">Featured</span>` : ''}
          ${galleryImages.length > 1 ? `<span class="shots-badge">${galleryImages.length} Photos</span>` : ''}
          <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(project.title)}" class="project-img" loading="lazy" onerror="this.src='${defaultImg}'" />
        </div>
        <div class="project-content">
          <h3 class="project-title">${escapeHtml(project.title)}</h3>
          <p class="project-description">${escapeHtml(project.description)}</p>
          <div class="project-tags">
            ${techBadges}
          </div>
          <div class="project-links">
            ${project.github ? `
              <a href="${escapeHtml(project.github)}" target="_blank" rel="noopener noreferrer" class="project-link" title="GitHub Repository">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                <span>Code</span>
              </a>
            ` : ''}
            ${project.liveDemo ? `
              <a href="${escapeHtml(project.liveDemo)}" target="_blank" rel="noopener noreferrer" class="project-link" title="Live Demo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Live Demo</span>
              </a>
            ` : ''}
            <span class="project-link project-view-more" title="View all screenshots">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
              <span>View Details</span>
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.project-card').forEach((card, idx) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.project-link') && !e.target.closest('.project-view-more')) return;
      openProjectDetail(projectsToRender[idx]);
    });
  });
}

function openProjectDetail(project) {
  const defaultImg = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80';
  const galleryImages = Array.isArray(project.images) && project.images.length
    ? project.images
    : (project.imageUrl ? [project.imageUrl] : [defaultImg]);

  const tagsHtml = (project.technologies || [])
    .map(tech => `<span class="project-tag">${escapeHtml(tech)}</span>`)
    .join('');

  const linksHtml = `
    ${project.github ? `
      <a href="${escapeHtml(project.github)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
        Code
      </a>
    ` : ''}
    ${project.liveDemo ? `
      <a href="${escapeHtml(project.liveDemo)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Live Demo
      </a>
    ` : ''}
  `;

  openDetailView({
    title: project.title,
    tagsHtml,
    description: project.description,
    linksHtml,
    images: galleryImages
  });
}

function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('contact-name')?.value.trim();
    const email = document.getElementById('contact-email')?.value.trim();
    const subject = document.getElementById('contact-subject')?.value.trim();
    const message = document.getElementById('contact-message')?.value.trim();

    if (!name || !email || !message) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending...';

    const res = await saveContactMessage({ name, email, subject, message });

    if (res.success) {
      showToast('Thank you! Your message has been sent successfully.', 'success');
      form.reset();
    } else {
      showToast('Failed to send message: ' + res.error, 'error');
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  });
}

export function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${type === 'success'
        ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
    </svg>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, match => {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match];
  });
}

async function loadAndRenderAchievements() {
  const container = document.getElementById('achievements-timeline');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
      Loading achievements...
    </div>
  `;

  const res = await getAchievements();

  if (!res.success || res.achievements.length === 0) {
    container.innerHTML = `
      <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">
        No achievements added yet.
      </p>
    `;
    return;
  }

  const sortedAchievements = [...res.achievements].sort((a, b) => {
    if (!a.year) return 1;
    if (!b.year) return -1;
    return parseInt(b.year) - parseInt(a.year);
  });

  container.innerHTML = sortedAchievements.map((item, idx) => {
    const categoryBadge = item.category ? `
      <span style="display: inline-block; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.15rem 0.6rem; border-radius: var(--radius-pill); background: var(--bg-tertiary); color: var(--text-muted); margin-bottom: 0.5rem;">
        ${escapeHtml(item.category)}
      </span>
    ` : '';

    const tagsHtml = (item.tags || []).map(tag => `
      <span class="project-tag">${escapeHtml(tag)}</span>
    `).join('');

    const galleryImages = Array.isArray(item.images) && item.images.length
      ? item.images
      : (item.imageUrl && item.imageUrl.trim() !== '' ? [item.imageUrl] : []);

    const imageHtml = galleryImages.length ? `
      <div style="position: relative; margin-top: 1rem; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color);">
        ${galleryImages.length > 1 ? `<span class="shots-badge">${galleryImages.length} Photos</span>` : ''}
        <img src="${escapeHtml(galleryImages[0])}" alt="${escapeHtml(item.title)}" style="width: 100%; max-height: 200px; object-fit: cover;" loading="lazy" />
      </div>
    ` : '';

    return `
      <div class="timeline-item" data-achievement-index="${idx}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <div>
              <h3 class="timeline-role">${escapeHtml(item.title)}</h3>
              <div class="timeline-company">${escapeHtml(item.organization)}</div>
            </div>
            <span class="timeline-duration">${escapeHtml(item.year || 'N/A')}</span>
          </div>

          ${categoryBadge}

          ${item.description ? `
            <p style="color: var(--text-secondary); line-height: 1.6;">
              ${escapeHtml(item.description)}
            </p>
          ` : ''}

          ${tagsHtml ? `
            <div class="project-tags" style="margin-top: 0.75rem;">
              ${tagsHtml}
            </div>
          ` : ''}

          ${imageHtml}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.timeline-item').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-achievement-index'), 10);
      openAchievementDetail(sortedAchievements[idx]);
    });
  });
}

function openAchievementDetail(item) {
  const galleryImages = Array.isArray(item.images) && item.images.length
    ? item.images
    : (item.imageUrl && item.imageUrl.trim() !== '' ? [item.imageUrl] : []);

  const tagsHtml = `
    ${item.category ? `<span class="project-tag">${escapeHtml(item.category)}</span>` : ''}
    ${item.year ? `<span class="project-tag">${escapeHtml(item.year)}</span>` : ''}
    ${(item.tags || []).map(tag => `<span class="project-tag">${escapeHtml(tag)}</span>`).join('')}
  `;

  openDetailView({
    title: `${item.title}${item.organization ? ' — ' + item.organization : ''}`,
    tagsHtml,
    description: item.description || '',
    linksHtml: '',
    images: galleryImages
  });
}

function ensureDetailOverlay() {
  let overlay = document.getElementById('detail-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'detail-overlay';
  overlay.className = 'detail-overlay';
  overlay.innerHTML = `
    <div class="detail-panel">
      <button class="detail-back-btn" id="detail-back-btn" aria-label="Back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <div class="detail-panel-inner">
        <h2 class="detail-title" id="detail-title"></h2>
        <div class="detail-tags" id="detail-tags"></div>
        <p class="detail-description" id="detail-description"></p>
        <div class="detail-links" id="detail-links"></div>
        <div class="detail-gallery" id="detail-gallery"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#detail-back-btn').addEventListener('click', closeDetailView);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDetailView();
  });
  document.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('active') && e.key === 'Escape') closeDetailView();
  });

  return overlay;
}

function openDetailView({ title, tagsHtml, description, linksHtml, images }) {
  const overlay = ensureDetailOverlay();

  overlay.querySelector('#detail-title').textContent = title;
  overlay.querySelector('#detail-tags').innerHTML = tagsHtml || '';
  overlay.querySelector('#detail-description').textContent = description || '';
  overlay.querySelector('#detail-links').innerHTML = linksHtml || '';

  const galleryImages = images && images.length ? images : [];
  const galleryEl = overlay.querySelector('#detail-gallery');
  galleryEl.innerHTML = galleryImages.map((src, idx) => `
    <div class="detail-gallery-item" data-index="${idx}">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(title)} screenshot ${idx + 1}" loading="lazy" />
    </div>
  `).join('');

  galleryEl.querySelectorAll('.detail-gallery-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-index'), 10);
      openLightbox(galleryImages, idx);
    });
  });

  document.body.style.overflow = 'hidden';
  overlay.classList.add('active');
  overlay.querySelector('.detail-panel').scrollTop = 0;
}

function closeDetailView() {
  const overlay = document.getElementById('detail-overlay');
  if (overlay) overlay.classList.remove('active');
  const lightbox = document.getElementById('lightbox-overlay');
  if (!lightbox || !lightbox.classList.contains('active')) {
    document.body.style.overflow = '';
  }
}

let lightboxImages = [];
let lightboxIndex = 0;

function ensureLightboxOverlay() {
  let overlay = document.getElementById('lightbox-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'lightbox-overlay';
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <button class="lightbox-close-btn" id="lightbox-close-btn" aria-label="Close">&times;</button>
    <button class="lightbox-nav-btn lightbox-prev-btn" id="lightbox-prev-btn" aria-label="Previous image">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <img class="lightbox-img" id="lightbox-img" src="" alt="" />
    <button class="lightbox-nav-btn lightbox-next-btn" id="lightbox-next-btn" aria-label="Next image">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div class="lightbox-counter" id="lightbox-counter"></div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#lightbox-close-btn').addEventListener('click', closeLightbox);
  overlay.querySelector('#lightbox-prev-btn').addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });
  overlay.querySelector('#lightbox-next-btn').addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  let touchStartX = 0;
  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  overlay.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) navigateLightbox(diff > 0 ? -1 : 1);
  }, { passive: true });

  return overlay;
}

function openLightbox(images, startIndex = 0) {
  if (!images || images.length === 0) return;
  lightboxImages = images;
  lightboxIndex = startIndex;

  const overlay = ensureLightboxOverlay();
  updateLightboxImage();
  document.body.style.overflow = 'hidden';
  overlay.classList.add('active');
}

function updateLightboxImage() {
  const overlay = document.getElementById('lightbox-overlay');
  if (!overlay) return;

  overlay.querySelector('#lightbox-img').src = lightboxImages[lightboxIndex];
  const counter = overlay.querySelector('#lightbox-counter');
  counter.textContent = lightboxImages.length > 1 ? `${lightboxIndex + 1} / ${lightboxImages.length}` : '';

  const showNav = lightboxImages.length > 1;
  overlay.querySelector('#lightbox-prev-btn').style.display = showNav ? 'flex' : 'none';
  overlay.querySelector('#lightbox-next-btn').style.display = showNav ? 'flex' : 'none';
}

function navigateLightbox(direction) {
  if (lightboxImages.length === 0) return;
  lightboxIndex = (lightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
  updateLightboxImage();
}

function closeLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  if (overlay) overlay.classList.remove('active');
  const detail = document.getElementById('detail-overlay');
  if (!detail || !detail.classList.contains('active')) {
    document.body.style.overflow = '';
  }
}