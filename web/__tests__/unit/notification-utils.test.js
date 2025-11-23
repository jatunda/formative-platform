import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showNotification } from '../../notification-utils.js';

describe('showNotification', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should create and append notification to body', () => {
    showNotification('Test message');
    
    const notification = document.querySelector('.notification');
    expect(notification).toBeTruthy();
    expect(notification.textContent).toBe('Test message');
    expect(document.body.contains(notification)).toBe(true);
  });

    it('should apply default info styling', () => {
      showNotification('Info message');
      
      const notification = document.querySelector('.notification');
      expect(notification.classList.contains('info')).toBe(true);
      // Check RGB value instead of hex
      expect(notification.style.backgroundColor).toBe('rgb(209, 236, 241)');
    });

    it('should apply success styling', () => {
      showNotification('Success message', 'success');
      
      const notification = document.querySelector('.notification');
      expect(notification.classList.contains('success')).toBe(true);
      expect(notification.style.backgroundColor).toBe('rgb(212, 237, 218)');
    });

    it('should apply error styling', () => {
      showNotification('Error message', 'error');
      
      const notification = document.querySelector('.notification');
      expect(notification.classList.contains('error')).toBe(true);
      expect(notification.style.backgroundColor).toBe('rgb(248, 215, 218)');
    });

  it('should set correct positioning styles', () => {
    showNotification('Test message');
    
    const notification = document.querySelector('.notification');
    expect(notification.style.position).toBe('fixed');
    expect(notification.style.top).toBe('20px');
    expect(notification.style.right).toBe('20px');
    expect(notification.style.zIndex).toBe('1000');
  });

  it('should auto-remove notification after 3 seconds', () => {
    showNotification('Test message');
    
    const notification = document.querySelector('.notification');
    expect(notification).toBeTruthy();
    
    // Fast-forward time by 3 seconds
    vi.advanceTimersByTime(3000);
    
    expect(document.body.contains(notification)).toBe(false);
  });

  it('should handle multiple notifications', () => {
    showNotification('First message');
    showNotification('Second message');
    
    const notifications = document.querySelectorAll('.notification');
    expect(notifications.length).toBe(2);
  });

  it('should not throw error when removing already removed notification', () => {
    showNotification('Test message');
    const notification = document.querySelector('.notification');
    
    // Manually remove it
    notification.remove();
    
    // Fast-forward time - should not throw
    vi.advanceTimersByTime(3000);
    
    expect(true).toBe(true); // If we get here, no error was thrown
  });
});

