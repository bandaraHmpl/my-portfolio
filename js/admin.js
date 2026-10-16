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
  updateAchievement,
  getSkills,
  subscribeToSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  getProfileSettings,
  saveProfileSettings
} from './firestore.js';

let currentEditingId = null;
let cachedProjects = [];

let currentAchievementEditingId = null;
let cachedAchievements = [];

let currentSkillEditingId = null;
let cachedSkills = [];

let cachedMessages = [];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  onAuthUpdate(user => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    if (!user.email) {
      window.location.href = 'index.html';
      return;
    }

    const emailDisplay = document.getElementById('admin-email-display');
    if (emailDisplay) {
      emailDisplay.textContent = user.email || 'Admin User';
    }

    initDashboard();
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logoutAdmin();
      window.location.href = 'login.html';
    });
  }
});

async function initDashboard() {
  await Promise.all([
    refreshProjectsTable(),
    refreshAchievementsTable(),
    refreshMessagesTable()
  ]);

  // Subscribe to real-time skill updates
  refreshSkillsTable();

  updateSummaryStats();
  setupSearchFilters();
  setupAdminSidebarNavigation();
  setupProfileResumeUploads();

  // Setup Add & Reseed Buttons
  document.getElementById('add-project-btn')?.addEventListener('click', () => openProjectModal());
  document.getElementById('add-achievement-btn')?.addEventListener('click', () => openAchievementModal());
  document.getElementById('add-skill-btn')?.addEventListener('click', () => openSkillModal());

  // Setup Form Submissions
  document.getElementById('project-form')?.addEventListener('submit', handleProjectFormSubmit);
  document.getElementById('achievement-form')?.addEventListener('submit', handleAchievementSubmit);
  document.getElementById('skill-form')?.addEventListener('submit', handleSkillSubmit);

  // Setup Modal Close Triggers
  document.querySelectorAll('.modal-close-trigger').forEach(btn => btn.addEventListener('click', closeProjectModal));
  document.querySelectorAll('.achievement-close').forEach(btn => btn.addEventListener('click', closeAchievementModal));
  document.querySelectorAll('.skill-close').forEach(btn => btn.addEventListener('click', closeSkillModal));
}

function updateSummaryStats() {
  const pCount = document.getElementById('stat-total-projects');
  const aCount = document.getElementById('stat-total-achievements');
  const mCount = document.getElementById('stat-unread-messages');
  const sCount = document.getElementById('stat-total-skills');

  if (pCount) pCount.textContent = cachedProjects.length;
  if (aCount) aCount.textContent = cachedAchievements.length;
  if (mCount) mCount.textContent = cachedMessages.filter(m => !m.replied).length;
  if (sCount) sCount.textContent = cachedSkills.length;
}

function setupSearchFilters() {
  document.getElementById('projects-search-input')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = cachedProjects.filter(p =>
      p.title?.toLowerCase().includes(term) ||
      (p.technologies || []).some(t => t.toLowerCase().includes(term))
    );
    renderProjects(filtered);
  });

  document.getElementById('achievements-search-input')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = cachedAchievements.filter(a =>
      a.title?.toLowerCase().includes(term) ||
      a.organization?.toLowerCase().includes(term) ||
      a.category?.toLowerCase().includes(term)
    );
    renderAchievements(filtered);
  });

  document.getElementById('messages-search-input')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = cachedMessages.filter(m =>
      m.name?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.subject?.toLowerCase().includes(term)
    );
    renderMessages(filtered);
  });
}

// ==================== PROJECTS MANAGEMENT ====================

