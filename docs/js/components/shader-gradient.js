/**
 * W3A-1 ShaderGradient Component
 * Powered by Three.js & GLSL noise shaders (inspired by ruucm/shadergradient)
 * Provides silky, 3D fluid animated gradient meshes with interactive tilt
 */

(function () {
  'use strict';

  // Perlin 3D Simplex noise GLSL from ruucm/shadergradient
  const NOISE_GLSL = `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

    float cnoise(vec3 P) {
      vec3 Pi0 = floor(P);
      vec3 Pi1 = Pi0 + vec3(1.0);
      Pi0 = mod289(Pi0);
      Pi1 = mod289(Pi1);
      vec3 Pf0 = fract(P);
      vec3 Pf1 = Pf0 - vec3(1.0);
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz;
      vec4 iz1 = Pi1.zzzz;

      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0);
      vec4 ixy1 = permute(ixy + iz1);

      vec4 gx0 = ixy0 * (1.0 / 7.0);
      vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5);
      gy0 -= sz0 * (step(0.0, gy0) - 0.5);

      vec4 gx1 = ixy1 * (1.0 / 7.0);
      vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5);
      gy1 -= sz1 * (step(0.0, gy1) - 0.5);

      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
      vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
      vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
      vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
      vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
      g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
      g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

      float n000 = dot(g000, Pf0);
      float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
      float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
      float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
      float n111 = dot(g111, Pf1);

      vec3 fade_xyz = fade(Pf0);
      vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
      return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
    }
  `;

  const VERTEX_SHADER = `
    ${NOISE_GLSL}
    varying vec3 vPos;
    varying vec2 vUv;
    varying vec3 vNormal;

    uniform float uTime;
    uniform float uSpeed;
    uniform float uNoiseDensity;
    uniform float uNoiseStrength;

    void main() {
      vUv = uv;
      vNormal = normal;

      float t = uTime * uSpeed;
      // Multi-octave wave displacement
      float distortion = 0.65 * cnoise(0.45 * position * uNoiseDensity + t)
                       + 0.35 * sin(position.x * 0.5 + t * 1.2) * cos(position.y * 0.5 + t * 0.8);

      vec3 pos = position + normal * distortion * uNoiseStrength;
      vPos = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    varying vec3 vPos;
    varying vec2 vUv;
    varying vec3 vNormal;

    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColorBg;
    uniform float uGrain;
    uniform float uOpacity;
    uniform float uTime;

    // Pseudo-random micro grain generator for filmic finish
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // 3-way color blending along 3D space
      float factorX = smoothstep(-4.0, 4.0, vPos.x);
      float factorZ = smoothstep(-2.5, 3.5, vPos.z);
      
      vec3 grad = mix(mix(uColor1, uColor2, factorX), uColor3, factorZ);

      // Blend with deep background for cyber telemetry feel
      vec3 finalColor = mix(uColorBg, grad, 0.72);

      // Subtle dynamic grain
      if (uGrain > 0.0) {
        float noiseVal = rand(vUv * (uTime * 0.05 + 1.0)) * 0.065 * uGrain;
        finalColor += vec3(noiseVal);
      }

      gl_FragColor = vec4(finalColor, uOpacity);
    }
  `;

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255
    };
  }

  class ShaderGradientInstance {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) {
        console.warn('[ShaderGradient] Container not found:', container);
        return;
      }

      this.options = Object.assign({
        color1: '#00f2ff',      // Cyber Cyan
        color2: '#10b981',      // Safe Emerald
        color3: '#6366f1',      // Web3 Indigo
        bgColor: '#090e1b',     // Deep Obsidian
        speed: 0.28,
        density: 1.15,
        strength: 2.2,
        grain: 0.4,
        opacity: 0.75,
        wireframe: false,
        interactive: true,
        cameraDistance: 4.8,
        planeResolution: 128
      }, options);

      this.isDestroyed = false;
      this.isVisible = true;
      this.mouseX = 0;
      this.mouseY = 0;
      this.targetRotationX = 0;
      this.targetRotationY = 0;

      this.init();
    }

    init() {
      if (!window.THREE) {
        console.warn('[ShaderGradient] THREE is not loaded on window.');
        return;
      }

      const THREE = window.THREE;
      const rect = this.container.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;

      // 1. Scene & Camera
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      this.camera.position.set(0, 0, this.options.cameraDistance);

      // 2. WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // Style canvas to cover container
      const canvas = this.renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '0';
      this.container.style.position = this.container.style.position || 'relative';
      this.container.insertBefore(canvas, this.container.firstChild);

      // 3. Shader Material with uniforms
      const c1 = hexToRgb(this.options.color1);
      const c2 = hexToRgb(this.options.color2);
      const c3 = hexToRgb(this.options.color3);
      const cBg = hexToRgb(this.options.bgColor);

      this.uniforms = {
        uTime: { value: 0 },
        uSpeed: { value: this.options.speed },
        uNoiseDensity: { value: this.options.density },
        uNoiseStrength: { value: this.options.strength },
        uGrain: { value: this.options.grain },
        uOpacity: { value: this.options.opacity },
        uColor1: { value: new THREE.Vector3(c1.r, c1.g, c1.b) },
        uColor2: { value: new THREE.Vector3(c2.r, c2.g, c2.b) },
        uColor3: { value: new THREE.Vector3(c3.r, c3.g, c3.b) },
        uColorBg: { value: new THREE.Vector3(cBg.r, cBg.g, cBg.b) }
      };

      this.material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: this.uniforms,
        transparent: true,
        wireframe: this.options.wireframe,
        side: THREE.DoubleSide
      });

      // 4. Geometry & Mesh
      this.geometry = new THREE.PlaneGeometry(12, 10, this.options.planeResolution, this.options.planeResolution);
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.mesh.rotation.x = -0.35; // gentle upward tilt
      this.mesh.rotation.z = 0.1;
      this.scene.add(this.mesh);

      // 5. Event Listeners
      this.clock = new THREE.Clock();
      this.handleResize = this.onResize.bind(this);
      this.handleMouseMove = this.onMouseMove.bind(this);
      this.handleVisibility = this.onVisibilityChange.bind(this);

      window.addEventListener('resize', this.handleResize, { passive: true });
      if (this.options.interactive) {
        window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
      }
      document.addEventListener('visibilitychange', this.handleVisibility, { passive: true });

      // Start loop
      this.animate();
    }

    onResize() {
      if (this.isDestroyed || !this.renderer || !this.camera) return;
      const rect = this.container.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    onMouseMove(e) {
      if (!this.options.interactive) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      this.targetRotationY = nx * 0.18;
      this.targetRotationX = -0.35 + ny * 0.12;
    }

    onVisibilityChange() {
      this.isVisible = !document.hidden;
      if (this.isVisible) {
        this.clock.start();
      } else {
        this.clock.stop();
      }
    }

    setColors(c1Hex, c2Hex, c3Hex) {
      if (c1Hex) {
        const c = hexToRgb(c1Hex);
        this.uniforms.uColor1.value.set(c.r, c.g, c.b);
      }
      if (c2Hex) {
        const c = hexToRgb(c2Hex);
        this.uniforms.uColor2.value.set(c.r, c.g, c.b);
      }
      if (c3Hex) {
        const c = hexToRgb(c3Hex);
        this.uniforms.uColor3.value.set(c.r, c.g, c.b);
      }
    }

    animate() {
      if (this.isDestroyed) return;
      requestAnimationFrame(this.animate.bind(this));

      if (!this.isVisible) return;

      const delta = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();

      this.uniforms.uTime.value = elapsedTime;

      // Smooth camera/mesh tilt damping
      if (this.options.interactive && this.mesh) {
        this.mesh.rotation.y += (this.targetRotationY - this.mesh.rotation.y) * 0.05;
        this.mesh.rotation.x += (this.targetRotationX - this.mesh.rotation.x) * 0.05;
      }

      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      this.isDestroyed = true;
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('visibilitychange', this.handleVisibility);

      if (this.geometry) this.geometry.dispose();
      if (this.material) this.material.dispose();
      if (this.renderer) {
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
      }
    }
  }

  // Global Registry / Factory
  window.ShaderGradient = {
    create: function (container, options) {
      return new ShaderGradientInstance(container, options);
    },
    // Cyberpunk/Safe-Spend color palettes
    palettes: {
      cyberSafe: { color1: '#00f2ff', color2: '#10b981', color3: '#6366f1', bgColor: '#090e1b' },
      emeraldGuard: { color1: '#10b981', color2: '#059669', color3: '#00f2ff', bgColor: '#06131c' },
      violetGovernance: { color1: '#818cf8', color2: '#c084fc', color3: '#00f2ff', bgColor: '#0a0d1d' },
      securityAlert: { color1: '#ef4444', color2: '#f59e0b', color3: '#6366f1', bgColor: '#180a12' }
    }
  };
})();
