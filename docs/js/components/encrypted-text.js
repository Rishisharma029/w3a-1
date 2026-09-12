/**
 * dashboard/public/js/components/encrypted-text.js
 *
 * Aceternity UI EncryptedText Component — Ported for W3A-1 Safe-Spend Protocol.
 * Performs progressive cybernetic matrix decryption scramble and reveal animations.
 */

(function() {
  const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[];:,.<>/?";

  function getRandomChar(charset) {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }

  function generateGibberish(text, charset) {
    let res = "";
    for (let i = 0; i < text.length; i++) {
      res += text[i] === " " ? " " : getRandomChar(charset);
    }
    return res;
  }

  class EncryptedTextInstance {
    constructor(element) {
      this.element = element;
      this.text = element.getAttribute("data-encrypted-text") || element.textContent.trim();
      this.revealDelayMs = parseInt(element.getAttribute("data-reveal-delay-ms") || "40", 10);
      this.flipDelayMs = parseInt(element.getAttribute("data-flip-delay-ms") || "40", 10);
      this.charset = element.getAttribute("data-charset") || DEFAULT_CHARSET;
      this.encryptedClass = element.getAttribute("data-encrypted-class") || "text-cyan-400 font-mono opacity-80";
      this.revealedClass = element.getAttribute("data-revealed-class") || "text-white font-extrabold";
      this.isRunning = false;
      this.init();
    }

    init() {
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !this.isRunning) {
              this.start();
              observer.unobserve(this.element);
            }
          });
        }, { threshold: 0.1 });
        observer.observe(this.element);
      } else {
        this.start();
      }
    }

    start() {
      this.isRunning = true;
      const totalLen = this.text.length;
      let scrambleChars = generateGibberish(this.text, this.charset).split("");
      const startTime = performance.now();
      let lastFlipTime = startTime;

      const step = (now) => {
        const elapsed = now - startTime;
        const revealCount = Math.min(totalLen, Math.floor(elapsed / Math.max(1, this.revealDelayMs)));

        if (now - lastFlipTime >= this.flipDelayMs) {
          for (let i = revealCount; i < totalLen; i++) {
            if (this.text[i] !== " ") {
              scrambleChars[i] = getRandomChar(this.charset);
            }
          }
          lastFlipTime = now;
        }

        let html = "";
        for (let i = 0; i < totalLen; i++) {
          const isRevealed = i < revealCount;
          const char = isRevealed ? this.text[i] : scrambleChars[i];
          const cls = isRevealed ? this.revealedClass : this.encryptedClass;
          html += "<span class=\"" + cls + "\">" + (char === " " ? "&nbsp;" : char) + "</span>";
        }
        this.element.innerHTML = html;

        if (revealCount < totalLen) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    }
  }

  function initAllEncryptedTexts() {
    document.querySelectorAll("[data-encrypted-text]").forEach(el => {
      new EncryptedTextInstance(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllEncryptedTexts);
  } else {
    initAllEncryptedTexts();
  }

  window.EncryptedText = {
    init: initAllEncryptedTexts,
    create: (element) => new EncryptedTextInstance(element)
  };
})();
