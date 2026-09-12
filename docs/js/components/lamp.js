/**
 * Aceternity UI Lamp Effect
 * Provides animated dual-conic gradient lamp beams, focused light line,
 * and viewport scroll-triggered expansion for the Three Pillars architecture section.
 */
(function (global) {
  'use strict';

  const LampEffect = {
    init: function () {
      const container = document.getElementById('lampContainerElem');
      if (!container) return;

      const beamLeft = container.querySelector('.lamp-beam-left');
      const beamRight = container.querySelector('.lamp-beam-right');
      const beamLine = container.querySelector('.lamp-beam-line');
      const glowOrb = container.querySelector('.lamp-glow-orb');
      const lampHeader = container.querySelector('.lamp-header-motion');

      if (!beamLeft || !beamRight) return;

      // Intersection Observer to trigger beam ignition and expansion on scroll
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Expand beams from 15rem to 32rem
            beamLeft.style.width = '32rem';
            beamLeft.style.opacity = '1';
            beamRight.style.width = '32rem';
            beamRight.style.opacity = '1';
            if (beamLine) beamLine.style.width = '32rem';
            if (glowOrb) glowOrb.style.width = '18rem';
            if (lampHeader) {
              lampHeader.style.opacity = '1';
              lampHeader.style.transform = 'translateY(0)';
            }
          } else {
            // Retract slightly when scrolled far away
            beamLeft.style.width = '16rem';
            beamLeft.style.opacity = '0.4';
            beamRight.style.width = '16rem';
            beamRight.style.opacity = '0.4';
            if (beamLine) beamLine.style.width = '16rem';
            if (glowOrb) glowOrb.style.width = '8rem';
            if (lampHeader) {
              lampHeader.style.opacity = '0.7';
              lampHeader.style.transform = 'translateY(15px)';
            }
          }
        });
      }, { threshold: 0.15 });

      observer.observe(container);

      // Mouse tracking for subtle lamp focus tilt
      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
        const tiltDegLeft = 70 + relX * 8;
        const tiltDegRight = 290 + relX * 8;
        beamLeft.style.setProperty('--conic-position', 'from ' + tiltDegLeft + 'deg at center top');
        beamRight.style.setProperty('--conic-position', 'from ' + tiltDegRight + 'deg at center top');
      });

      container.addEventListener('mouseleave', () => {
        beamLeft.style.setProperty('--conic-position', 'from 70deg at center top');
        beamRight.style.setProperty('--conic-position', 'from 290deg at center top');
      });
    }
  };

  global.LampEffect = LampEffect;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LampEffect.init());
  } else {
    LampEffect.init();
  }
})(typeof window !== 'undefined' ? window : this);
