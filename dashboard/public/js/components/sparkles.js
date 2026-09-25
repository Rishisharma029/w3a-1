(function () {
  class SparklesCore {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.minSize = options.minSize || 0.4;
      this.maxSize = options.maxSize || 1.0;
      this.particleDensity = options.particleDensity || 1200;
      this.particleColor = options.particleColor || '#FFFFFF';
      this.speed = options.speed || 0.4;
      this.particles = [];
      this.animationFrame = null;
      this.width = 0;
      this.height = 0;

      this.init();
    }

    init() {
      this.resize();
      this.initParticles();
      this.animate();

      window.addEventListener('resize', () => {
        this.resize();
        this.initParticles();
      });
    }

    resize() {
      const rect = this.canvas.parentElement
        ? this.canvas.parentElement.getBoundingClientRect()
        : this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = rect.width || 640;
      this.height = rect.height || 160;

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.scale(dpr, dpr);
    }

    initParticles() {
      this.particles = [];
      const areaFactor = (this.width * this.height) / (400 * 400);
      const count = Math.max(120, Math.min(this.particleDensity, Math.floor(this.particleDensity * areaFactor * 0.75)));

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: Math.random() * (this.maxSize - this.minSize) + this.minSize,
          opacity: Math.random() * 0.9 + 0.1,
          opacitySpeed: (Math.random() * 0.02 + 0.008) * (this.speed * 2),
          opacityDir: Math.random() > 0.5 ? 1 : -1,
          vx: (Math.random() - 0.5) * this.speed * 0.6,
          vy: (Math.random() - 0.5) * this.speed * 0.6,
        });
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        p.opacity += p.opacitySpeed * p.opacityDir;
        if (p.opacity >= 1) {
          p.opacity = 1;
          p.opacityDir = -1;
        } else if (p.opacity <= 0.1) {
          p.opacity = 0.1;
          p.opacityDir = 1;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;

        this.ctx.save();
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = this.particleColor;
        this.ctx.shadowBlur = p.size * 2.5;
        this.ctx.shadowColor = this.particleColor;

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    destroy() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
    }
  }

  window.SparklesCore = SparklesCore;

  window.SparklesEffect = {
    instances: [],

    init() {
      const canvases = document.querySelectorAll('.aceternity-sparkles-canvas');
      canvases.forEach((canvas) => {
        if (!canvas._sparklesInstance) {
          const density = parseInt(canvas.getAttribute('data-density') || '1200', 10);
          const minSize = parseFloat(canvas.getAttribute('data-min-size') || '0.4');
          const maxSize = parseFloat(canvas.getAttribute('data-max-size') || '1.0');
          const color = canvas.getAttribute('data-color') || '#FFFFFF';
          const speed = parseFloat(canvas.getAttribute('data-speed') || '0.4');

          const instance = new SparklesCore(canvas, {
            particleDensity: density,
            minSize,
            maxSize,
            particleColor: color,
            speed,
          });
          canvas._sparklesInstance = instance;
          this.instances.push(instance);
        }
      });
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.SparklesEffect?.init();
    }, 200);
  });
})();
