// Feedback for a correct answer in question-widget.js: a short synthesized
// chime (Web Audio API - no audio asset to host or load) plus a confetti
// burst over the correct Option. Purely cosmetic; every failure here (no
// AudioContext, autoplay blocked, etc.) is swallowed so it can never break
// the Attempt/Outcome flow it decorates.

let audioContext = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  audioContext = new Ctor();
  return audioContext;
}

/**
 * Play a quick rising three-note arpeggio (C6-E6-G6). Must be called from a
 * user gesture (Submit click / Enter keypress) so browsers allow audio.
 */
export function playCorrectSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const notes = [1046.5, 1318.5, 1568.0];
    const start = ctx.currentTime;
    notes.forEach((freq, i) => {
      const t = start + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // Audio is a nicety; never let it break answering a question.
  }
}

const CONFETTI_COLORS = ['#2563eb', '#42ffc2', '#ffd942', '#ff7085', '#ff8142', '#90cdf4'];
const CONFETTI_COUNT = 24;

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Pop the given element and burst confetti out of it. Skips the confetti
 * (but keeps the static correct styling) under prefers-reduced-motion.
 * @param {HTMLElement} targetEl
 */
export function celebrate(targetEl) {
  if (!targetEl) return;
  targetEl.classList.add('question-widget-celebrate');
  if (prefersReducedMotion()) return;

  const burst = document.createElement('div');
  burst.className = 'confetti-burst';
  burst.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < CONFETTI_COUNT; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const angle = (Math.PI * 2 * i) / CONFETTI_COUNT + (Math.random() - 0.5) * 0.4;
    const distance = 60 + Math.random() * 70;
    piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * distance - 30}px`);
    piece.style.setProperty('--rot', `${Math.round(Math.random() * 720 - 360)}deg`);
    piece.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    burst.appendChild(piece);
  }
  targetEl.appendChild(burst);
  setTimeout(() => burst.remove(), 1000);
}