async function refreshProjectsTable() {
  const res = await getProjects();
  if (res.success) {
    cachedProjects = res.projects || [];
    renderProjects(cachedProjects);
    updateSummaryStats();
  }
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-table-body');
  if (!grid) return;

  if (projects.length === 0) {
    grid.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--text-muted); grid-column: 1 / -1;">No projects found.</p>`;
    return;
  }

  const defaultImg = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80';

  grid.innerHTML = projects.map(project => `
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn-icon delete" data-id="${project.id}" title="Delete Project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.action-btn-icon.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const proj = cachedProjects.find(p => p.id === btn.getAttribute('data-id'));
      if (proj) openProjectModal(proj);
    });
  });

  grid.querySelectorAll('.action-btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this project?')) {
        const res = await deleteProject(id);
        if (res.success) {
          showAdminToast('Project deleted successfully.', 'success');
          refreshProjectsTable();
        } else {
          showAdminToast('Failed to delete: ' + res.error, 'error');
        }
      }
    });
  });
}

async function handleProjectFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('project-title').value.trim();
  const description = document.getElementById('project-desc').value.trim();
  const manualImages = document.getElementById('project-images').value.split('\n').map(u => u.trim()).filter(Boolean);
  const fileInput = document.getElementById('project-file-input');
  const technologies = document.getElementById('project-techs').value.split(',').map(t => t.trim()).filter(Boolean);
  const github = document.getElementById('project-github').value.trim();
  const liveDemo = document.getElementById('project-demo').value.trim();
  const featured = document.getElementById('project-featured').checked;

  let uploadedImages = [];
  if (fileInput && fileInput.files.length > 0) {
    showAdminToast('Uploading project images...', 'info');
    for (let file of fileInput.files) {
      const url = await uploadToCloudinary(file);
      if (url) uploadedImages.push(url);
    }
  }

  const images = [...uploadedImages, ...manualImages];
  const payload = { title, description, images, imageUrl: images[0] || '', technologies, github, liveDemo, featured };

  let res = currentEditingId ? await updateProject(currentEditingId, payload) : await addProject(payload);

  if (res.success) {
    closeProjectModal();
    refreshProjectsTable();
    showAdminToast(currentEditingId ? 'Project updated!' : 'Project added!', 'success');
  } else {
    showAdminToast('Error saving project: ' + res.error, 'error');
  }
}

function openProjectModal(proj = null) {
  const modal = document.getElementById('project-modal');
  const form = document.getElementById('project-form');
  if (!modal || !form) return;

  if (proj) {
    currentEditingId = proj.id;
    document.getElementById('modal-title').textContent = 'Edit Project';
    document.getElementById('project-title').value = proj.title || '';
    document.getElementById('project-desc').value = proj.description || '';
    document.getElementById('project-images').value = Array.isArray(proj.images) ? proj.images.join('\n') : (proj.imageUrl || '');
    document.getElementById('project-techs').value = Array.isArray(proj.technologies) ? proj.technologies.join(', ') : '';
    document.getElementById('project-github').value = proj.github || '';
    document.getElementById('project-demo').value = proj.liveDemo || '';
    document.getElementById('project-featured').checked = Boolean(proj.featured);
  } else {
    currentEditingId = null;
    document.getElementById('modal-title').textContent = 'Add New Project';
    form.reset();
  }
  modal.classList.add('active');
}

function closeProjectModal() {
  document.getElementById('project-modal')?.classList.remove('active');
}

// ==================== ACHIEVEMENTS MANAGEMENT ====================

async function refreshAchievementsTable() {
  const res = await getAchievements();
  if (res.success) {
    cachedAchievements = res.achievements || [];
    renderAchievements(cachedAchievements);
    updateSummaryStats();
  }
}

function renderAchievements(achievements) {
  const grid = document.getElementById('achievements-table-body');
  if (!grid) return;

  if (achievements.length === 0) {
    grid.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--text-muted); grid-column: 1 / -1;">No achievements found.</p>`;
    return;
  }

  const defaultImg = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80';

  grid.innerHTML = achievements.map(item => `
    <div class="item-card" data-id="${item.id}">
      <div class="item-card-media">
        <img src="${escapeHtml(item.imageUrl || defaultImg)}" alt="" onerror="this.src='${defaultImg}'" />
      </div>
      <div class="item-card-body">
        <div class="item-card-header">
          <div>
            <div class="item-card-title">${escapeHtml(item.title)}</div>
            <div class="item-card-subtitle">${escapeHtml(item.organization)}</div>
          </div>
          <span class="achievement-category ${(item.category || 'other').toLowerCase()}">${escapeHtml(item.category || 'Other')}</span>
        </div>
        <div class="item-card-meta">
          ${(item.tags || []).map(t => `<span class="table-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="item-card-footer">
        <span class="item-card-footer-label">${escapeHtml(item.year || 'N/A')}</span>
        <div class="item-card-actions">
          <button class="action-btn-icon edit" data-id="${item.id}" title="Edit Achievement">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn-icon delete" data-id="${item.id}" title="Delete Achievement">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.action-btn-icon.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const ach = cachedAchievements.find(a => a.id === btn.getAttribute('data-id'));
      if (ach) openAchievementModal(ach);
    });
  });

  grid.querySelectorAll('.action-btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this achievement?')) {
        const res = await deleteAchievement(id);
        if (res.success) {
          showAdminToast('Achievement deleted.', 'success');
          refreshAchievementsTable();
        } else {
          showAdminToast('Failed to delete: ' + res.error, 'error');
        }
      }
    });
  });
}

