import { EVENT_CONFIG } from "./firebase-init.js";

const iconPaths = {
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>',
  location: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>',
  clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  hanger: '<path d="M12 7a2 2 0 1 0-2-2"></path><path d="M12 7v2"></path><path d="M4 20h16L12 9 4 20Z"></path>',
  hourglass: '<path d="M6 3h12"></path><path d="M6 21h12"></path><path d="M8 3v4a4 4 0 0 0 1.2 2.8L12 12l2.8-2.2A4 4 0 0 0 16 7V3"></path><path d="M16 21v-4a4 4 0 0 0-1.2-2.8L12 12l-2.8 2.2A4 4 0 0 0 8 17v4"></path>',
  vinyl: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="2"></circle><path d="M12 3a9 9 0 0 1 9 9"></path>',
  sad: '<circle cx="12" cy="12" r="9"></circle><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M8.5 16c1.8-1.4 5.2-1.4 7 0"></path>'
};

export function icon(name, className = "line-icon") {
  return `<span class="${className}" data-icon="${name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || ""}</svg></span>`;
}

function hydrateIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    if (node.querySelector("svg")) return;
    const name = node.dataset.icon;
    node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || ""}</svg>`;
  });
}

function kineticType() {
  document.querySelectorAll("[data-kinetic]").forEach((el) => {
    const text = el.dataset.kinetic || el.textContent;
    el.textContent = "";
    let index = 0;

    text.split(" ").forEach((word, wordIndex, words) => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "word";

      [...word].forEach((char) => {
        const span = document.createElement("span");
        span.className = "char";
        span.style.setProperty("--i", index);
        span.textContent = char;
        wordSpan.append(span);
        index += 1;
      });

      el.append(wordSpan);

      if (wordIndex < words.length - 1) {
        const space = document.createElement("span");
        space.className = "space";
        space.textContent = "\u00a0";
        el.append(space);
      }
    });
  });
}

function revealOnScroll() {
  const items = [...document.querySelectorAll(".reveal")];
  items.forEach((item, index) => item.style.setProperty("--delay", `${Math.min(index % 6, 5) * 70}ms`));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });
  items.forEach((item) => observer.observe(item));
}

function countdown() {
  const root = document.querySelector("[data-countdown]");
  if (!root) return;
  const target = new Date(EVENT_CONFIG.EVENT_DATE).getTime();
  const prev = {};
  const pad = (value) => String(Math.max(0, value)).padStart(2, "0");
  const setUnit = (unit, value) => {
    const node = root.querySelector(`[data-unit="${unit}"]`);
    if (!node || prev[unit] === value) return;
    prev[unit] = value;
    node.classList.add("tick");
    window.setTimeout(() => {
      node.textContent = value;
      node.classList.remove("tick");
    }, 120);
  };
  const update = () => {
    const diff = Math.max(0, target - Date.now());
    const total = Math.floor(diff / 1000);
    setUnit("days", pad(Math.floor(total / 86400)));
    setUnit("hours", pad(Math.floor((total % 86400) / 3600)));
    setUnit("minutes", pad(Math.floor((total % 3600) / 60)));
    setUnit("seconds", pad(total % 60));
  };
  update();
  window.setInterval(update, 1000);
}

function smoothAnchors() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

hydrateIcons();
kineticType();
revealOnScroll();
countdown();
smoothAnchors();
