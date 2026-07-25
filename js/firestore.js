// js/firestore.js
import {
  collection,
  getDocs,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from './firebase-config.js';

const PROJECTS_COLLECTION = 'projects';
const MESSAGES_COLLECTION = 'messages';
const ACHIEVEMENTS_COLLECTION = 'achievements';

/**
 * Fetch all projects from Firestore (returns SAMPLE_PROJECTS if collection is empty or unauthenticated)
 */
export async function getProjects() {
  try {
    const projectsCol = collection(db, PROJECTS_COLLECTION);
    const q = query(projectsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Attempt seeding if authenticated, otherwise return SAMPLE_PROJECTS fallback
      /**const seedResult = await seedInitialProjects();
      if (seedResult.success) {
        const newSnapshot = await getDocs(q);
        const projects = newSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        return { success: true, projects };
      }
      return { success: true, projects: SAMPLE_PROJECTS };**/
      return {
        success: true,
        projects: []
      };
    }

    const projects = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    return { success: true, projects };
  } catch (error) {
  console.error('Fetching projects failed:', error.message);

  return {
    success:false,
    projects:[]
  };
}
}

/**
 * Fetch single project by ID
 */
export async function getProjectById(id) {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, project: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Project not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Add a new project to Firestore
 */
export async function addProject(projectData) {
  try {
    const dataToSave = {
      title: projectData.title || 'Untitled Project',
      description: projectData.description || '',
      imageUrl: projectData.imageUrl || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
      technologies: Array.isArray(projectData.technologies) 
        ? projectData.technologies 
        : (projectData.technologies || '').split(',').map(t => t.trim()).filter(Boolean),
      github: projectData.github || '',
      liveDemo: projectData.liveDemo || '',
      featured: Boolean(projectData.featured),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), dataToSave);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update existing project in Firestore
 */
export async function updateProject(id, projectData) {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, id);
    const dataToUpdate = {
      title: projectData.title,
      description: projectData.description,
      imageUrl: projectData.imageUrl,
      technologies: Array.isArray(projectData.technologies) 
        ? projectData.technologies 
        : (projectData.technologies || '').split(',').map(t => t.trim()).filter(Boolean),
      github: projectData.github,
      liveDemo: projectData.liveDemo,
      featured: Boolean(projectData.featured)
    };

    await updateDoc(docRef, dataToUpdate);
    return { success: true };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete project from Firestore
 */
export async function deleteProject(id) {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Seed initial projects into Firestore
 
export async function seedInitialProjects() {
  try {
    const projectsCol = collection(db, PROJECTS_COLLECTION);
    for (const project of SAMPLE_PROJECTS) {
      await addDoc(projectsCol, project);
    }
    return { success: true };
  } catch (error) {
    console.warn('Could not seed projects to Firestore (requires admin authentication):', error.message);
    return { success: false, error: error.message };
  }
}**/

/**
 * Save contact message to Firestore
 */
export async function saveContactMessage(messageData) {
  try {
    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
      name: messageData.name,
      email: messageData.email,
      subject: messageData.subject || 'Portfolio Inquiry',
      message: messageData.message,
      replied: false,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving contact message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all contact messages for admin
 */
export async function getContactMessages() {
  try {
    const messagesCol = collection(db, MESSAGES_COLLECTION);
    const q = query(messagesCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, messages };
  } catch (error) {
    return { success: false, error: error.message, messages: [] };
  }
}

/**
 * Mark a contact message as replied / not replied
 */
export async function markMessageReplied(id, replied = true) {
  try {
    const docRef = doc(db, MESSAGES_COLLECTION, id);
    await updateDoc(docRef, { replied: Boolean(replied) });
    return { success: true };
  } catch (error) {
    console.error('Error updating message status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a contact message from Firestore
 */
export async function deleteContactMessage(id) {
  try {
    const docRef = doc(db, MESSAGES_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting contact message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all achievements from Firestore
 */
export async function getAchievements() {
  try {
    const col = collection(db, ACHIEVEMENTS_COLLECTION);
    const q = query(col, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const achievements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      achievements
    };
  } catch (error) {
    return {
      success: false,
      achievements: [],
      error: error.message
    };
  }
}

/**
 * Add a new achievement to Firestore
 */
export async function addAchievement(data) {
  try {
    await addDoc(
      collection(db, ACHIEVEMENTS_COLLECTION),
      {
        title: data.title,
        organization: data.organization || '',
        year: data.year || '',
        category: data.category || 'Other',
        description: data.description || '',
        tags: Array.isArray(data.tags)
          ? data.tags
          : (data.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        imageUrl: data.imageUrl || '',
        featured: Boolean(data.featured),
        createdAt: serverTimestamp()
      }
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update existing achievement in Firestore
 */
export async function updateAchievement(id, data) {
  try {
    const docRef = doc(db, ACHIEVEMENTS_COLLECTION, id);
    const dataToUpdate = {
      title: data.title,
      organization: data.organization || '',
      year: data.year || '',
      category: data.category || 'Other',
      description: data.description || '',
      tags: Array.isArray(data.tags)
        ? data.tags
        : (data.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      imageUrl: data.imageUrl || '',
      featured: Boolean(data.featured)
    };

    await updateDoc(docRef, dataToUpdate);
    return { success: true };
  } catch (error) {
    console.error('Error updating achievement:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete achievement from Firestore
 */
export async function deleteAchievement(id) {
  try {
    const docRef = doc(db, ACHIEVEMENTS_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return { success: false, error: error.message };
  }
}