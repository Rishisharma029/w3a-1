(function() {
  class FloatingNavbarController {
    constructor() {
      this.navElement = null;
      this.lastScrollY = 0;
      this.visible = true;
      this.ticking = false;
      this.init();
    }

    init() {
      if (document.readyState === loading) {
        document.addEventListener(DOMContentLoaded, () => this.mount());
      } else {
        this.mount();
      }
    }

    mount() {
      this.navElement = document.getElementById(w3aFloatingNavbar);
      if (!this.navElement) return;

      window.addEventListener(scroll, () => this.onScroll(window.scrollY), { passive: true });
      
      const mainContent = document.getElementById(mainContent);
      if (mainContent) {
        mainContent.addEventListener(scroll, () => this.onScroll(mainContent.scrollTop), { passive: true });
      }

      this.updateActiveNav();
      window.addEventListener(w3a:view-changed, () => this.updateActiveNav());
    }

    onScroll(currentScrollY) {
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.handleScrollLogic(currentScrollY);
          this.ticking = false;
        });
        this.ticking = true;
      }
    }

    handleScrollLogic(currentScrollY) {
      if (!this.navElement) return;

      const delta = currentScrollY - this.lastScrollY;
      const buffer = 40;

      if (currentScrollY < buffer) {
        this.setVisible(true);
      } else {
        if (delta < -3) {
          this.setVisible(true);
        } else if (delta > 5) {
          this.setVisible(false);
        }
      }

      this.lastScrollY = Math.max(0, currentScrollY);
    }

    setVisible(show) {
      if (this.visible === show) return;
      this.visible = show;

      if (!this.navElement) return;

      if (show) {
        this.navElement.classList.remove(-translate-y-28, opacity-0, pointer-events-none);
        this.navElement.classList.add(translate-y-0, opacity-100, pointer-events-auto);
      } else {
        this.navElement.classList.remove(translate-y-0, opacity-100, pointer-events-auto);
        this.navElement.classList.add(-translate-y-28, opacity-0, pointer-events-none);
      }
    }

    updateActiveNav() {
      const currentView = window.AppState ? window.AppState.currentView : overview;
      const links = document.querySelectorAll(.floating-nav-link);
      links.forEach(link => {
        const targetView = link.getAttribute(data-view);
        if (targetView === currentView) {
          link.classList.add(text-white, bg-white/10, shadow-[0_0_15px_rgba(255,255,255,0.15)]);
          link.classList.remove(text-neutral-400, hover:text-neutral-200);
          const activeDot = link.querySelector(.floating-nav-active-dot);
          if (activeDot) activeDot.classList.remove(hidden);
        } else {
          link.classList.remove(text-white, bg-white/10, shadow-[0_0_15px_rgba(255,255,255,0.15)]);
          link.classList.add(text-neutral-400, hover:text-neutral-200);
          const activeDot = link.querySelector(.floating-nav-active-dot);
          if (activeDot) activeDot.classList.add(hidden);
        }
      });
    }
  }

  window.FloatingNavbar = new FloatingNavbarController();
})();
