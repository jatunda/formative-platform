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

  // Prompt for password and authenticate
  async authenticate() {
    if (this.isSessionValid()) {
      return true;
    }

    // Show password prompt
    const password = prompt('Enter teacher password:');
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
