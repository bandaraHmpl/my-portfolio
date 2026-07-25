// js/navigation.js

/**
 * Initializes sticky header, mobile drawer menu, scroll spy, and hidden admin access trigger
 */
export function initNavigation() {
  const navbar = document.querySelector('.navbar');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinksContainer = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  // Sticky Navbar shadow on scroll
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // Mobile menu toggle
  if (mobileMenuBtn && navLinksContainer) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinksContainer.classList.toggle('mobile-open');
      const isOpen = navLinksContainer.classList.contains('mobile-open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });

    // Close mobile menu when link clicked
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navLinksContainer.classList.remove('mobile-open');
      });
    });
  }

  // Active navigation highlighting on scroll
  if (sections.length > 0) {
    window.addEventListener('scroll', () => {
      let currentSectionId = '';
      const scrollY = window.pageYOffset;

      sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const id = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          currentSectionId = id;
        }
      });

      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSectionId}` || link.getAttribute('href') === `index.html#${currentSectionId}`) {
          link.classList.add('active');
        }
      });
    });
  }

  // Initialize Hidden Admin Access shortcut
  initHiddenAdminTrigger();
}

/**
 * Hidden Admin Access shortcut:
 * Clicking the website logo or profile photo 5 consecutive times within 3 seconds
 * automatically redirects to the Admin Login page (login.html).
 */
export function initHiddenAdminTrigger() {
  const triggers = document.querySelectorAll('.nav-logo, #nav-brand-logo, .hero-img, #hero-profile-photo, .hero-image-frame img');
  if (!triggers.length) return;

  const REQUIRED_CLICKS = 5;
  const TIME_FRAME_MS = 3000;

  triggers.forEach(trigger => {
    let clickCount = 0;
    let clickTimer = null;

    const handleSecretClick = (e) => {
      clickCount++;

      // If this is the first click in a sequence, start the 3-second timer
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
          clickTimer = null;
        }, TIME_FRAME_MS);
      }

      // Check if threshold reached
      if (clickCount >= REQUIRED_CLICKS) {
        e.preventDefault();
        e.stopPropagation();

        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        clickCount = 0;

        // Redirect to Admin Login page
        window.location.href = 'login.html';
      }
    };

    trigger.addEventListener('click', handleSecretClick);
  });
}