async function handleAchievementSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('achievement-title').value.trim();
  const organization = document.getElementById('achievement-org').value.trim();
  const year = document.getElementById('achievement-year').value.trim();
  const category = document.getElementById('achievement-category').value;
  const description = document.getElementById('achievement-desc').value.trim();
  const tags = document.getElementById('achievement-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const manualImages = document.getElementById('achievement-images').value.split('\n').map(u => u.trim()).filter(Boolean);
  const fileInput = document.getElementById('achievement-file-input');
  const featured = document.getElementById('achievement-featured').checked;

  let uploadedImages = [];
  if (fileInput && fileInput.files.length > 0) {
    showAdminToast('Uploading achievement images...', 'info');
    for (let file of fileInput.files) {
      const url = await uploadToCloudinary(file);
      if (url) uploadedImages.push(url);
    }
  }

  const images = [...uploadedImages, ...manualImages];
  const payload = { title, organization, year, category, description, tags, images, imageUrl: images[0] || '', featured };

  let res = currentAchievementEditingId ? await updateAchievement(currentAchievementEditingId, payload) : await addAchievement(payload);

  if (res.success) {
    closeAchievementModal();
    refreshAchievementsTable();
    showAdminToast(currentAchievementEditingId ? 'Achievement updated!' : 'Achievement added!', 'success');
  } else {
    showAdminToast('Error saving: ' + res.error, 'error');
  }
}

function openAchievementModal(item = null) {
  const modal = document.getElementById('achievement-modal');
  const form = document.getElementById('achievement-form');
  if (!modal || !form) return;

  if (item) {
    currentAchievementEditingId = item.id;
    document.getElementById('achievement-modal-title').textContent = 'Edit Achievement';
    document.getElementById('achievement-title').value = item.title || '';
    document.getElementById('achievement-org').value = item.organization || '';
    document.getElementById('achievement-year').value = item.year || '';
    document.getElementById('achievement-category').value = item.category || 'Other';
    document.getElementById('achievement-desc').value = item.description || '';
    document.getElementById('achievement-tags').value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
    document.getElementById('achievement-images').value = Array.isArray(item.images) ? item.images.join('\n') : (item.imageUrl || '');
    document.getElementById('achievement-featured').checked = Boolean(item.featured);
  } else {
    currentAchievementEditingId = null;
    document.getElementById('achievement-modal-title').textContent = 'Add Achievement';
    form.reset();
  }
  modal.classList.add('active');
}

function closeAchievementModal() {
  document.getElementById('achievement-modal')?.classList.remove('active');
}

// ==================== SKILLS MANAGEMENT ====================

function refreshSkillsTable() {
  subscribeToSkills((res) => {
    if (res.success) {
      cachedSkills = res.skills || [];
    } else {
      cachedSkills = [];
      showAdminToast('Failed to load skills: ' + res.error, 'error');
    }
    renderSkills(cachedSkills);
    updateSummaryStats();
  });
}

