import { describe, it, expect, beforeEach } from 'vitest';
import { showErrorState } from '../../error-ui-utils.js';

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

