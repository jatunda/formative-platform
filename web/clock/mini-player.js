// The School Clock's mini player: an always-on-top window (Document
// Picture-in-Picture, where it exists) that mirrors the big Readout, the
// current Segment, up next and what's ringing. The page works out the words;
// this shows them while the window is open.
import { el } from './dom.js';
import { icon } from './icons.js';

/** The mini player's starting size (the user can resize it). */
const MINI_PLAYER_SIZE = { width: 320, height: 200 };

/**
 * @param {{ pictureInPicture: import('./screen.js').PictureInPicture | null,
 *   onOpen: () => void, onDismiss: () => void }} options
 *   `onOpen` runs once a window has opened (the page fills it in); `onDismiss`
 *   when its Dismiss button is pressed.
 * @returns {{ button: HTMLElement,
 *   show: (lines: { readout: string, status: string, upNext: string }) => void,
 *   showRinging: (what: string | null) => void, close: () => void }}
 *   `button` opens and closes it (hidden where the browser has no
 *   Picture-in-Picture); `show` and `showRinging` do nothing while it's closed.
 */
export function createMiniPlayer({ pictureInPicture, onOpen, onDismiss }) {
  let mini = null;
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
    // The page's tokens then its components, so the window follows the theme.
    for (const href of ['/clock/tokens.css', '/clock/themes.css', '/clock/clock.css']) {
      const stylesheet = doc.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = href;
      doc.head.append(stylesheet);
    }    const parts = {
      win,
      readout: el('p', { className: 'clock-mini-readout' }),
      status: el('p'),
      upNext: el('p'),
      ringingText: el('p'),
      dismiss: el('button', { type: 'button', textContent: 'Dismiss', onclick: () => onDismiss() }),
    };
    doc.body.className = 'clock-mini';
    doc.body.replaceChildren(parts.readout, parts.status, parts.upNext, parts.ringingText, parts.dismiss);
    // Closed by the user, by this page, or because this tab went away. A
    // window this page already closed may say so after a new one has opened.
    win.addEventListener('pagehide', () => {
      if (mini !== parts) return;
      mini = null;
      showState();
    });
    mini = parts;
    showState();
    onOpen();
  }

  /** Close it now; the window's own pagehide comes a moment later. */
  function close() {
    if (!mini) return;
    const { win } = mini;
    mini = null;
    showState();
    win.close();
  }

  return {
    button,
    show({ readout, status, upNext }) {
      if (!mini) return;
      // The page's look (look-sheet.js puts it on <html>), redone with every render.
      for (const name of ['data-mode', 'data-palette', 'data-font']) {
        mini.win.document.documentElement.setAttribute(name, document.documentElement.getAttribute(name));
      }
      mini.readout.textContent = readout;
      mini.status.textContent = status;
      mini.upNext.textContent = upNext;
    },
    showRinging(what) {
      if (!mini) return;
      mini.ringingText.textContent = what ?? '';
      mini.dismiss.hidden = what === null;
    },
    close,
  };
}