function renderSkills(skills) {
  const grid = document.getElementById('skills-table-body');
  if (!grid) return;

  if (skills.length === 0) {
    grid.innerHTML = `<p class="empty-state-text">No custom skills in database.</p>`;
    return;
  }

  grid.innerHTML = skills.map(skill => `
    <div class="item-card" data-id="${skill.id}">
      <div class="item-card-body">
        <div class="item-card-header">
          <div class="item-card-title">
            ${skill.iconClass ? `<i class="${escapeHtml(skill.iconClass)}" style="margin-right: 0.5rem;"></i>` : ''}
            ${escapeHtml(skill.name)}
          </div>
          <span class="table-tag">${escapeHtml(skill.category)}</span>
        </div>
      </div>
      <div class="item-card-footer">
        <span class="item-card-footer-label">Skill</span>
        <div class="item-card-actions">
          <button class="action-btn-icon edit" data-id="${skill.id}" title="Edit Skill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn-icon delete" data-id="${skill.id}" title="Delete Skill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.action-btn-icon.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = cachedSkills.find(s => s.id === btn.getAttribute('data-id'));
      if (skill) openSkillModal(skill);
    });
  });

  grid.querySelectorAll('.action-btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this skill?')) {
        const res = await deleteSkill(id);
        if (res.success) {
          showAdminToast('Skill deleted.', 'success');
        } else {
          showAdminToast('Failed to delete skill: ' + res.error, 'error');
        }
      }
    });
  });
}

async function handleSkillSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('skill-name').value.trim();
  const category = document.getElementById('skill-category').value;
  const iconClass = document.getElementById('skill-icon').value.trim();

  const payload = { name, category, iconClass };

  let res = currentSkillEditingId ? await updateSkill(currentSkillEditingId, payload) : await addSkill(payload);

  if (res.success) {
    closeSkillModal();
    showAdminToast(currentSkillEditingId ? 'Skill updated!' : 'Skill added!', 'success');
  } else {
    showAdminToast('Error saving skill: ' + res.error, 'error');
  }
}

function openSkillModal(skill = null) {
  const modal = document.getElementById('skill-modal');
  const form = document.getElementById('skill-form');
  if (!modal || !form) return;

  if (skill) {
    currentSkillEditingId = skill.id;
    document.getElementById('skill-modal-title').textContent = 'Edit Skill';
    document.getElementById('skill-name').value = skill.name || '';
    document.getElementById('skill-category').value = skill.category || 'Frontend';
    document.getElementById('skill-icon').value = skill.iconClass || '';
  } else {
    currentSkillEditingId = null;
    document.getElementById('skill-modal-title').textContent = 'Add Skill';
    form.reset();
  }
  modal.classList.add('active');
}

function closeSkillModal() {
  document.getElementById('skill-modal')?.classList.remove('active');
}

// ==================== MESSAGES MANAGEMENT ====================

async function refreshMessagesTable() {
  const res = await getContactMessages();
  if (res.success) {
    cachedMessages = res.messages || [];
    renderMessages(cachedMessages);
    updateSummaryStats();
  }
}

function renderMessages(messages) {
  const grid = document.getElementById('messages-table-body');
  if (!grid) return;

  if (messages.length === 0) {
    grid.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--text-muted); grid-column: 1 / -1;">No messages received yet.</p>`;
    return;
  }

  grid.innerHTML = messages.map(msg => `
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
        <span class="item-card-footer-label">${formatDate(msg.createdAt)}</span>
        <div class="item-card-actions">
          <button class="action-btn-icon reply ${msg.replied ? 'is-replied' : ''}" data-id="${msg.id}" title="Reply via Mail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </button>
          <button class="action-btn-icon delete" data-id="${msg.id}" title="Delete Message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.action-btn-icon.reply').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const msg = cachedMessages.find(m => m.id === id);
      if (!msg) return;

      const subject = encodeURIComponent(`Reply to: ${msg.subject || 'Inquiry'}`);
      const body = encodeURIComponent(`Hi ${msg.name || ''},\n\n`);
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(msg.email)}&su=${subject}&body=${body}`;

      window.open(gmailUrl, '_blank');

      if (!msg.replied) {
        await markMessageReplied(id, true);
        await refreshMessagesTable();
      }
    });
  });

  grid.querySelectorAll('.action-btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this message?')) {
        const res = await deleteContactMessage(id);
        if (res.success) {
          showAdminToast('Message deleted.', 'success');
          refreshMessagesTable();
        } else {
          showAdminToast('Failed to delete: ' + res.error, 'error');
        }
      }
    });
  });
}

