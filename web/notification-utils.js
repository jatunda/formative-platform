// Notification Utility Functions
// Provides a consistent notification system across the application.

/**
 * Show a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification: 'success', 'error', or 'info' (default)
 */
export function showNotification(message, type = "info") {
  // Remove any existing notification
  // const existing = document.querySelector('.notification');
  // if (existing) {
  //   existing.remove();
  // }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '12px 16px';
  notification.style.borderRadius = '8px';
  notification.style.zIndex = '1000';
  notification.style.maxWidth = '300px';
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  notification.style.fontSize = '14px';
  notification.style.fontWeight = '500';
  
  if (type === 'success') {
    notification.style.backgroundColor = '#d4edda';
    notification.style.color = '#155724';
    notification.style.border = '1px solid #c3e6cb';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#f8d7da';
    notification.style.color = '#721c24';
    notification.style.border = '1px solid #f5c6cb';
  } else if (type === 'info') {
    notification.style.backgroundColor = '#d1ecf1';
    notification.style.color = '#0c5460';
    notification.style.border = '1px solid #bee5eb';
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

