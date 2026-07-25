// js/animations.js

/**
 * Subtle typing effect for Hero title / Job roles
 * @param {HTMLElement} element 
 * @param {string[]} phrases 
 */
export function initTypingEffect(element, phrases) {
  if (!element || !phrases || phrases.length === 0) return;

  let phraseIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let typeSpeed = 100;

  function type() {
    const currentPhrase = phrases[phraseIdx];
    
    if (isDeleting) {
      element.textContent = currentPhrase.substring(0, charIdx - 1);
      charIdx--;
      typeSpeed = 50;
    } else {
      element.textContent = currentPhrase.substring(0, charIdx + 1);
      charIdx++;
      typeSpeed = 100;
    }

    if (!isDeleting && charIdx === currentPhrase.length) {
      typeSpeed = 2000; // Pause at end of phrase
      isDeleting = true;
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      typeSpeed = 500; // Pause before new phrase
    }

    setTimeout(type, typeSpeed);
  }

  type();
}

/**
 * Scroll to top button listener
 */
export function initScrollToTop() {
  const scrollTopBtn = document.querySelector('.scroll-top-btn');
  if (!scrollTopBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/**
 * Minimal scroll reveal for section elements
 */
export function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });

  document.querySelectorAll('.about-card, .skill-card, .project-card, .timeline-item, .contact-info-card, .contact-form-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    observer.observe(el);
  });

  // Inject CSS class rule for revealed elements
  const style = document.createElement('style');
  style.textContent = `
    .revealed {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);
}
