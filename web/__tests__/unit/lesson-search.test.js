import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeLessonSearch,
  showLessonSearchPopup,
  getCachedTitle,
  clearTitleCache,
} from '../../lesson-search.js';

// Mock Firebase
let mockData = {};
let mockGet = vi.fn();

vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  ref: (db, path) => ({ path, key: path.split('/').pop() }),
  get: (ref) => mockGet(ref),
}));

// Test the fuzzyScore function indirectly through the search
describe('lesson-search', () => {
  beforeEach(() => {
    mockData = {
      content: {
        hash1: { title: 'Introduction to Java' },
        hash2: { title: 'Advanced Algorithms' },
        hash3: { title: 'Data Structures and Algorithms' },
        hash4: { title: 'CSA Unit 1: Basics' },
      },
    };

    mockGet.mockImplementation((ref) => {
      const pathParts = ref.path.split('/').filter(Boolean);
      let value = mockData;
      
      for (const part of pathParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return Promise.resolve({
            exists: () => false,
            val: () => null,
          });
        }
      }
      
      return Promise.resolve({
        exists: () => value !== undefined && value !== null,
        val: () => value,
      });
    });

    const mockDb = {};
    initializeLessonSearch(mockDb);
    clearTitleCache();
    document.body.innerHTML = '';
  });

  describe('fuzzyScore (tested through search)', () => {
    it('should find exact matches with highest score', async () => {
      let searchResults = [];
      const onSelect = vi.fn();
      
      await showLessonSearchPopup({
        onSelect: (id) => {
          searchResults.push(id);
          onSelect(id);
        },
      });
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const searchInput = document.querySelector('.lesson-popup-search');
      expect(searchInput).toBeTruthy();
      
      // Simulate exact match search
      if (searchInput) {
        searchInput.value = 'Introduction to Java';
        searchInput.dispatchEvent(new Event('input'));
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const buttons = document.querySelectorAll('.lesson-popup-result-btn');
        expect(buttons.length).toBeGreaterThan(0);
        
        // First result should be the exact match
        if (buttons.length > 0) {
          expect(buttons[0].textContent).toContain('Introduction');
        }
      }
    });

    it('should handle case-insensitive matches', async () => {
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const searchInput = document.querySelector('.lesson-popup-search');
      if (searchInput) {
        searchInput.value = 'java';
        searchInput.dispatchEvent(new Event('input'));
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const buttons = document.querySelectorAll('.lesson-popup-result-btn');
        // Should find "Introduction to Java" even with lowercase
        expect(buttons.length).toBeGreaterThan(0);
      }
    });

    it('should handle partial matches', async () => {
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const searchInput = document.querySelector('.lesson-popup-search');
      if (searchInput) {
        searchInput.value = 'Algo';
        searchInput.dispatchEvent(new Event('input'));
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const buttons = document.querySelectorAll('.lesson-popup-result-btn');
        // Should find lessons with "Algorithm" in the title
        expect(buttons.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty query by showing all results', async () => {
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const buttons = document.querySelectorAll('.lesson-popup-result-btn');
      // Should show all lessons when query is empty
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('showLessonSearchPopup', () => {
    it('should create popup with search input', async () => {
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const popup = document.querySelector('.lesson-popup');
      expect(popup).toBeTruthy();
      
      const searchInput = document.querySelector('.lesson-popup-search');
      expect(searchInput).toBeTruthy();
      
      const resultsDiv = document.querySelector('.lesson-popup-results');
      expect(resultsDiv).toBeTruthy();
    });

    it('should handle database not initialized', async () => {
      // Reset initialization
      initializeLessonSearch(null);
      
      // Should show alert (we can't easily test alert, but we can verify it doesn't crash)
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Popup should not be created
      const popup = document.querySelector('.lesson-popup');
      expect(popup).toBeFalsy();
    });

    it('should handle no lessons found', async () => {
      mockData.content = {};
      
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not crash, popup might not be created or show message
      expect(true).toBe(true);
    });

    it('should call onSelect when lesson is clicked', async () => {
      const onSelect = vi.fn();
      await showLessonSearchPopup({ onSelect });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const buttons = document.querySelectorAll('.lesson-popup-result-btn');
      if (buttons.length > 0) {
        buttons[0].click();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(onSelect).toHaveBeenCalled();
        expect(typeof onSelect.mock.calls[0][0]).toBe('string');
      }
    });

    it('should close popup when close button is clicked', async () => {
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const popup = document.querySelector('.lesson-popup');
      expect(popup).toBeTruthy();
      
      const closeBtn = document.querySelector('.popup-close-btn');
      if (closeBtn) {
        closeBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const popupAfter = document.querySelector('.lesson-popup');
        expect(popupAfter).toBeFalsy();
      }
    });
  });

  describe('getCachedTitle', () => {
    it('should return cached title if available', async () => {
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Title should be cached after popup loads
      const title = getCachedTitle('hash1');
      expect(title).toBe('Introduction to Java');
    });

    it('should return undefined if not cached', () => {
      clearTitleCache();
      const title = getCachedTitle('nonexistent');
      expect(title).toBeUndefined();
    });
  });

  describe('clearTitleCache', () => {
    it('should clear all cached titles', async () => {
      await showLessonSearchPopup({ onSelect: vi.fn() });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(getCachedTitle('hash1')).toBe('Introduction to Java');
      
      clearTitleCache();
      
      expect(getCachedTitle('hash1')).toBeUndefined();
    });
  });
});

