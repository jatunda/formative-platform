// teacher-auth.js - Simple password authentication for teacher pages
// Password is hashed using SHA-256 to avoid storing plaintext in code

class TeacherAuth {
  constructor() {
    this.sessionKey = 'teacherAuthSession';
    this.timeoutKey = 'teacherAuthTimeout';
    this.sessionDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    // Password hash (SHA-256) - you'll need to update this with your actual password hash
    // To generate: Use browser console: crypto.subtle.digest('SHA-256', new TextEncoder().encode('your-password')).then(hash => console.log(Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')))
    this.passwordHash = '8d2c6f8f6bec6ec2590f27787dcf38008cec8ceb3c41eb3777fcb6d084a0b0b8'; // Replace with actual hash
  }

  // Hash a password using SHA-256
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Check if current session is valid
  isSessionValid() {
    const sessionTime = localStorage.getItem(this.timeoutKey);
    if (!sessionTime) return false;
    
    const currentTime = Date.now();
    const sessionExpiry = parseInt(sessionTime);
    
    if (currentTime > sessionExpiry) {
      this.clearSession();
      return false;
    }
    
    // Extend session on activity
    this.extendSession();
    return localStorage.getItem(this.sessionKey) === 'authenticated';
  }

  // Extend session timeout
  extendSession() {
    const newTimeout = Date.now() + this.sessionDuration;
    localStorage.setItem(this.timeoutKey, newTimeout.toString());
  }

  // Set authenticated session
  setSession() {
    localStorage.setItem(this.sessionKey, 'authenticated');
    this.extendSession();
  }

  // Clear session
  clearSession() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.timeoutKey);
  }

  // Create a secure password input modal
  createPasswordModal() {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: sans-serif;
      `;

      // Create modal box
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #2d3748;
        color: #e2e8f0;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        min-width: 320px;
        max-width: 400px;
        border: 1px solid #4a5568;
      `;

      modal.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #63b3ed; font-size: 1.3em;">Teacher Authentication</h2>
        <p style="margin: 0 0 15px 0; color: #a0aec0;">Enter your teacher password to access this page:</p>
        <input type="password" id="teacherPasswordInput" placeholder="Password" style="
          width: 100%;
          padding: 12px;
          border: 1px solid #4a5568;
          border-radius: 8px;
          background-color: #374151;
          color: #e2e8f0;
          font-size: 16px;
          box-sizing: border-box;
          margin-bottom: 20px;
        ">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancelBtn" style="
            padding: 10px 20px;
            border: 1px solid #4a5568;
            border-radius: 8px;
            background-color: #374151;
            color: #e2e8f0;
            cursor: pointer;
            font-size: 16px;
          ">Cancel</button>
          <button id="loginBtn" style="
            padding: 10px 20px;
            border: 1px solid #63b3ed;
            border-radius: 8px;
            background-color: #63b3ed;
            color: #1a202c;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
          ">Login</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const passwordInput = modal.querySelector('#teacherPasswordInput');
      const loginBtn = modal.querySelector('#loginBtn');
      const cancelBtn = modal.querySelector('#cancelBtn');

      // Focus the password input
      setTimeout(() => passwordInput.focus(), 100);

      // Handle login
      const handleLogin = () => {
        const password = passwordInput.value;
        document.body.removeChild(overlay);
        resolve(password || null);
      };

      // Handle cancel
      const handleCancel = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };

      // Event listeners
      loginBtn.addEventListener('click', handleLogin);
      cancelBtn.addEventListener('click', handleCancel);
      
      // Enter key submits, Escape cancels
      passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleLogin();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      });

      // Click outside to cancel
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          handleCancel();
        }
      });
    });
  }

  // Prompt for password and authenticate
  async authenticate() {
    if (this.isSessionValid()) {
      return true;
    }

    // Show secure password modal
    const password = await this.createPasswordModal();
    if (!password) {
      return false;
    }

    try {
      const inputHash = await this.hashPassword(password);
      
      if (inputHash === this.passwordHash) {
        this.setSession();
        return true;
      } else {
        alert('Incorrect password. Access denied.');
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication error. Please try again.');
      return false;
    }
  }

  // Check authentication and redirect if needed
  async requireAuth() {
    const isAuthenticated = await this.authenticate();
    if (!isAuthenticated) {
      alert('Access denied. Redirecting to student portal.');
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  // Logout function
  logout() {
    this.clearSession();
    alert('Logged out successfully.');
    window.location.href = 'index.html';
  }

  // Setup activity listeners to extend session
  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const extendSession = () => {
      if (this.isSessionValid()) {
        this.extendSession();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, extendSession, true);
    });

    // Check session validity every minute
    setInterval(() => {
      if (!this.isSessionValid() && window.location.pathname.includes('teacher') || window.location.pathname.includes('editor')) {
        alert('Session expired. Please log in again.');
        window.location.href = 'index.html';
      }
    }, 60000); // Check every minute
  }
}

// Export for use in other modules
window.TeacherAuth = TeacherAuth;

// Auto-setup if this script is loaded directly
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.teacherAuth) {
      window.teacherAuth.setupActivityListeners();
    }
  });
} else {
  if (window.teacherAuth) {
    window.teacherAuth.setupActivityListeners();
  }
}
