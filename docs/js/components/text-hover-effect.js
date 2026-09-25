window.TextHoverEffect = {
  render(text = "GENOVA", containerId = "genovaTextHoverContainer") {
    const idPrefix = "the_" + Math.random().toString(36).substr(2, 6);
    return `
      <div class="relative w-full h-full flex items-center justify-center select-none" id="${containerId}">
        <svg
          id="${idPrefix}_svg"
          width="100%"
          height="100%"
          viewBox="0 0 320 90"
          xmlns="http://www.w3.org/2000/svg"
          class="w-full h-full select-none cursor-pointer overflow-visible"
        >
          <defs>
            <linearGradient
              id="${idPrefix}_textGradient"
              gradientUnits="userSpaceOnUse"
              cx="50%"
              cy="50%"
              r="25%"
            >
              <stop offset="0%" stop-color="#eab308" />
              <stop offset="25%" stop-color="#ef4444" />
              <stop offset="50%" stop-color="#3b82f6" />
              <stop offset="75%" stop-color="#06b6d4" />
              <stop offset="100%" stop-color="#8b5cf6" />
            </linearGradient>

            <radialGradient
              id="${idPrefix}_revealMask"
              gradientUnits="userSpaceOnUse"
              r="22%"
              cx="50%"
              cy="50%"
              class="transition-all duration-150 ease-out"
            >
              <stop offset="0%" stop-color="white" stop-opacity="1" />
              <stop offset="100%" stop-color="black" stop-opacity="0" />
            </radialGradient>

            <mask id="${idPrefix}_textMask">
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="url(#${idPrefix}_revealMask)"
              />
            </mask>
          </defs>

          <!-- 1. Background ghost stroke -->
          <text
            x="50%"
            y="52%"
            text-anchor="middle"
            dominant-baseline="middle"
            stroke-width="0.35"
            class="fill-transparent stroke-neutral-700 font-headline text-[68px] font-extrabold tracking-wider transition-opacity duration-300"
            id="${idPrefix}_ghostText"
            style="opacity: 0.35;"
          >
            ${text}
          </text>

          <!-- 2. Animated stroke outline on mount -->
          <text
            x="50%"
            y="52%"
            text-anchor="middle"
            dominant-baseline="middle"
            stroke-width="0.4"
            class="fill-transparent stroke-secondary font-headline text-[68px] font-extrabold tracking-wider"
            id="${idPrefix}_motionText"
            style="stroke-dasharray: 1000; stroke-dashoffset: 0; transition: stroke-dashoffset 2.5s ease-in-out;"
          >
            ${text}
          </text>

          <!-- 3. Gradient reveal text through radial mask -->
          <text
            x="50%"
            y="52%"
            text-anchor="middle"
            dominant-baseline="middle"
            stroke="url(#${idPrefix}_textGradient)"
            fill="url(#${idPrefix}_textGradient)"
            stroke-width="0.35"
            mask="url(#${idPrefix}_textMask)"
            class="font-headline text-[68px] font-extrabold tracking-wider pointer-events-none"
          >
            ${text}
          </text>
        </svg>
      </div>
    `;
  },

  attach(containerId = "genovaTextHoverContainer") {
    const container = document.getElementById(containerId);
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const svgId = svg.id;
    const prefix = svgId.replace("_svg", "");
    const mask = document.getElementById(prefix + "_revealMask");
    const ghost = document.getElementById(prefix + "_ghostText");
    const motionText = document.getElementById(prefix + "_motionText");

    if (!mask) return;

    let isHovered = false;
    let targetPos = { x: 50, y: 50 };
    let currentPos = { x: 50, y: 50 };
    let animFrame = null;

    function update() {
      // Smooth interpolation towards mouse position
      currentPos.x += (targetPos.x - currentPos.x) * 0.2;
      currentPos.y += (targetPos.y - currentPos.y) * 0.2;
      mask.setAttribute("cx", currentPos.x.toFixed(2) + "%");
      mask.setAttribute("cy", currentPos.y.toFixed(2) + "%");

      if (isHovered) {
        animFrame = requestAnimationFrame(update);
      }
    }

    svg.addEventListener("mouseenter", () => {
      isHovered = true;
      if (ghost) ghost.style.opacity = "0.75";
      mask.setAttribute("r", "25%");
      animFrame = requestAnimationFrame(update);
    });

    svg.addEventListener("mouseleave", () => {
      isHovered = false;
      if (ghost) ghost.style.opacity = "0.35";
      mask.setAttribute("r", "18%");
      targetPos = { x: 50, y: 50 };
      if (animFrame) cancelAnimationFrame(animFrame);
    });

    svg.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const cx = ((e.clientX - rect.left) / rect.width) * 100;
        const cy = ((e.clientY - rect.top) / rect.height) * 100;
        targetPos.x = cx;
        targetPos.y = cy;
      }
    });

    // Animate stroke draw-in on mount
    if (motionText) {
      motionText.style.strokeDashoffset = "1000";
      setTimeout(() => {
        motionText.style.strokeDashoffset = "0";
      }, 100);
    }
  }
};
