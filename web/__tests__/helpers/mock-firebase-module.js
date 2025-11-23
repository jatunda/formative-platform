// Mock Firebase module for testing
// This replaces the https:// URL imports in tests

export const ref = (db, path) => ({ path, key: path.split('/').pop() });

export const get = async (ref) => {
  // Default mock - tests will override this
  return {
    exists: () => false,
    val: () => null,
  };
};

export const set = async (ref, value) => Promise.resolve();

export const update = async (updates) => Promise.resolve();

export const initializeApp = (config) => ({});

export const getDatabase = (app) => ({});

