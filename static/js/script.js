// script.js
// Loading screen functionality
window.addEventListener("load", () => {
  const loadingScreen = document.getElementById("loading-screen");

  if (loadingScreen) {
    // Show loading screen for minimum 2 seconds for better effect
    setTimeout(() => {
      loadingScreen.classList.add("hidden");

      // Remove loading screen from DOM after transition
      setTimeout(() => {
        if (loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
      }, 500);
    }, 2000); // 2 second minimum loading time
  }
});

// Mobile menu toggle
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const navMenu = document.querySelector(".nav-menu");

if (mobileMenuBtn && navMenu) {
  mobileMenuBtn.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });
}

// Close mobile menu when clicking on a link
document.querySelectorAll(".nav-menu a").forEach((link) => {
  link.addEventListener("click", (e) => {
    if (navMenu) {
      navMenu.classList.remove("active");
    }

    // Additional handling for home link in mobile menu
    if (link.getAttribute("href") === "#home") {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }
  });
});

// Hero slider
const slides = document.querySelectorAll(".slide");
let currentSlide = 0;

function nextSlide() {
  if (slides.length > 0) {
    slides[currentSlide].classList.remove("active");
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add("active");
  }
}

// Auto-play slider only if slides exist
if (slides.length > 0) {
  setInterval(nextSlide, 5000);
}

// Smooth scrolling for navigation links with special handling for home
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const targetId = this.getAttribute("href");

    // Special handling for home link
    if (targetId === "#home") {
      // Force scroll to absolute top
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Also use window.scrollTo as backup
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    } else {
      // Normal scroll behavior for other sections
      const target = document.querySelector(targetId);
      if (target) {
        // Calculate offset for fixed header
        const headerHeight =
          document.querySelector(".header")?.offsetHeight || 80;
        const targetPosition =
          target.getBoundingClientRect().top +
          window.pageYOffset -
          headerHeight -
          20;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });
      }
    }
  });
});

// Header background change on scroll
const header = document.querySelector(".header");
if (header) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      header.style.background = "rgba(255, 255, 255, 0.98)";
      header.style.backdropFilter = "blur(15px)";
    } else {
      header.style.background = "rgba(255, 255, 255, 0.95)";
      header.style.backdropFilter = "blur(10px)";
    }
  });
}

// Animate elements on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("fade-in-up");
    }
  });
}, observerOptions);

// Observe elements for animation
document
  .querySelectorAll(".facility-card, .gallery-item, .contact-item")
  .forEach((el) => {
    observer.observe(el);
  });

// Form submission
const contactForm = document.querySelector(".contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Get form data
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.classList.add("loading");

    // Send form data to Flask backend
    fetch("/submit-contact", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Thank you for your message! We will get back to you soon.");
          this.reset();
        } else {
          alert(
            "Sorry, there was an error sending your message. Please try again."
          );
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(
          "Sorry, there was an error sending your message. Please try again."
        );
      })
      .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.classList.remove("loading");
      });
  });
}

// Gallery lightbox effect
document.querySelectorAll(".gallery-item").forEach((item) => {
  item.addEventListener("click", function () {
    const img = this.querySelector("img");
    const titleElement = this.querySelector(".gallery-title");

    if (img && titleElement) {
      const title = titleElement.textContent;

      // Create simple modal
      const modal = document.createElement("div");
      modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                cursor: pointer;
            ">
                <div style="text-align: center;">
                    <img src="${img.src}" style="max-width: 90%; max-height: 80vh; border-radius: 10px;">
                    <h3 style="color: white; margin-top: 1rem;">${title}</h3>
                </div>
            </div>
        `;

      document.body.appendChild(modal);

      // Close on click
      modal.addEventListener("click", () => {
        document.body.removeChild(modal);
      });
    }
  });
});

// Add premium interactions
document.querySelectorAll(".facility-card").forEach((card) => {
  card.addEventListener("mouseenter", function () {
    this.style.transform = "translateY(-10px) scale(1.02)";
  });

  card.addEventListener("mouseleave", function () {
    this.style.transform = "translateY(-10px) scale(1)";
  });
});

// Parallax effect for hero section
const hero = document.querySelector(".hero");
if (hero) {
  window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset;
    hero.style.transform = `translateY(${scrolled * 0.5}px)`;
  });
}

// Add loading animation
window.addEventListener("load", () => {
  // Loading screen is already handled above
  document.body.style.opacity = "1";
});
