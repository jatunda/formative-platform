/**
 * Firebase Mocking Utilities
 * Provides mock implementations of Firebase Realtime Database functions
 * for use in unit tests
 */

export function createMockDatabase(initialData = {}) {
  let data = JSON.parse(JSON.stringify(initialData));
  
  const mockRef = (path) => {
    return {
      path,
      key: path.split('/').pop(),
    };
  };

  const mockGet = async (ref) => {
    const pathParts = ref.path.split('/').filter(Boolean);
    let value = data;
    
    for (const part of pathParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return {
          exists: () => false,
          val: () => null,
        };
      }
    }
    
    return {
      exists: () => value !== undefined && value !== null,
      val: () => value,
    };
  };

  const mockSet = async (ref, value) => {
    const pathParts = ref.path.split('/').filter(Boolean);
    let current = data;
    
    // Navigate to parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    const key = pathParts[pathParts.length - 1];
    if (value === null) {
      delete current[key];
    } else {
      current[key] = value;
    }
    
    return Promise.resolve();
  };

  const mockUpdate = async (updates) => {
    for (const [path, value] of Object.entries(updates)) {
      const pathParts = path.split('/').filter(Boolean);
      let current = data;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
      
      const key = pathParts[pathParts.length - 1];
      if (value === null) {
        delete current[key];
      } else {
        current[key] = value;
      }
    }
    
    return Promise.resolve();
  };

  return {
    data,
    ref: mockRef,
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
    reset: (newData = {}) => {
      data = JSON.parse(JSON.stringify(newData));
    },
  };
}

/**
 * Create a mock Firebase database reference
 */
export function createMockRef(path) {
  return {
    path,
    key: path.split('/').pop(),
  };
}

/**
 * Create a mock snapshot with exists and val methods
 */
export function createMockSnapshot(exists, value) {
  return {
    exists: () => exists,
    val: () => value,
  };
}

