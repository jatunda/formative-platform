import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRenderLoop } from '../../robotics/render-loop.js';

function makeTree(label, value = '') {
  const div = document.createElement('div');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'field';
  input.value = value;
  div.appendChild(input);
  div.appendChild(document.createTextNode(label));
  return div;
}

describe('createRenderLoop', () => {
  let mount;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="mount"></div>';
    mount = document.getElementById('mount');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('paints synchronously on construction', () => {
    const render = vi.fn(() => makeTree('a'));
    createRenderLoop({ mount, render });
    expect(render).toHaveBeenCalledTimes(1);
    expect(mount.querySelector('.field')).not.toBeNull();
  });

  it('debounces requestRender: several calls before the timer fires repaint only once', () => {
    let n = 0;
    const render = vi.fn(() => makeTree(String(n)));
    const loop = createRenderLoop({ mount, render });
    render.mockClear();

    n = 1;
    loop.requestRender();
    n = 2;
    loop.requestRender();
    n = 3;
    loop.requestRender();
    expect(render).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('defers a requested render while the mouse button is down, firing once it is released', () => {
    const render = vi.fn(() => makeTree('x'));
    const loop = createRenderLoop({ mount, render });
    render.mockClear();

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    loop.requestRender();
    vi.runAllTimers();
    expect(render).not.toHaveBeenCalled();

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(render).not.toHaveBeenCalled(); // mouseup only re-queues the macrotask, doesn't paint synchronously
    vi.runAllTimers();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('defers a render requested while the mouse is up if mousedown lands before the queued timer fires', () => {
    const render = vi.fn(() => makeTree('x'));
    const loop = createRenderLoop({ mount, render });
    render.mockClear();

    loop.requestRender();
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    vi.runAllTimers();
    expect(render).not.toHaveBeenCalled();

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(render).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('runs the afterRender callback once the next real paint lands', () => {
    const render = vi.fn(() => makeTree('a'));
    const loop = createRenderLoop({ mount, render });
    const afterRender = vi.fn();

    loop.requestRender(afterRender);
    expect(afterRender).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(afterRender).toHaveBeenCalledTimes(1);
  });

  it('runs onPainted after every real paint, not just the first', () => {
    const render = vi.fn(() => makeTree('a'));
    const onPainted = vi.fn();
    const loop = createRenderLoop({ mount, render, onPainted });
    expect(onPainted).toHaveBeenCalledTimes(1);

    loop.requestRender();
    vi.runAllTimers();
    expect(onPainted).toHaveBeenCalledTimes(2);
  });

  it('renderNow cancels a pending debounce and paints immediately, flushing queued afterRender callbacks', () => {
    const render = vi.fn(() => makeTree('a'));
    const loop = createRenderLoop({ mount, render });
    render.mockClear();
    const afterRender = vi.fn();

    loop.requestRender(afterRender);
    loop.renderNow();
    expect(render).toHaveBeenCalledTimes(1);
    expect(afterRender).toHaveBeenCalledTimes(1);

    render.mockClear();
    vi.runAllTimers();
    expect(render).not.toHaveBeenCalled(); // the cancelled debounce never fires on its own
  });

  it('destroy cancels a pending render and removes its mouse listeners', () => {
    const render = vi.fn(() => makeTree('a'));
    const loop = createRenderLoop({ mount, render });
    render.mockClear();

    loop.requestRender();
    loop.destroy();
    vi.runAllTimers();
    expect(render).not.toHaveBeenCalled();

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    vi.runAllTimers();
    expect(render).not.toHaveBeenCalled();
  });

  it('preserves focus and cursor position across a paint', () => {
    // Render always reproduces the same value, matching a real render driven by state that
    // already holds the typed text - the test is pinning down restoreFocusPath, not re-typing.
    const render = vi.fn(() => makeTree('a', 'hello'));
    const loop = createRenderLoop({ mount, render });
    const input = mount.querySelector('.field');
    input.focus();
    input.setSelectionRange(2, 4);

    loop.requestRender();
    vi.runAllTimers();

    expect(mount.children.length).toBe(1);
    const newInput = mount.querySelector('.field');
    expect(document.activeElement).toBe(newInput);
    expect(newInput.selectionStart).toBe(2);
    expect(newInput.selectionEnd).toBe(4);
  });
});
