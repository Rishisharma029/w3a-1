(function (global) {
  'use strict';

  const ShootingStarsBackground = {
    canvas: null,
    ctx: null,
    svg: null,
    stars: [],
    shootingStar: null,
    animFrameId: null,
    shootTimerId: null,
    starDensity: 0.00016,
    twinkleProbability: 0.75,
    minTwinkleSpeed: 0.4,
    maxTwinkleSpeed: 1.2,

    init: function () {
      this.canvas = document.getElementById('w3aStarsBgCanvas');
      this.svg = document.getElementById('w3aShootingStarsSvg');
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) return;

      this.handleResize = this.handleResize.bind(this);
      this.render = this.render.bind(this);
      this.createShootingStar = this.createShootingStar.bind(this);

      this.handleResize();
      window.addEventListener('resize', this.handleResize);

      // Start star rendering loop
      this.render();

      // Start shooting star spawner
      this.scheduleShootingStar();
    },

    handleResize: function () {
      if (!this.canvas || !this.ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.ctx.scale(dpr, dpr);

      this.generateStars(width, height);
    },

    generateStars: function (width, height) {
      const area = width * height;
      const numStars = Math.floor(area * this.starDensity);
      this.stars = [];

      for (let i = 0; i < numStars; i++) {
        const shouldTwinkle = Math.random() < this.twinkleProbability;
        this.stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 0.9 + 0.4, // 0.4px to 1.3px
          opacity: Math.random() * 0.6 + 0.3,
          baseOpacity: Math.random() * 0.5 + 0.3,
          twinkleSpeed: shouldTwinkle
            ? this.minTwinkleSpeed + Math.random() * (this.maxTwinkleSpeed - this.minTwinkleSpeed)
            : null,
          phase: Math.random() * Math.PI * 2
        });
      }
    },

    scheduleShootingStar: function () {
      const delay = Math.random() * 2500 + 1200; // 1.2s to 3.7s
      this.shootTimerId = setTimeout(() => {
        this.createShootingStar();
        this.scheduleShootingStar();
      }, delay);
    },

    createShootingStar: function () {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0, angle = 45;

      switch (side) {
        case 0:
          x = Math.random() * width;
          y = 0;
          angle = 45;
          break;
        case 1:
          x = width;
          y = Math.random() * height;
          angle = 135;
          break;
        case 2:
          x = Math.random() * width;
          y = height;
          angle = 225;
          break;
        case 3:
          x = 0;
          y = Math.random() * height;
          angle = 315;
          break;
      }

      this.shootingStar = {
        id: Date.now(),
        x: x,
        y: y,
        angle: angle,
        scale: 1,
        speed: Math.random() * 16 + 12,
        distance: 0,
        starWidth: 12,
        starHeight: 1.5
      };
    },

    render: function () {
      if (!this.ctx || !this.canvas) return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const now = performance.now() * 0.001;

      // Clear Canvas
      this.ctx.clearRect(0, 0, width, height);

      // Render Twinkling Stars
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        let currentOpacity = s.opacity;

        if (s.twinkleSpeed !== null) {
          currentOpacity = s.baseOpacity + Math.abs(Math.sin(now / s.twinkleSpeed + s.phase)) * 0.5;
        }

        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.min(currentOpacity, 1) + ')';
        this.ctx.fill();
      }

      // Update & Render Shooting Star
      if (this.svg && this.shootingStar) {
        const star = this.shootingStar;
        const rad = (star.angle * Math.PI) / 180;
        star.x += star.speed * Math.cos(rad);
        star.y += star.speed * Math.sin(rad);
        star.distance += star.speed;
        star.scale = 1 + star.distance / 120;

        if (
          star.x < -40 ||
          star.x > width + 40 ||
          star.y < -40 ||
          star.y > height + 40
        ) {
          this.shootingStar = null;
          this.svg.innerHTML = `<defs>
            <linearGradient id="shootingStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f2ff" stop-opacity="0" />
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="1" />
            </linearGradient>
          </defs>`;
        } else {
          const rectW = star.starWidth * star.scale;
          const rectH = star.starHeight;
          const cx = star.x + rectW / 2;
          const cy = star.y + rectH / 2;

          this.svg.innerHTML = `<defs>
            <linearGradient id="shootingStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f2ff" stop-opacity="0" />
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="1" />
            </linearGradient>
          </defs>
          <rect
            x="${star.x}"
            y="${star.y}"
            width="${rectW}"
            height="${rectH}"
            fill="url(#shootingStarGradient)"
            transform="rotate(${star.angle}, ${cx}, ${cy})"
          />`;
        }
      }

      this.animFrameId = requestAnimationFrame(this.render);
    },

    destroy: function () {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      if (this.shootTimerId) clearTimeout(this.shootTimerId);
      window.removeEventListener('resize', this.handleResize);
    }
  };

  global.ShootingStarsBackground = ShootingStarsBackground;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ShootingStarsBackground.init());
  } else {
    ShootingStarsBackground.init();
  }
})(typeof window !== 'undefined' ? window : this);
