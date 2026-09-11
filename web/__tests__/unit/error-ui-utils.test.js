import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showErrorState, showSlowConnectionMessage, withConnectionTimeout } from '../../error-ui-utils.js';

describe('error-ui-utils', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  it('should show error state with default message', () => {
    showErrorState({ container });
    
    expect(container.innerHTML).toContain('Unable to load');
    expect(container.innerHTML).toContain('There was a problem connecting to the server');
    expect(container.innerHTML).toContain('Try Again');
  });

  it('should show error state with custom title and message', () => {
    showErrorState({
      container,
      title: 'Custom Error',
      message: 'Something went wrong',
    });
    
    expect(container.innerHTML).toContain('Custom Error');
    expect(container.innerHTML).toContain('Something went wrong');
  });

  it('should accept container as string ID', () => {
    showErrorState({ container: 'test-container' });
    
    // The container should have been updated
    const foundContainer = document.getElementById('test-container');
    expect(foundContainer).toBeTruthy();
    expect(foundContainer.innerHTML).toContain('Unable to load');
  });

  it('should hide loading state when provided', () => {
    const loadingEl = document.createElement('div');
    loadingEl.id = 'loading';
    loadingEl.style.display = 'block';
    document.body.appendChild(loadingEl);
    
    showErrorState({
      container,
      loadingState: loadingEl,
    });
    
    expect(loadingEl.style.display).toBe('none');
  });

  it('should hide loading state when provided as string ID', () => {
    const loadingEl = document.createElement('div');
    loadingEl.id = 'loading-state';
    loadingEl.style.display = 'block';
    document.body.appendChild(loadingEl);
    
    showErrorState({
      container,
      loadingState: 'loading-state',
    });
    
    expect(loadingEl.style.display).toBe('none');
  });

  it('should add padding when withPadding is true', () => {
    showErrorState({
      container,
      withPadding: true,
    });
    
    expect(container.innerHTML).toContain('padding: 2rem;');
  });

  it('should not add padding when withPadding is false', () => {
    showErrorState({
      container,
      withPadding: false,
    });
    
    expect(container.innerHTML).not.toContain('padding: 2rem;');
  });

  it('should handle missing container gracefully', () => {
    // Should not throw
    expect(() => {
      showErrorState({ container: 'nonexistent-id' });
    }).not.toThrow();
  });

  it('should include Try Again button that reloads page', () => {
    showErrorState({ container });
    
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.textContent.trim()).toBe('Try Again');
    expect(button.onclick.toString()).toContain('location.reload');
  });

  it('should replace existing content in container', () => {
    container.innerHTML = '<p>Existing content</p>';

    showErrorState({ container });

    expect(container.innerHTML).not.toContain('Existing content');
    expect(container.innerHTML).toContain('Unable to load');
  });
});

describe('showSlowConnectionMessage', () => {
  it("updates a descendant's .loading-text content", () => {
    const root = document.createElement('div');
    root.innerHTML = '<p class="loading-text">Loading...</p>';

    showSlowConnectionMessage(root);

    expect(root.querySelector('.loading-text').textContent).toMatch(/wi-fi/i);
  });

  it('updates the root itself when it carries the .loading-text class', () => {
    const root = document.createElement('p');
    root.className = 'loading-text';
    root.textContent = 'Loading...';

    showSlowConnectionMessage(root);

    expect(root.textContent).toMatch(/wi-fi/i);
  });

  it('accepts a string ID', () => {
    document.body.innerHTML = '<div id="loading-root"><p class="loading-text">Loading...</p></div>';

    showSlowConnectionMessage('loading-root');

    expect(document.querySelector('.loading-text').textContent).toMatch(/wi-fi/i);
  });

  it('does nothing when the root has no .loading-text descendant', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Loading...</p>';

    expect(() => showSlowConnectionMessage(root)).not.toThrow();
  });

  it('does nothing when the root element does not exist', () => {
    expect(() => showSlowConnectionMessage('nonexistent-id')).not.toThrow();
  });
});

describe('withConnectionTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the original value and never calls onSlow/onTimeout when the task settles quickly', async () => {
    const onSlow = vi.fn();
    const onTimeout = vi.fn();
    const task = Promise.resolve('done');

    const result = await withConnectionTimeout(task, { onSlow, onTimeout, slowMs: 6000, timeoutMs: 15000 });
    await vi.advanceTimersByTimeAsync(20000);

    expect(result).toBe('done');
    expect(onSlow).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('calls onSlow after slowMs if the task is still pending', async () => {
    const onSlow = vi.fn();
    let resolveTask;
    const task = new Promise((resolve) => { resolveTask = resolve; });

    const promise = withConnectionTimeout(task, { onSlow, slowMs: 6000, timeoutMs: 15000 });

    await vi.advanceTimersByTimeAsync(6000);
    expect(onSlow).toHaveBeenCalledTimes(1);

    resolveTask('done');
    await promise;
  });

  it('calls onTimeout after timeoutMs if the task is still pending', async () => {
    const onTimeout = vi.fn();
    let resolveTask;
    const task = new Promise((resolve) => { resolveTask = resolve; });

    const promise = withConnectionTimeout(task, { onTimeout, slowMs: 6000, timeoutMs: 15000 });

    await vi.advanceTimersByTimeAsync(15000);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    resolveTask('done');
    await promise;
  });

  it('does not call onSlow/onTimeout once the task has already settled successfully', async () => {
    const onSlow = vi.fn();
    const onTimeout = vi.fn();
    const task = Promise.resolve('done');

    await withConnectionTimeout(task, { onSlow, onTimeout, slowMs: 6000, timeoutMs: 15000 });
    await vi.advanceTimersByTimeAsync(15000);

    expect(onSlow).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('does not call onSlow/onTimeout once the task has already rejected, and still rejects itself', async () => {
    const onSlow = vi.fn();
    const onTimeout = vi.fn();
    const task = Promise.reject(new Error('boom'));

    await expect(withConnectionTimeout(task, { onSlow, onTimeout, slowMs: 6000, timeoutMs: 15000 })).rejects.toThrow('boom');
    await vi.advanceTimersByTimeAsync(15000);

    expect(onSlow).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('uses default slowMs/timeoutMs of 6000/15000 when not provided', async () => {
    const onSlow = vi.fn();
    const onTimeout = vi.fn();
    let resolveTask;
    const task = new Promise((resolve) => { resolveTask = resolve; });

    const promise = withConnectionTimeout(task, { onSlow, onTimeout });

    await vi.advanceTimersByTimeAsync(5999);
    expect(onSlow).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onSlow).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(8999);
    expect(onTimeout).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    resolveTask('done');
    await promise;
  });

  it('works with no callbacks provided', async () => {
    const task = Promise.resolve('done');
    const result = await withConnectionTimeout(task);
    await vi.advanceTimersByTimeAsync(20000);
    expect(result).toBe('done');
  });
});

