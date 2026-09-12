/**
 * dashboard/public/js/components/evervault-card.js
 *
 * Aceternity UI EvervaultCard (Vanilla JS implementation)
 * Dynamic encrypted characters matrix reveal with radial cursor spotlight.
 */

window.EvervaultCard = {
  characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]:;<>?~|",

  generateRandomString(length = 1500) {
    let result = "";
    const charLen = this.characters.length;
    for (let i = 0; i < length; i++) {
      result += this.characters.charAt(Math.floor(Math.random() * charLen));
    }
    return result;
  },

  render({
    text = "GENOVA",
    title = "Autonomous Spend Engine",
    description = "TokenBudgetEnforcer.sol hard spending ceilings.",
    badge = "Verified On-Chain",
    id = "evervault_" + Math.random().toString(36).substr(2, 6),
    badgeColor = "cyan",
    onClick = null
  }) {
    const colorClasses = {
      cyan: {
        border: "border-cyan-500/30",
        text: "text-cyan-400",
        bg: "bg-cyan-950/30",
        gradient: "from-cyan-500 to-blue-600",
        icon: "text-cyan-400"
      },
      emerald: {
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        bg: "bg-emerald-950/30",
        gradient: "from-emerald-500 to-cyan-600",
        icon: "text-emerald-400"
      },
      purple: {
        border: "border-purple-500/30",
        text: "text-purple-400",
        bg: "bg-purple-950/30",
        gradient: "from-purple-500 to-indigo-600",
        icon: "text-purple-400"
      }
    };

    const color = colorClasses[badgeColor] || colorClasses.cyan;
    const initialMatrix = this.generateRandomString(1200);

    return `
      <div 
        id="${id}" 
        class="evervault-card-wrapper border border-white/10 flex flex-col items-start w-full max-w-sm mx-auto p-5 relative min-h-[30rem] bg-black/70 backdrop-blur-xl rounded-2xl group/card transition-all duration-300 hover:border-white/20 select-none shadow-2xl"
        ${onClick ? `onclick="${onClick}" style="cursor: pointer;"` : ""}
      >
        <!-- Aceternity Corner Crosshair Icons -->
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="absolute h-6 w-6 -top-3 -left-3 ${color.icon} pointer-events-none z-30 transition-transform group-hover/card:rotate-90">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="absolute h-6 w-6 -bottom-3 -left-3 ${color.icon} pointer-events-none z-30 transition-transform group-hover/card:rotate-90">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="absolute h-6 w-6 -top-3 -right-3 ${color.icon} pointer-events-none z-30 transition-transform group-hover/card:rotate-90">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="absolute h-6 w-6 -bottom-3 -right-3 ${color.icon} pointer-events-none z-30 transition-transform group-hover/card:rotate-90">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
        </svg>

        <!-- Evervault Pattern Container -->
        <div class="evervault-canvas-area p-0.5 bg-transparent aspect-square flex items-center justify-center w-full relative overflow-hidden rounded-2xl">
          <!-- Spotlight Gradient Layer -->
          <div class="evervault-gradient absolute inset-0 rounded-2xl bg-gradient-to-r ${color.gradient} opacity-0 group-hover/card:opacity-100 backdrop-blur-xl transition-opacity duration-500 pointer-events-none z-0"></div>

          <!-- Encrypted Text Matrix Stream Layer -->
          <div class="evervault-matrix-container absolute inset-0 rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden mix-blend-overlay z-0">
            <p class="evervault-matrix text-[10px] leading-3 h-full break-words whitespace-pre-wrap text-white font-mono font-bold p-2 tracking-tighter">
              ${initialMatrix}
            </p>
          </div>

          <!-- Center Illuminated Target Circle -->
          <div class="relative z-10 flex items-center justify-center pointer-events-none">
            <div class="relative h-44 w-44 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-2xl">
              <div class="absolute w-full h-full bg-black/85 backdrop-blur-md rounded-full border border-white/10 shadow-inner"></div>
              <span class="text-white z-20 font-headline font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-white to-blue-400 bg-clip-text text-transparent drop-shadow-md">
                ${text}
              </span>
            </div>
          </div>
        </div>

        <!-- Card Metadata -->
        <div class="w-full mt-4 flex flex-col justify-between flex-1">
          <div>
            <h3 class="text-white font-headline text-base font-bold tracking-wide flex items-center justify-between">
              <span>${title}</span>
              ${onClick ? '<span class="material-symbols-outlined text-sm text-cyan-400">arrow_forward</span>' : ''}
            </h3>
            <p class="text-xs text-slate-400 mt-1.5 leading-relaxed font-body">
              ${description}
            </p>
          </div>
          <div class="pt-4">
            <span class="text-[11px] font-mono border ${color.border} rounded-full ${color.text} ${color.bg} px-3 py-1 inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
              ${badge}
            </span>
          </div>
        </div>
      </div>
    `;
  },

  attach(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;

    const gradient = card.querySelector(".evervault-gradient");
    const matrixContainer = card.querySelector(".evervault-matrix-container");
    const matrixText = card.querySelector(".evervault-matrix");

    if (!gradient || !matrixContainer) return;

    const onMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maskValue = `radial-gradient(220px at ${x}px ${y}px, white, transparent)`;
      gradient.style.maskImage = maskValue;
      gradient.style.webkitMaskImage = maskValue;

      matrixContainer.style.maskImage = maskValue;
      matrixContainer.style.webkitMaskImage = maskValue;

      if (matrixText) {
        matrixText.textContent = this.generateRandomString(1200);
      }
    };

    const onMouseLeave = () => {
      const maskValue = "none";
      gradient.style.maskImage = maskValue;
      gradient.style.webkitMaskImage = maskValue;
      matrixContainer.style.maskImage = maskValue;
      matrixContainer.style.webkitMaskImage = maskValue;
    };

    card.addEventListener("mousemove", onMouseMove);
    card.addEventListener("mouseleave", onMouseLeave);
  },

  attachAll() {
    const cards = document.querySelectorAll(".evervault-card-wrapper");
    cards.forEach((card) => {
      if (card.id) {
        this.attach(card.id);
      }
    });
  }
};
