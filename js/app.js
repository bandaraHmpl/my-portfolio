// js/app.js
import { initTheme } from './theme.js';
import { initNavigation } from './navigation.js';
import { initTypingEffect, initScrollToTop, initScrollReveal } from './animations.js';
import { getProjects, saveContactMessage, getAchievements } from './firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Core UI Modules
  initTheme();
  initNavigation();
  initScrollToTop();

  // 2. Typing Effect on Hero Role Title
  const typedSpan = document.querySelector('.typed-text');
  if (typedSpan) {
    initTypingEffect(typedSpan, [
      'Full-Stack Developer',
      'UI/UX Designer',
      'Open Source Contributor',
      'Cloud Architecture Enthusiast'
    ]);
  }

  // 3. Dynamic Projects Fetch & Render from Firestore
  await loadAndRenderProjects();

  // 4. Achievements
  await loadAndRenderAchievements();

  // 5. Contact Form Submission
  setupContactForm();

  // 6. Scroll reveal animation trigger
  initScrollReveal();
});

/**
 * Loads projects dynamically from Firestore and renders card grid
 */
async function loadAndRenderProjects() {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  // Render Skeleton Loading state
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
  setupProjectFilters(projects);
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
    const imageUrl = project.imageUrl && project.imageUrl.trim() !== '' ? project.imageUrl : defaultImg;

    return `
      <div class="project-card" data-techs="${escapeHtml((project.technologies || []).join(',').toLowerCase())}">
        <div class="project-image-container">
          ${project.featured ? `<span class="featured-badge">Featured</span>` : ''}
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(project.title)}" class="project-img" loading="lazy" onerror="this.src='${defaultImg}'" />
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
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Filter projects by technology filter buttons
 */
function setupProjectFilters(allProjects) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');
      if (filterValue === 'all') {
        renderProjectsGrid(allProjects);
      } else if (filterValue === 'featured') {
        renderProjectsGrid(allProjects.filter(p => p.featured));
      } else {
        renderProjectsGrid(allProjects.filter(p => 
          (p.technologies || []).some(t => t.toLowerCase().includes(filterValue.toLowerCase()))
        ));
      }
    });
  });
}

/**
 * Handle contact form submission and Firestore storage
 */
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

/**
 * Show toast notification
 */
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
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
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

/**
 * Escape HTML special characters
 */
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

/**
 * Load and render achievements in timeline
 */
async function loadAndRenderAchievements() {
  const container = document.getElementById('achievements-timeline');
  if (!container) return;

  // Show loading state
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

  // Sort achievements by year (newest first)
  const sortedAchievements = [...res.achievements].sort((a, b) => {
    if (!a.year) return 1;
    if (!b.year) return -1;
    return parseInt(b.year) - parseInt(a.year);
  });

  container.innerHTML = sortedAchievements.map(item => {
    // Category badge if exists
    const categoryBadge = item.category ? `
      <span style="display: inline-block; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.15rem 0.6rem; border-radius: var(--radius-pill); background: var(--bg-tertiary); color: var(--text-muted); margin-bottom: 0.5rem;">
        ${escapeHtml(item.category)}
      </span>
    ` : '';

    // Tags
    const tagsHtml = (item.tags || []).map(tag => `
      <span class="project-tag">${escapeHtml(tag)}</span>
    `).join('');

    // Image with styling
    const imageHtml = item.imageUrl && item.imageUrl.trim() !== '' ? `
      <div style="margin-top: 1rem; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color);">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" style="width: 100%; max-height: 200px; object-fit: cover;" loading="lazy" />
      </div>
    ` : '';

    return `
      <div class="timeline-item">
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
}