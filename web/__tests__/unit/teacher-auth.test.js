import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TeacherAuth } from '../../teacher-auth.js';

const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
};

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

global.alert = vi.fn();
global.confirm = vi.fn(() => true);

let mockLocation;

describe('TeacherAuth', () => {
  let auth;
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.clearAllMocks();

    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    mockLocation = { href: '', hostname: 'localhost', search: '', reload: vi.fn() };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
      configurable: true,
    });

    document.body.innerHTML = '';

    auth = new TeacherAuth();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('hashPassword', () => {
    it('hashes a password', async () => {
      const hash = await auth.hashPassword('testpassword');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('produces consistent hashes for the same input', async () => {
      expect(await auth.hashPassword('test')).toBe(await auth.hashPassword('test'));
    });

    it('produces different hashes for different inputs', async () => {
      expect(await auth.hashPassword('password1')).not.toBe(await auth.hashPassword('password2'));
    });
  });

  describe('isSessionValid', () => {
    it('returns false when no session exists', () => {
      expect(auth.isSessionValid()).toBe(false);
    });

    it('returns false when the session is expired', () => {
      localStorage.setItem(auth.timeoutKey, (Date.now() - 1000000).toString());
      localStorage.setItem(auth.sessionKey, 'authenticated');
      expect(auth.isSessionValid()).toBe(false);
    });

    it('returns true when the session is valid', () => {
      localStorage.setItem(auth.timeoutKey, (Date.now() + 1000000).toString());
      localStorage.setItem(auth.sessionKey, 'authenticated');
      expect(auth.isSessionValid()).toBe(true);
    });

    it('clears the session once it has expired', () => {
      localStorage.setItem(auth.timeoutKey, (Date.now() - 1000000).toString());
      localStorage.setItem(auth.sessionKey, 'authenticated');
      auth.isSessionValid();
      expect(localStorage.getItem(auth.sessionKey)).toBeNull();
    });
  });

  describe('extendSession', () => {
    it('sets a new timeout when there is no existing one', () => {
      auth.extendSession();
      expect(localStorage.setItem).toHaveBeenCalledWith(auth.timeoutKey, expect.any(String));
    });

    it('updates the timeout once more than a minute has passed', () => {
      const oldTimeout = Date.now() - 120000 + auth.sessionDuration;
      localStorage.setItem(auth.timeoutKey, oldTimeout.toString());
      vi.clearAllMocks();

      auth.extendSession();

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('does not update the timeout within a minute of the last update', () => {
      const recentTimeout = Date.now() - 30000 + auth.sessionDuration;
      localStorage.setItem(auth.timeoutKey, recentTimeout.toString());
      vi.clearAllMocks();

      auth.extendSession();

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('setSession / clearSession', () => {
    it('setSession marks the session authenticated and sets a timeout', () => {
      auth.setSession();
      expect(localStorage.setItem).toHaveBeenCalledWith(auth.sessionKey, 'authenticated');
      expect(localStorage.setItem).toHaveBeenCalledWith(auth.timeoutKey, expect.any(String));
    });

    it('clearSession removes both session keys', () => {
      auth.setSession();
      auth.clearSession();
      expect(auth.isSessionValid()).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears the session, notifies, and redirects to the student portal', () => {
      auth.setSession();
      auth.logout();

      expect(auth.isSessionValid()).toBe(false);
      expect(alert).toHaveBeenCalledWith('Logged out successfully.');
      expect(window.location.href).toBe('index.html');
    });
  });

  describe('createPasswordModal + authenticate (real DOM interaction)', () => {
    it('resolves true and starts a session when the correct password is entered and Login is clicked', async () => {
      auth.passwordHash = await sha256Hex('correct-horse');
      const promise = auth.authenticate();

      await vi.waitFor(() => expect(document.getElementById('teacherPasswordInput')).toBeTruthy());
      document.getElementById('teacherPasswordInput').value = 'correct-horse';
      document.getElementById('loginBtn').click();

      expect(await promise).toBe(true);
      expect(auth.isSessionValid()).toBe(true);
    });

    it('resolves false and alerts when the wrong password is entered', async () => {
      auth.passwordHash = await sha256Hex('correct-horse');
      const promise = auth.authenticate();

      await vi.waitFor(() => expect(document.getElementById('teacherPasswordInput')).toBeTruthy());
      document.getElementById('teacherPasswordInput').value = 'wrong-password';
      document.getElementById('loginBtn').click();

      expect(await promise).toBe(false);
      expect(alert).toHaveBeenCalledWith('Incorrect password. Access denied.');
      expect(auth.isSessionValid()).toBe(false);
    });

    it('resolves false when Cancel is clicked, without checking the password', async () => {
      const promise = auth.authenticate();

      await vi.waitFor(() => expect(document.getElementById('cancelBtn')).toBeTruthy());
      document.getElementById('cancelBtn').click();

      expect(await promise).toBe(false);
      expect(alert).not.toHaveBeenCalled();
    });

    it('submits on Enter and cancels on Escape', async () => {
      auth.passwordHash = await sha256Hex('enter-key-pw');
      let promise = auth.authenticate();
      await vi.waitFor(() => expect(document.getElementById('teacherPasswordInput')).toBeTruthy());
      const input = document.getElementById('teacherPasswordInput');
      input.value = 'enter-key-pw';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(await promise).toBe(true);

      auth.clearSession();
      promise = auth.authenticate();
      await vi.waitFor(() => expect(document.getElementById('teacherPasswordInput')).toBeTruthy());
      document.getElementById('teacherPasswordInput').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      expect(await promise).toBe(false);
    });

    it('skips the modal entirely when the session is already valid', async () => {
      auth.setSession();
      const result = await auth.authenticate();
      expect(result).toBe(true);
      expect(document.getElementById('teacherPasswordInput')).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('redirects to the student portal when authentication fails', async () => {
      const promise = auth.requireAuth();
      await vi.waitFor(() => expect(document.getElementById('cancelBtn')).toBeTruthy());
      document.getElementById('cancelBtn').click();

      expect(await promise).toBe(false);
      expect(alert).toHaveBeenCalledWith('Access denied. Redirecting to student portal.');
      expect(window.location.href).toBe('index.html');
    });

    it('returns true without redirecting when the session is already valid', async () => {
      auth.setSession();
      expect(await auth.requireAuth()).toBe(true);
      expect(window.location.href).toBe('');
    });
  });

  describe('dev auth bypass', () => {
    it('is never active off localhost, even with the bypass flag set', () => {
      mockLocation.hostname = 'formative-platform.example.com';
      localStorage.setItem(auth.devBypassKey, 'true');
      expect(auth.isDevBypassActive()).toBe(false);
    });

    it('is inactive on localhost until the flag is set', () => {
      expect(auth.isDevBypassActive()).toBe(false);
    });

    it('?devAuth=off persists the bypass, applied at construction time', () => {
      mockLocation.search = '?devAuth=off';
      const bypassedAuth = new TeacherAuth();
      expect(bypassedAuth.isDevBypassActive()).toBe(true);
      expect(localStorage.getItem(bypassedAuth.devBypassKey)).toBe('true');
    });

    it('?devAuth=on clears a previously-set bypass', () => {
      localStorage.setItem(auth.devBypassKey, 'true');
      mockLocation.search = '?devAuth=on';
      const clearedAuth = new TeacherAuth();
      expect(clearedAuth.isDevBypassActive()).toBe(false);
    });

    it('ignores ?devAuth off of localhost', () => {
      mockLocation.hostname = 'formative-platform.example.com';
      mockLocation.search = '?devAuth=off';
      const notBypassedAuth = new TeacherAuth();
      expect(localStorage.getItem(notBypassedAuth.devBypassKey)).toBeNull();
    });

    it('authenticate() short-circuits to true and shows the banner when the bypass is active', async () => {
      localStorage.setItem(auth.devBypassKey, 'true');
      const result = await auth.authenticate();

      expect(result).toBe(true);
      expect(document.getElementById('devAuthBypassBanner')).toBeTruthy();
    });

    it('the banner disables the bypass and reloads when clicked', async () => {
      localStorage.setItem(auth.devBypassKey, 'true');
      await auth.authenticate();

      document.getElementById('devAuthBypassBanner').click();

      expect(localStorage.getItem(auth.devBypassKey)).toBeNull();
      expect(mockLocation.reload).toHaveBeenCalled();
    });

    it('does not render a second banner if one is already showing', async () => {
      localStorage.setItem(auth.devBypassKey, 'true');
      await auth.authenticate();
      await auth.authenticate();

      expect(document.querySelectorAll('#devAuthBypassBanner')).toHaveLength(1);
    });
  });

  describe('setupActivityListeners', () => {
    beforeEach(() => {
      document.body.dataset.teacherPage = 'true';
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('extends a valid session on user activity', () => {
      auth.setSession();
      // setSession() just extended the timeout - move it back over a minute
      // so the next extend isn't throttled by the "already recent" guard.
      localStorage.setItem(auth.timeoutKey, (Date.now() + auth.sessionDuration - 120000).toString());
      auth.setupActivityListeners();
      vi.clearAllMocks();

      document.dispatchEvent(new Event('click', { bubbles: true }));

      expect(localStorage.setItem).toHaveBeenCalledWith(auth.timeoutKey, expect.any(String));
    });

    it('does not extend an invalid (not-logged-in) session on activity', () => {
      auth.setupActivityListeners();
      vi.clearAllMocks();

      document.dispatchEvent(new Event('click', { bubbles: true }));

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('redirects once the session has expired, on a teacher page', () => {
      auth.setSession();
      auth.setupActivityListeners();
      localStorage.setItem(auth.timeoutKey, (Date.now() - 1000).toString());

      vi.advanceTimersByTime(60000);

      expect(alert).toHaveBeenCalledWith('Session expired. Please log in again.');
      expect(window.location.href).toBe('index.html');
    });

    it('does not redirect while the dev bypass is active, even with an expired session', () => {
      localStorage.setItem(auth.devBypassKey, 'true');
      auth.setupActivityListeners();
      localStorage.setItem(auth.timeoutKey, (Date.now() - 1000).toString());

      vi.advanceTimersByTime(60000);

      expect(alert).not.toHaveBeenCalled();
    });
  });
});