// ==================== UTILITIES & UPLOADS ====================

function showAdminToast(message, type = 'success') {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatDate(value) {
  if (!value) return 'N/A';
  let date = value.toDate ? value.toDate() : new Date(value);
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]);
}

function setupAdminSidebarNavigation() {
  const navLinks = document.querySelectorAll('.admin-sidebar-nav .admin-nav-item');
  const sections = document.querySelectorAll('#overview-section, #projects-section, #achievements-section, #skills-section, #messages-section, #profile-resume-section');

  if (!navLinks.length) return;

  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  if (sections.length && 'IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -65% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else if (link.getAttribute('href')?.startsWith('#')) {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
  }
}

// Cloudinary Direct Upload Function
async function uploadToCloudinary(file) {
  const CLOUD_NAME = "sy0cizde";
  const UPLOAD_PRESET = "portfolio_images";

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    showAdminToast('File upload failed: ' + error.message, 'error');
    return null;
  }
}

// Profile Photo & Resume Upload Event Handlers
function setupProfileResumeUploads() {
  getProfileSettings().then(res => {
    if (res.success && res.profile) {
      if (res.profile.photoUrl) {
        const displayDiv = document.getElementById('profile-url-display');
        if (displayDiv) {
          displayDiv.innerHTML = `<strong>Current Photo:</strong> <a href="${res.profile.photoUrl}" target="_blank" style="color: #3b82f6;">${res.profile.photoUrl}</a>`;
        }
      }
      if (res.profile.resumeUrl) {
        const displayDiv = document.getElementById('resume-url-display');
        if (displayDiv) {
          displayDiv.innerHTML = `<strong>Current Resume:</strong> <a href="${res.profile.resumeUrl}" target="_blank" style="color: #3b82f6;">${res.profile.resumeUrl}</a>`;
        }
      }
    }
  });

  document.getElementById('upload-profile-btn')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('profile-photo-file');
    const displayDiv = document.getElementById('profile-url-display');

    if (!fileInput || !fileInput.files.length) {
      showAdminToast('Please select a Profile Photo.', 'error');
      return;
    }

    showAdminToast('Uploading Profile Photo...', 'info');
    const url = await uploadToCloudinary(fileInput.files[0]);

    if (url) {
      const saveRes = await saveProfileSettings({ photoUrl: url });
      if (saveRes.success) {
        showAdminToast('Profile Photo uploaded & saved to database!', 'success');
        if (displayDiv) {
          displayDiv.innerHTML = `<strong>Saved Link:</strong> <a href="${url}" target="_blank" style="color: #3b82f6;">${url}</a>`;
        }
      } else {
        showAdminToast('Failed to save to database: ' + saveRes.error, 'error');
      }
    }
  });

  document.getElementById('upload-resume-btn')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('resume-file');
    const displayDiv = document.getElementById('resume-url-display');

    if (!fileInput || !fileInput.files.length) {
      showAdminToast('Please select a Resume PDF.', 'error');
      return;
    }

    showAdminToast('Uploading Resume...', 'info');
    const url = await uploadToCloudinary(fileInput.files[0]);

    if (url) {
      const saveRes = await saveProfileSettings({ resumeUrl: url });
      if (saveRes.success) {
        showAdminToast('Resume uploaded & saved to database!', 'success');
        if (displayDiv) {
          displayDiv.innerHTML = `<strong>Saved Link:</strong> <a href="${url}" target="_blank" style="color: #3b82f6;">${url}</a>`;
        }
      } else {
        showAdminToast('Failed to save to database: ' + saveRes.error, 'error');
      }
    }
  });
}