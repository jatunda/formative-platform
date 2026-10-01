import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSlugFromPath, initializePage } from '../../page-view.js';
import { PAGE_NOT_FOUND } from '../../constants.js';

// firebase-app.js and firebase-database.js both alias to this same mock
// module (see vitest.config.js) since page-view.js pulls in firebase-config.js.
vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  initializeApp: () => ({}),
  getDatabase: () => ({}),
  connectDatabaseEmulator: () => {},
}));

const mockResolveSlugToPageId = vi.fn();
const mockGetPageFromDB = vi.fn();
vi.mock('../../page-database-utils.js', () => ({
  initializePageDatabase: vi.fn(),
  resolveSlugToPageId: (...args) => mockResolveSlugToPageId(...args),
  getPageFromDB: (...args) => mockGetPageFromDB(...args),
}));

const mockRenderContent = vi.fn((data, el) => {
  el.textContent = data ? `rendered:${data.title}` : 'Content not found.';
});
vi.mock('../../content-renderer.js', () => ({
  renderContent: (...args) => mockRenderContent(...args),
}));

vi.mock('../../question-database-utils.js', () => ({
  initializeQuestionDatabase: vi.fn(),
}));

const mockMountQuestionEmbeds = vi.fn();
vi.mock('../../question-embed.js', () => ({
  mountQuestionEmbeds: (...args) => mockMountQuestionEmbeds(...args),
}));

describe('getSlugFromPath', () => {
  it('extracts the slug from a /p/<slug> path', () => {
    expect(getSlugFromPath('/p/syllabus')).toBe('syllabus');
  });

  it('handles a trailing slash', () => {
    expect(getSlugFromPath('/p/syllabus/')).toBe('syllabus');
  });

  it('returns null when the path has no slug', () => {
    expect(getSlugFromPath('/p/')).toBeNull();
    expect(getSlugFromPath('/')).toBeNull();
  });
});

describe('initializePage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="content"></div>';
    mockResolveSlugToPageId.mockReset();
    mockGetPageFromDB.mockReset();
    mockRenderContent.mockClear();
    mockMountQuestionEmbeds.mockReset();
  });

  it('renders the page when the slug resolves', async () => {
    window.history.pushState(null, '', '/p/syllabus');
    mockResolveSlugToPageId.mockResolvedValue('abc123');
    mockGetPageFromDB.mockResolvedValue({ title: 'Syllabus', blocks: [] });

    await initializePage();

    expect(mockResolveSlugToPageId).toHaveBeenCalledWith('syllabus');
    expect(mockGetPageFromDB).toHaveBeenCalledWith('abc123');
    expect(document.getElementById('content').textContent).toBe('rendered:Syllabus');
    expect(mockMountQuestionEmbeds).toHaveBeenCalledWith(document.getElementById('content'));
  });

  it('shows Page not found when the slug does not resolve', async () => {
    window.history.pushState(null, '', '/p/missing');
    mockResolveSlugToPageId.mockResolvedValue(null);

    await initializePage();

    expect(mockGetPageFromDB).not.toHaveBeenCalled();
    expect(document.getElementById('content').textContent).toBe(PAGE_NOT_FOUND);
  });

  it('shows Page not found when the path has no slug at all', async () => {
    window.history.pushState(null, '', '/p/');

    await initializePage();

    expect(mockResolveSlugToPageId).not.toHaveBeenCalled();
    expect(document.getElementById('content').textContent).toBe(PAGE_NOT_FOUND);
  });
});
