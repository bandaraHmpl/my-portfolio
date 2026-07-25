// js/admin.js
import { initTheme } from './theme.js';
import { onAuthUpdate, logoutAdmin } from './auth.js';
import { 
  getProjects, 
  addProject, 
  updateProject, 
  deleteProject,  
  getContactMessages,
  deleteContactMessage,
  markMessageReplied,
  getAchievements,
  addAchievement,
  deleteAchievement,
  updateAchievement
} from './firestore.js';

let currentEditingId = null;
let cachedProjects = [];
let currentAchievementEditingId = null;
let cachedAchievements = [];
let cachedMessages = [];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Protect Admin Dashboard route with Firebase Authentication
  onAuthUpdate(user => {

    if (!user) {
      // If not authenticated, redirect to login page
      window.location.href = 'login.html';
      return;
    }

    // Verify authenticated user has valid admin identity
    if (!user.email) {
      // Deny access for unauthorized user and redirect to homepage
      window.location.href = 'index.html';
      return;
    }

    // Display user email
    const emailDisplay = document.getElementById('admin-email-display');
    if (emailDisplay) {
      emailDisplay.textContent = user.email || 'Admin User';
    }

    // Initialize Admin Dashboard features
    initDashboard();
  });

  // Logout button listener
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logoutAdmin();
      window.location.href = 'login.html';
    });
  }
});

async function initDashboard() {
  await refreshProjectsTable();
  await refreshMessagesTable();
  await refreshAchievementsTable();

  // Setup Add Project button
  const addProjectBtn = document.getElementById('add-project-btn');
  if (addProjectBtn) {
    addProjectBtn.addEventListener('click', () => openProjectModal());
  }

  // Setup Add Achievement button
  const addAchievementBtn = document.getElementById('add-achievement-btn');
  if (addAchievementBtn) {
    addAchievementBtn.addEventListener('click', () => openAchievementModal());
  }

  // Setup Seed Projects button
  const seedProjectsBtn = document.getElementById('seed-projects-btn');
  if (seedProjectsBtn) {
    seedProjectsBtn.addEventListener('click', handleSeedProjects);
  }

  // Setup Modal Form Submissions
  const projectForm = document.getElementById('project-form');
  if (projectForm) {
    projectForm.addEventListener('submit', handleProjectFormSubmit);
  }

  const achievementForm = document.getElementById('achievement-form');
  if (achievementForm) {
    achievementForm.addEventListener('submit', handleAchievementSubmit);
  }

  // Setup Modal Close Buttons
  const closeBtns = document.querySelectorAll('.modal-close-trigger');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeProjectModal);
  });

  document.querySelectorAll('.achievement-close').forEach(btn => {
    btn.addEventListener('click', closeAchievementModal);
  });
}

/**
 * Fetch and populate projects table
 */
