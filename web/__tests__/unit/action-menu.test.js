import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMenuButton } from '../../action-menu.js';

const menu = () => document.querySelector('[role="menu"]');
const item = (text) => [...menu().querySelectorAll('[role="menuitem"]')].find((b) => b.textContent === text);
const press = (key) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('createMenuButton (⋮ action menu)', () => {
  let onA, onB, onC, anchor;

  beforeEach(() => {
    document.body.innerHTML = '';
    onA = vi.fn();
    onB = vi.fn();
    onC = vi.fn();
    anchor = createMenuButton('Lesson actions', () => [
      { label: 'Alpha', onSelect: onA },
      { label: 'Beta', disabled: true, onSelect: onB },
      { label: 'Gamma', onSelect: onC },
    ]);
    document.body.appendChild(anchor);
  });

  it('is a labelled ⋮ button that announces a menu', () => {
    expect(anchor.textContent).toBe('⋮');
    expect(anchor.getAttribute('aria-label')).toBe('Lesson actions');
    expect(anchor.title).toBe('Lesson actions');
    expect(anchor.getAttribute('aria-haspopup')).toBe('menu');
    expect(anchor.getAttribute('aria-expanded')).toBe('false');
    expect(menu()).toBeNull();
  });

  it('opens a menu of the items, with ones that cannot apply disabled, and focuses the first', () => {
    anchor.click();

    expect(anchor.getAttribute('aria-expanded')).toBe('true');
    expect([...menu().querySelectorAll('[role="menuitem"]')].map((b) => b.textContent))
      .toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(item('Beta').disabled).toBe(true);
    expect(item('Alpha').disabled).toBe(false);
    expect(document.activeElement).toBe(item('Alpha'));
  });

  it('runs the chosen item, closes, and returns focus to the ⋮ button', async () => {
    anchor.click();
    item('Gamma').click();
    await Promise.resolve();

    expect(onC).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(anchor.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(anchor);
  });

  it('clicking ⋮ again closes it', () => {
    anchor.click();
    anchor.click();
    expect(menu()).toBeNull();
  });

  it('closes on Escape without running anything, focus back on ⋮', () => {
    anchor.click();
    press('Escape');

    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(anchor);
    expect(onA).not.toHaveBeenCalled();
  });

  it('closes on a press outside it', () => {
    anchor.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(menu()).toBeNull();
  });

  it('stays open on a press inside it', () => {
    anchor.click();
    item('Alpha').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(menu()).not.toBeNull();
  });

  it('closes on Tab, letting focus move on', () => {
    anchor.click();
    press('Tab');
    expect(menu()).toBeNull();
  });

  it('arrow keys move between enabled items, skipping disabled ones and wrapping', () => {
    anchor.click();
    press('ArrowDown');
    expect(document.activeElement).toBe(item('Gamma'));
    press('ArrowDown');
    expect(document.activeElement).toBe(item('Alpha'));
    press('ArrowUp');
    expect(document.activeElement).toBe(item('Gamma'));
    press('Home');
    expect(document.activeElement).toBe(item('Alpha'));
    press('End');
    expect(document.activeElement).toBe(item('Gamma'));
  });

  it('opening a second menu closes the first', () => {
    const other = createMenuButton('Other', () => [{ label: 'Delta', onSelect: vi.fn() }]);
    document.body.appendChild(other);
    anchor.click();
    other.click();

    expect(document.querySelectorAll('[role="menu"]').length).toBe(1);
    expect(item('Delta')).toBeTruthy();
    expect(anchor.getAttribute('aria-expanded')).toBe('false');
  });

  it('asks for the items each time it opens', () => {
    let label = 'First';
    const dynamic = createMenuButton('Dynamic', () => [{ label, onSelect: vi.fn() }]);
    document.body.appendChild(dynamic);
    dynamic.click();
    expect(item('First')).toBeTruthy();
    dynamic.click();
    label = 'Second';
    dynamic.click();
    expect(item('Second')).toBeTruthy();
  });

  it('closes when the page scrolls or resizes, since it is placed against the ⋮ button', () => {
    anchor.click();
    window.dispatchEvent(new Event('resize'));
    expect(menu()).toBeNull();

    anchor.click();
    document.dispatchEvent(new Event('scroll'));
    expect(menu()).toBeNull();
  });

  describe('placement', () => {
    /** Give the ⋮ button and the menu real sizes (jsdom has no layout). */
    const layout = (anchorRect) => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        return this.getAttribute('role') === 'menu'
          ? /** @type {DOMRect} */ ({ width: 200, height: 150 })
          : anchorRect;
      });

    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    });

    it('opens just below the ⋮ button, left edges lined up', () => {
      const spy = layout({ left: 100, right: 120, top: 50, bottom: 70, width: 20, height: 20 });
      anchor.click();
      expect(menu().style.left).toBe('100px');
      expect(menu().style.top).toBe('70px');
      spy.mockRestore();
    });

    it('flips above and pulls left when near the bottom-right corner', () => {
      const spy = layout({ left: 1000, right: 1020, top: 740, bottom: 760, width: 20, height: 20 });
      anchor.click();
      expect(menu().style.left).toBe(`${1024 - 200 - 8}px`);
      expect(menu().style.top).toBe(`${740 - 150}px`);
      spy.mockRestore();
    });

    it('keeps to the visible part of a phone page that is wider than the screen', () => {
      const spy = layout({ left: 300, right: 344, top: 50, bottom: 94, width: 44, height: 44 });
      window.visualViewport = /** @type {any} */ ({ offsetLeft: 0, offsetTop: 0, width: 375, height: 667 });
      Object.defineProperty(window, 'innerWidth', { value: 536, configurable: true });
      anchor.click();
      expect(menu().style.left).toBe(`${375 - 200 - 8}px`);
      delete window.visualViewport;
      spy.mockRestore();
    });
  });

  describe('where the menu mounts (it must sit in a landmark for axe "region")', () => {
    it('mounts inside <main> when the page has one', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);
      anchor.click();
      expect(menu().parentElement).toBe(main);
    });

    it('mounts on <body> on a page without <main>', () => {
      anchor.click();
      expect(menu().parentElement).toBe(document.body);
    });
  });
});
