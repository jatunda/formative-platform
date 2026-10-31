// The School Clock's mini player: an always-on-top window (Document
// Picture-in-Picture, where it exists) laid out to the design reference: a
// head line (the Segment, "Timer", or what's ringing), the big Readout, and a
// foot (the Segment's bar and end, up next, or Dismiss while something
// rings). The page works out what to show (mini-content.js); this draws it
// while the window is open. The window loads the page's tokens, themes and
// components and mirrors the look attributes on the page's <html>, so it
// follows the teacher's theme as it changes.
import { el } from './dom.js';
import { icon } from './icons.js';
import { writeValue } from './readouts-view.js';

/** The mini player's starting size (the user can resize it; it scales up). */
const MINI_PLAYER_SIZE = { width: 320, height: 180 };
/** The page's tokens, themes and components, then the mini player's own layout. */
const STYLESHEETS = ['/clock/tokens.css', '/clock/themes.css', '/clock/clock.css', '/clock/mini-player.css'];

/** @typedef {import('./mini-content.js').MiniContent} MiniContent */

/**
 * @param {{ pictureInPicture: import('./screen.js').PictureInPicture | null,
 *   onOpen: () => void, onDismiss: () => void, page?: Document }} options
 *   `onOpen` runs once a window has opened (the page fills it in); `onDismiss`
 *   when its Dismiss button is pressed. `page` is the document whose
 *   look (its <html> data-* attributes) it follows.
 * @returns {{ button: HTMLElement, show: (content: MiniContent) => void,
 *   showRinging: (what: string | null) => void, close: () => void }}
 *   `button` opens and closes it (hidden where the browser has no
 *   Picture-in-Picture); `show` and `showRinging` do nothing while it's closed.
 */
export function createMiniPlayer({ pictureInPicture, onOpen, onDismiss, page = document }) {
  let mini = null;
  /** What's ringing ("Bell · Period 3 ends"), kept across windows. */
  let ringing = null;
  /** @type {MiniContent | null} */
  let content = null;
  const button = el('button', {
    type: 'button', hidden: !pictureInPicture,
    onclick: () => (mini ? close() : open()),
  });
  // Icon-only, named by its aria-label and a matching tooltip.
  button.append(icon('pip'));
  function showState() {
    const name = mini ? 'Close mini player' : 'Mini player';
    button.setAttribute('aria-label', name);
    button.title = name;
  }
  showState();

  async function open() {
    let win;
    try {
      win = await pictureInPicture.open(MINI_PLAYER_SIZE);
    } catch {
      return;
    }
    const doc = win.document;
    doc.title = 'School Clock';
    for (const href of STYLESHEETS) {
      const stylesheet = doc.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = href;
      doc.head.append(stylesheet);
    }
    const theme = followTheme(page.documentElement, doc.documentElement);

    const fill = el('span', { className: 'clock-mini__fill' });
    const parts = {
      win,
      theme,
      main: el('main', { className: 'clock-mini' }),
      bell: icon('bell'),
      headText: el('span'),
      readoutValue: el('span', { className: 'clock-mini__value' }),
      readoutCaption: el('span', { className: 'visually-hidden' }),
      progress: el('div', {
        className: 'clock-mini__bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
      }, [fill]),
      fill,
      sub: el('p', { className: 'clock-mini__sub' }),
      nextName: el('span'),
      next: null,
      dismiss: el('button', {
        type: 'button', className: 'clock-mini__dismiss', textContent: 'Dismiss', onclick: () => onDismiss(),
      }),
    };
    parts.next = el('p', { className: 'clock-mini__next' }, [
      el('span', { className: 'clock-mini__next-label', textContent: 'Up next' }), ' ', parts.nextName,
    ]);
    parts.main.append(
      el('div', { className: 'clock-mini__flash', 'aria-hidden': 'true' }),
      el('h1', { className: 'clock-mini__head' }, [parts.bell, parts.headText]),
      el('p', { className: 'clock-mini__readout' }, [parts.readoutValue, parts.readoutCaption]),
      el('div', { className: 'clock-mini__foot' }, [parts.progress, parts.sub, parts.next, parts.dismiss]),
    );
    doc.body.replaceChildren(parts.main);
    // Closed by the user, by this page, or because this tab went away. A
    // window this page already closed may say so after a new one has opened.
    win.addEventListener('pagehide', () => {
      if (mini !== parts) return;
      forget();
    });
    mini = parts;
    showState();
    onOpen();
  }

  function forget() {
    mini.theme.disconnect();
    mini = null;
    showState();
  }

  /** Close it now; the window's own pagehide comes a moment later. */
  function close() {
    if (!mini) return;
    const { win } = mini;
    forget();
    win.close();
  }

  /** Draw the latest content, with what's ringing on top of it. */
  function draw() {
    if (!mini || !content) return;
    // At once, too, so a render that changed the look shows it right away.
    mini.theme.copy();
    const { head, readout, foot, timer } = content;
    mini.main.classList.toggle('has-timer', timer);
    mini.main.classList.toggle('is-ringing', ringing !== null);
    mini.bell.hidden = ringing === null;
    mini.headText.textContent = ringing === null ? head : `Ringing · ${ringing}`;
    writeValue(mini.readoutValue, readout);
    // The time needs no caption; a length of time keeps its own for screen readers.
    mini.readoutCaption.textContent = readout.caption === 'now' ? '' : ` ${readout.caption}`;
    const kind = ringing === null ? foot.kind : 'dismiss';
    mini.progress.hidden = kind !== 'progress';
    mini.sub.hidden = kind !== 'progress' && kind !== 'line';
    mini.next.hidden = kind !== 'next';
    mini.dismiss.hidden = kind !== 'dismiss';
    if (foot.kind === 'progress') {
      mini.progress.setAttribute('aria-label', foot.label);
      mini.progress.setAttribute('aria-valuenow', String(foot.percent));
      mini.fill.style.width = `${foot.percent}%`;
    }
    if (foot.kind === 'progress' || foot.kind === 'line') mini.sub.textContent = foot.text;
    if (foot.kind === 'next') mini.nextName.textContent = foot.name;
  }

  return {
    button,
    show(next) {
      content = next;
      draw();
    },
    showRinging(what) {
      ringing = what;
      draw();
    },
    close,
  };
}

/**
 * Keep `target`'s data-* attributes (the theme: data-mode, data-palette,
 * data-font, data-deco) and lang the same as `source`'s, from now on.
 * @param {HTMLElement} source @param {HTMLElement} target
 * @returns {{ copy: () => void, disconnect: () => void }} `copy` brings it
 *   up to date now (it also follows by itself); `disconnect` stops it
 */
function followTheme(source, target) {
  const copy = () => {
    for (const { name } of [...target.attributes]) {
      if (name.startsWith('data-') && !source.hasAttribute(name)) target.removeAttribute(name);
    }
    for (const { name, value } of source.attributes) {
      if (name.startsWith('data-') || name === 'lang') target.setAttribute(name, value);
    }
  };
  copy();
  const observer = new MutationObserver(copy);
  observer.observe(source, { attributes: true });
  return { copy, disconnect: () => observer.disconnect() };
}
