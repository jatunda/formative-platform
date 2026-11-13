import { describe, it, expect, beforeEach } from 'vitest';
import { attachSearchListKeys } from '../../search-list-keys.js';
import { pressKey } from '../helpers/press-key.js';

function setup(labels = ['A', 'B', 'C']) {
  document.body.innerHTML = '';
  const popup = document.createElement('div');
  const input = document.createElement('input');
  const list = document.createElement('div');
  /** @type {string[]} */
  const clicks = [];
  /** @param {string} filter */
  function render(filter) {
    list.innerHTML = '';
    for (const name of labels.filter((label) => label.includes(filter))) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.onclick = () => clicks.push(name);
      list.appendChild(btn);
    }
  }
  popup.append(input, list);
  document.body.appendChild(popup);
  const keys = attachSearchListKeys({ popup, input, list, render });
  /** @param {string} key @param {EventTarget} [target] */
  const press = (key, target = input) => pressKey(target, key);
  /** @param {string} text */
  const type = (text) => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };
  const active = () => list.querySelector('[aria-selected="true"]')?.textContent;
  return { popup, input, list, clicks, keys, press, type, active };
}

describe('attachSearchListKeys', () => {
  beforeEach(() => {
    // jsdom has no scrollIntoView; individual tests install one when needed.
    delete Element.prototype.scrollIntoView;
  });

  it('selects the first result as soon as the list appears', () => {
    const { active } = setup();
    expect(active()).toBe('A');
  });

  it('moves down and up with the arrows, without wrapping around', () => {
    const { press, active } = setup();
    press('ArrowUp');
    expect(active()).toBe('A');
    expect(press('ArrowDown').defaultPrevented).toBe(true);
    expect(active()).toBe('B');
    press('ArrowDown');
    press('ArrowDown');
    expect(active()).toBe('C');
    press('ArrowUp');
    expect(active()).toBe('B');
    expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);
  });

  it('redraws the list as the search box changes, back at the first result', () => {
    const { press, type, list, active } = setup(['A1', 'B1', 'B2']);
    press('ArrowDown');
    type('B');
    expect([...list.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['B1', 'B2']);
    expect(active()).toBe('B1');
  });

  it('redraws on demand, for other filters in the popup', () => {
    const { press, keys, active } = setup();
    press('ArrowDown');
    keys.update();
    expect(active()).toBe('A');
  });

  it('Enter clicks the highlighted result', () => {
    const { press, clicks } = setup();
    press('ArrowDown');
    expect(press('Enter').defaultPrevented).toBe(true);
    expect(clicks).toEqual(['B']);
  });

  it('Enter and the arrows do nothing when nothing matches', () => {
    const { press, clicks, active } = setup([]);
    press('ArrowDown');
    press('Enter');
    expect(clicks).toEqual([]);
    expect(active()).toBeUndefined();
  });

  it('Esc closes the popup', () => {
    const { popup, press } = setup();
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(popup.isConnected).toBe(false);
  });

  it('Esc closes the popup from another control in it, which keeps its own arrow keys', () => {
    const { popup, press, active } = setup();
    const select = document.createElement('select');
    popup.prepend(select);
    expect(press('ArrowDown', select).defaultPrevented).toBe(false);
    expect(active()).toBe('A');
    press('Escape', select);
    expect(popup.isConnected).toBe(false);
  });

  it('announces the highlighted result to screen readers', () => {
    const { input, list, press } = setup();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(list.getAttribute('role')).toBe('listbox');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    const options = [...list.querySelectorAll('button')];
    expect(options.every((o) => o.getAttribute('role') === 'option' && o.id)).toBe(true);
    expect(new Set(options.map((o) => o.id)).size).toBe(3);
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id);
    press('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1].id);
  });

  it('clears the announced result when nothing matches', () => {
    const { input, type } = setup();
    type('zzz');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('keeps the highlighted result scrolled into view', () => {
    const scrolled = [];
    Element.prototype.scrollIntoView = function (options) {
      scrolled.push([this.textContent, options]);
    };
    const { press } = setup();
    press('ArrowDown');
    expect(scrolled.at(-1)).toEqual(['B', { block: 'nearest' }]);
  });
});
