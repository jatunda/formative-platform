/**
 * Test Utilities
 * Common helper functions for use across tests
 */

/**
 * Create a mock DOM element for testing
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @returns {HTMLElement} Mock element
 */
export function createMockElement(tag = 'div', attributes = {}) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

/**
 * Wait for a specified amount of time (for async testing)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the delay
 */
export function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock Firebase database reference
 * @param {string} path - Database path
 * @returns {Object} Mock reference object
 */
export function createMockRef(path) {
  return {
    path,
    key: path.split('/').pop(),
    parent: path.split('/').slice(0, -1).join('/'),
  };
}

/**
 * Create mock Firebase snapshot
 * @param {boolean} exists - Whether the snapshot exists
 * @param {*} value - The snapshot value
 * @returns {Object} Mock snapshot object
 */
export function createMockSnapshot(exists, value) {
  return {
    exists: () => exists,
    val: () => value,
    key: null,
    ref: null,
  };
}

/**
 * Setup DOM environment for tests
 * Clears body and provides fresh DOM
 */
export function setupDOM() {
  document.body.innerHTML = '';
}

/**
 * Teardown DOM environment after tests
 */
export function teardownDOM() {
  document.body.innerHTML = '';
}

