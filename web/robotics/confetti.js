// Self-contained confetti for the Podium's 1st-place reveal: plain DOM
// pieces animated by CSS (robotics.css), so there is no canvas loop or
// external script to load. Purely cosmetic and skipped entirely under
// prefers-reduced-motion.

const CONFETTI_COLORS = ['#ffc83d', '#ff4d5e', '#3d9bff', '#3ddc84', '#3ddcff', '#c9d3e3'];
const CONFETTI_COUNT = 90;
const CONFETTI_LIFETIME_MS = 2200;

/** Whether the viewer asked for reduced motion; assumes not when matchMedia is unavailable. */
export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Burst confetti up and out of targetEl (which should be positioned, so the
 * burst can center on it). The burst removes itself once the animation ends.
 * @param {HTMLElement|null} targetEl
 */
export function launchConfetti(targetEl) {
  if (!targetEl || prefersReducedMotion()) return;

  const burst = document.createElement('div');
  burst.className = 'robotics-confetti';
  burst.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < CONFETTI_COUNT; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'robotics-confetti-piece';
    // Fan upward (-160deg..-20deg) so pieces arc over the podium and fall back down.
    const angle = (-160 + Math.random() * 140) * (Math.PI / 180);
    const distance = 160 + Math.random() * 260;
    piece.style.setProperty('--dx', `${Math.round(Math.cos(angle) * distance)}px`);
    piece.style.setProperty('--dy', `${Math.round(Math.sin(angle) * distance)}px`);
    piece.style.setProperty('--rot', `${Math.round(Math.random() * 1080 - 540)}deg`);
    piece.style.setProperty('--delay', `${Math.round(Math.random() * 200)}ms`);
    piece.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    burst.appendChild(piece);
  }
  targetEl.appendChild(burst);
  setTimeout(() => burst.remove(), CONFETTI_LIFETIME_MS);
}