async function refreshProjectsTable() {
  const grid = document.getElementById('projects-table-body');
  if (!grid) return;

  grid.innerHTML = `<p style="text-align:center; padding: 2rem; grid-column: 1 / -1;">Loading projects from Firestore...</p>`;

  const res = await getProjects();
  if (!res.success) {
    grid.innerHTML = `<p style="text-align:center; padding: 2rem; color: #ef4444; grid-column: 1 / -1;">Error loading projects: ${res.error}</p>`;
    return;
  }

  cachedProjects = res.projects || [];

  if (cachedProjects.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center; padding: 3rem; grid-column: 1 / -1;">
        <p style="margin-bottom: 1rem; color: var(--text-secondary);">No projects found in database.</p>
        <button id="table-seed-btn" class="btn btn-accent" style="font-size: 0.8125rem;">Seed Sample Projects</button>
      </div>
    `;
    document.getElementById('table-seed-btn')?.addEventListener('click', handleSeedProjects);
    return;
  }

  const defaultImg = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80';

  grid.innerHTML = cachedProjects.map(project => `
    <div class="item-card" data-id="${project.id}">
      <div class="item-card-media">
        <img src="${escapeHtml(project.imageUrl || defaultImg)}" alt="" onerror="this.src='${defaultImg}'" />
      </div>
      <div class="item-card-body">
        <div class="item-card-header">
          <div class="item-card-title">${escapeHtml(project.title)}</div>
          ${project.featured ? `<span class="table-status-badge">Featured</span>` : `<span class="table-status-badge standard">Standard</span>`}
        </div>
        <p class="item-card-desc">${escapeHtml(project.description)}</p>
        <div class="item-card-meta">
          ${(project.technologies || []).slice(0, 3).map(t => `<span class="table-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="item-card-footer">
        <span class="item-card-footer-label">
          ${project.createdAt && typeof project.createdAt.toDate === 'function' ? project.createdAt.toDate().toLocaleDateString() : 'N/A'}
        </span>
        <div class="item-card-actions">
          <button class="action-btn-icon edit" data-id="${project.id}" title="Edit Project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn-icon delete" data-id="${project.id}" title="Delete Project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Attach event listeners for edit/delete
  grid.querySelectorAll('.action-btn-icon.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const proj = cachedProjects.find(p => p.id === id);
      if (proj) openProjectModal(proj);
    });
  });

  grid.querySelectorAll('.action-btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this project?')) {
        const delRes = await deleteProject(id);
        if (delRes.success) {
          alert('Project deleted successfully.');
          refreshProjectsTable();
        } else {
          alert('Failed to delete project: ' + delRes.error);
        }
      }
    });
  });
}

/**
 * Fetch and render contact messages
 */
async function refreshMessagesTable() {
  const grid = document.getElementById('messages-table-body');
  if (!grid) return;

  grid.innerHTML = `<p style="text-align:center; padding: 2rem; grid-column: 1 / -1;">Loading messages from Firestore...</p>`;

  const res = await getContactMessages();
  cachedMessages = res.messages || [];

  updateMessagesNavBadge();

  if (cachedMessages.length === 0) {
    grid.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--text-muted); grid-column: 1 / -1;">No messages received yet.</p>`;
    return;
  }

  grid.innerHTML = cachedMessages.map(msg => `
    <div class="item-card" data-id="${msg.id}">
      <div class="item-card-body">
        <div class="item-card-header">
          <div>
            <div class="item-card-title">${escapeHtml(msg.name)}</div>
            <div class="item-card-subtitle">${escapeHtml(msg.email)}</div>
          </div>
          <span class="msg-status-badge ${msg.replied ? 'replied' : ''}">${msg.replied ? 'Replied' : 'New'}</span>
        </div>
        <div class="item-card-title" style="font-size: 0.8125rem;">${escapeHtml(msg.subject || 'Inquiry')}</div>
        <p class="item-card-desc" style="-webkit-line-clamp: 4;">${escapeHtml(msg.message)}</p>
      </div>
      <div class="item-card-footer">
        <span class="item-card-footer-label">
          ${formatDate(msg.createdAt)}
        </span>
        <div class="item-card-actions">
          <button class="action-btn-icon reply ${msg.replied ? 'is-replied' : ''}" data-id="${msg.id}" title="Reply via Gmail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </button>
          <button class="action-btn-icon delete" data-id="${msg.id}" title="Delete Message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Mark the message as replied FIRST (and wait for it to finish) — only THEN
  // open Gmail. If we open Gmail before this completes, switching to the
  // Gmail app on mobile can interrupt the pending write, so the "New" badge
  // and unread count end up not decreasing.
  grid.querySelectorAll('.action-btn-icon.reply').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const msg = cachedMessages.find(m => m.id === id);
      if (!msg) return;

      if (!msg.replied) {
        const res = await markMessageReplied(id, true);
        if (res.success) {
          await refreshMessagesTable();
        }
      }

      openGmailReply(msg);
    });
  });

  // Delete message
  grid.querySelectorAll('.action-btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this message?')) {
        const res = await deleteContactMessage(id);
        if (res.success) {
          refreshMessagesTable();
        } else {
          alert('Failed to delete message: ' + res.error);
        }
      }
    });
  });
}

/**
 * Handle form submit for Add or Edit Project
 */
async function handleProjectFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('project-title').value.trim();
  const description = document.getElementById('project-desc').value.trim();
  const images = document.getElementById('project-images').value
    .split('\n')
    .map(u => u.trim())
    .filter(Boolean);
  const technologies = document.getElementById('project-techs').value.trim();
  const github = document.getElementById('project-github').value.trim();
  const liveDemo = document.getElementById('project-demo').value.trim();
  const featured = document.getElementById('project-featured').checked;

  if (!title || !description) {
    alert('Please enter project title and description.');
    return;
  }

  const submitBtn = document.getElementById('modal-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const payload = { title, description, images, technologies, github, liveDemo, featured };

  let res;
  if (currentEditingId) {
    res = await updateProject(currentEditingId, payload);
  } else {
    res = await addProject(payload);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Project';

  if (res.success) {
    closeProjectModal();
    refreshProjectsTable();
    alert(currentEditingId ? 'Project updated successfully!' : 'New project added successfully!');
  } else {
    alert('Failed to save project: ' + res.error);
  }
}

/**
 * Seed initial sample projects
 */
async function handleSeedProjects() {
  if (confirm('This will insert default sample projects into Firestore. Continue?')) {
    const res = await seedInitialProjects();
    if (res.success) {
      alert('Sample projects seeded successfully!');
      refreshProjectsTable();
    } else {
      alert('Failed to seed projects: ' + res.error);
    }
  }
}

/**
 * Project Modal helpers
 */
function openProjectModal(projectToEdit = null) {
  const modal = document.getElementById('project-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('project-form');

  if (!modal || !form) return;

  if (projectToEdit) {
    currentEditingId = projectToEdit.id;
    modalTitle.textContent = 'Edit Project';
    document.getElementById('project-title').value = projectToEdit.title || '';
    document.getElementById('project-desc').value = projectToEdit.description || '';
    document.getElementById('project-images').value = Array.isArray(projectToEdit.images) && projectToEdit.images.length
      ? projectToEdit.images.join('\n')
      : (projectToEdit.imageUrl || '');
    document.getElementById('project-techs').value = Array.isArray(projectToEdit.technologies) ? projectToEdit.technologies.join(', ') : '';
    document.getElementById('project-github').value = projectToEdit.github || '';
    document.getElementById('project-demo').value = projectToEdit.liveDemo || '';
    document.getElementById('project-featured').checked = Boolean(projectToEdit.featured);
  } else {
    currentEditingId = null;
    modalTitle.textContent = 'Add New Project';
    form.reset();
  }

  modal.classList.add('active');
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ==================== ACHIEVEMENT MANAGEMENT ====================

/**
 * Fetch and render achievements as table rows (Project Table Style)
 */
async function refreshAchievementsTable() {
  const grid = document.getElementById('achievements-table-body');
  if (!grid) return;

  grid.innerHTML = `<p style="text-align:center; padding: 2rem; grid-column: 1 / -1;">Loading achievements from Firestore...</p>`;

  const res = await getAchievements();
  if (!res.success) {
    grid.innerHTML = `<p style="text-align:center; padding: 2rem; color: #ef4444; grid-column: 1 / -1;">Error loading achievements: ${res.error}</p>`;
    return;
  }

  cachedAchievements = res.achievements || [];

  if (cachedAchievements.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center; padding: 3rem; grid-column: 1 / -1;">
        <p style="margin-bottom: 0.5rem; font-weight: 500; color: var(--text-secondary);">No achievements added yet.</p>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Click "Add Achievement" to get started.</p>
      </div>
    `;
    return;
  }

  const defaultImg = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80';

  grid.innerHTML = cachedAchievements.map(achievement => {
    const tagsHtml = (achievement.tags || [])
      .map(tag => `<span class="table-tag">${escapeHtml(tag)}</span>`)
      .join('');

    const categoryClass = (achievement.category || 'Other').toLowerCase();
    const hasImage = achievement.imageUrl && achievement.imageUrl.trim() !== '';

    return `
      <div class="item-card" data-id="${achievement.id}">
        <div class="item-card-media">
          <img src="${escapeHtml(hasImage ? achievement.imageUrl : defaultImg)}" alt="" onerror="this.src='${defaultImg}'" />
        </div>
        <div class="item-card-body">
          <div class="item-card-header">
            <div>
              <div class="item-card-title">${escapeHtml(achievement.title)}</div>
              <div class="item-card-subtitle">${escapeHtml(achievement.organization)}</div>
            </div>
            <span class="achievement-category ${categoryClass}">${escapeHtml(achievement.category || 'Other')}</span>
          </div>
          ${achievement.featured ? `<span class="table-status-badge" style="align-self: flex-start;">★ Featured</span>` : ''}
          <div class="item-card-meta">${tagsHtml}</div>
        </div>
        <div class="item-card-footer">
          <span class="item-card-footer-label">${achievement.year ? escapeHtml(achievement.year) : 'N/A'}</span>
          <div class="item-card-actions">
            <button class="action-btn-icon edit" data-id="${achievement.id}" title="Edit Achievement">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn-icon delete" data-id="${achievement.id}" title="Delete Achievement">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners for edit/delete
  grid.querySelectorAll('.action-btn-icon.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const achievement = cachedAchievements.find(a => a.id === id);
      if (achievement) openAchievementModal(achievement);
    });
  });

  grid.querySelectorAll('.action-btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this achievement?')) {
        const delRes = await deleteAchievement(id);
        if (delRes.success) {
          alert('Achievement deleted successfully.');
          refreshAchievementsTable();
        } else {
          alert('Failed to delete achievement: ' + delRes.error);
        }
      }
    });
  });
}

/**
 * Open Achievement Modal (Add/Edit)
 */
function openAchievementModal(achievementToEdit = null) {
  const modal = document.getElementById('achievement-modal');
  const modalTitle = document.getElementById('achievement-modal-title');
  const form = document.getElementById('achievement-form');

  if (!modal || !form) return;

  if (achievementToEdit) {
    currentAchievementEditingId = achievementToEdit.id;
    modalTitle.textContent = 'Edit Achievement';
    document.getElementById('achievement-title').value = achievementToEdit.title || '';
    document.getElementById('achievement-org').value = achievementToEdit.organization || '';
    document.getElementById('achievement-year').value = achievementToEdit.year || '';
    document.getElementById('achievement-category').value = achievementToEdit.category || 'Other';
    document.getElementById('achievement-desc').value = achievementToEdit.description || '';
    document.getElementById('achievement-tags').value = Array.isArray(achievementToEdit.tags) ? achievementToEdit.tags.join(', ') : '';
    document.getElementById('achievement-images').value = Array.isArray(achievementToEdit.images) && achievementToEdit.images.length
      ? achievementToEdit.images.join('\n')
      : (achievementToEdit.imageUrl || '');
    document.getElementById('achievement-featured').checked = Boolean(achievementToEdit.featured);
  } else {
    currentAchievementEditingId = null;
    modalTitle.textContent = 'Add Achievement';
    form.reset();
    document.getElementById('achievement-featured').checked = true;
  }

  modal.classList.add('active');
}

/**
 * Close Achievement Modal
 */
function closeAchievementModal() {
  const modal = document.getElementById('achievement-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  document.getElementById('achievement-form').reset();
  currentAchievementEditingId = null;
}

/**
 * Handle Achievement Form Submit
 */
async function handleAchievementSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('achievement-title').value.trim();
  const organization = document.getElementById('achievement-org').value.trim();
  const year = document.getElementById('achievement-year').value.trim();
  const category = document.getElementById('achievement-category').value;
  const description = document.getElementById('achievement-desc').value.trim();
  const tags = document.getElementById('achievement-tags').value.trim();
  const images = document.getElementById('achievement-images').value
    .split('\n')
    .map(u => u.trim())
    .filter(Boolean);
  const featured = document.getElementById('achievement-featured').checked;

  if (!title || !organization) {
    alert('Please enter achievement title and organization.');
    return;
  }

  const submitBtn = document.getElementById('achievement-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const payload = { title, organization, year, category, description, tags, images, featured };

  let res;
  if (currentAchievementEditingId) {
    res = await updateAchievement(currentAchievementEditingId, payload);
  } else {
    res = await addAchievement(payload);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Achievement';

  if (res.success) {
    closeAchievementModal();
    refreshAchievementsTable();
    alert(currentAchievementEditingId ? 'Achievement updated successfully!' : 'New achievement added successfully!');
  } else {
    alert('Failed to save achievement: ' + res.error);
  }
}

/**
 * Seed initial sample projects
 */
async function seedInitialProjects() {
  const sampleProjects = [
    {
      title: "Database Health Monitoring System",
      description: "A full-stack database monitoring platform that provides real-time visibility into database health, performance metrics, system status, and operational insights through an interactive dashboard.",
      imageUrl: "https://res.cloudinary.com/sy0cizde/image/upload/v1784801395/databasehealthmonitoringsystem_ozlln1.png",
      technologies: ["React.js", "Spring Boot", "MySQL", "REST API", "Git"],
      github: "https://github.com/example/cloud-monitoring",
      liveDemo: "https://example.com/demo4",
      featured: false
    },
    {
      title: "Cloud Monitoring Platform",
      description: "A comprehensive cloud infrastructure monitoring system with real-time alerts, visual dashboards, and automated incident response.",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      technologies: ["React", "Node.js", "AWS", "Docker", "Grafana"],
      github: "https://github.com/example/cloud-monitor",
      liveDemo: "https://example.com/demo1",
      featured: true
    },
    {
      title: "AI-Powered Code Review",
      description: "An intelligent code review assistant that uses machine learning to analyze code quality, identify potential bugs, and suggest improvements.",
      imageUrl: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80",
      technologies: ["Python", "FastAPI", "TensorFlow", "React", "Firestore"],
      github: "https://github.com/example/ai-review",
      liveDemo: "https://example.com/demo2",
      featured: false
    },
    {
      title: "Real-Time Chat Application",
      description: "A feature-rich real-time messaging platform with end-to-end encryption, file sharing, and group chat capabilities.",
      imageUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80",
      technologies: ["React", "Socket.io", "Node.js", "MongoDB", "JWT"],
      github: "https://github.com/example/chat-app",
      liveDemo: "https://example.com/demo3",
      featured: false
    }
  ];

  try {
    for (const project of sampleProjects) {
      await addProject(project);
    }
    return { success: true };
  } catch (error) {
    console.error('Error seeding projects:', error);
    return { success: false, error: error.message };
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Safely formats a date value that may arrive as a Firestore Timestamp
 * ({ toDate(): Date } or { seconds, nanoseconds }), a JS Date, an epoch
 * number, or an ISO string. Returns 'N/A' if it can't be parsed.
 */
function formatDate(value) {
  if (!value) return 'N/A';

  let date;
  if (typeof value.toDate === 'function') {
    // Firestore Timestamp instance
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'object' && typeof value.seconds === 'number') {
    // Plain-object Firestore timestamp shape { seconds, nanoseconds }
    date = new Date(value.seconds * 1000);
  } else {
    date = new Date(value);
  }

  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
}

// A single, consistent subject line used for every reply email.
const REPLY_EMAIL_SUBJECT = 'Reply to your inquiry — Portfolio Contact Form';

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function isIOSDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent || '');
}

/**
 * Opens a compose window addressed to the message sender.
 *  - iOS: tries the Gmail app's own URL scheme (googlegmail://), and falls
 *    back to a plain mailto: link (opens the default mail app) if the
 *    Gmail app isn't installed.
 *  - Android: the Gmail app doesn't support a public URL scheme like iOS
 *    does, so we use an Android "intent://" URI that explicitly targets
 *    the Gmail package (com.google.android.gm) with a mailto action, and
 *    give it a browser_fallback_url so it degrades gracefully if Gmail
 *    isn't installed.
 *  - Desktop: opens Gmail's web compose view in a new tab.
 */
function openGmailReply(msg) {
  const to = encodeURIComponent(msg.email);
  const subject = encodeURIComponent(REPLY_EMAIL_SUBJECT);
  const body = encodeURIComponent(`Hi ${msg.name || ''},\n\n`);

  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
  const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;

  if (isIOSDevice()) {
    const gmailAppUrl = `googlegmail:///co?to=${to}&subject=${subject}&body=${body}`;
    const start = Date.now();

    const fallbackTimer = setTimeout(() => {
      // Still here after ~900ms with the page still visible => Gmail app
      // link didn't open anything (app not installed). Fall back to the
      // device's default mail app via mailto:.
      if (!document.hidden && Date.now() - start < 1800) {
        window.location.href = mailtoUrl;
      }
    }, 900);

    document.addEventListener('visibilitychange', function onHide() {
      if (document.hidden) {
        clearTimeout(fallbackTimer);
        document.removeEventListener('visibilitychange', onHide);
      }
    });

    window.location.href = gmailAppUrl;
  } else if (isAndroidDevice()) {
    // NOTE: we intentionally do NOT use an intent:// URI here. Chrome always
    // reconstructs intent:// links as "<scheme>://<host>", but mailto: addresses
    // must NOT have "//" after the colon — that "//" gets read as part of the
    // address (e.g. "mailto://someone@gmail.com" bounces because Gmail treats
    // "//someone@gmail.com" as the literal recipient). A plain mailto: link is
    // the only way to guarantee the address stays correct; Android will open
    // the default mail app, or show a chooser if the person has more than one.
    window.location.href = mailtoUrl;
  } else {
    window.open(gmailWebUrl, '_blank');
  }
}

/**
 * Shows/hides the unread-message count badge next to "Contact Messages" in the sidebar.
 */
function updateMessagesNavBadge() {
  const badge = document.getElementById('messages-nav-badge');
  if (!badge) return;

  const unreadCount = cachedMessages.filter(m => !m.replied).length;

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
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