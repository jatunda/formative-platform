import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showPageLinkPicker } from '../../page-link-picker.js';

const mockGetAllPages = vi.fn();
const mockGetAllSlugs = vi.fn();
vi.mock('../../page-database-utils.js', () => ({
  getAllPages: (...args) => mockGetAllPages(...args),
  getAllSlugs: (...args) => mockGetAllSlugs(...args),
}));

// showPageLinkPicker's async work runs in a fire-and-forget IIFE, so tests
// need to flush the microtask queue before asserting on the resulting DOM.
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('showPageLinkPicker', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.alert = vi.fn();
    global.console.error = vi.fn();
    mockGetAllPages.mockReset();
    mockGetAllSlugs.mockReset();
  });

  it('lists every page that has at least one slug, sorted by title', async () => {
    mockGetAllPages.mockResolvedValue({
      pageB: { title: 'Zebra' },
      pageA: { title: 'Apple' },
    });
    mockGetAllSlugs.mockResolvedValue({ 'zebra-slug': 'pageB', 'apple-slug': 'pageA' });

    showPageLinkPicker({ onSelect: vi.fn() });
    await flush();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['Apple (/p/apple-slug)', 'Zebra (/p/zebra-slug)']);
  });

  it('excludes a page with no slug assigned', async () => {
    mockGetAllPages.mockResolvedValue({
      linkable: { title: 'Has A Slug' },
      draft: { title: 'No Slug Yet' },
    });
    mockGetAllSlugs.mockResolvedValue({ 'has-a-slug': 'linkable' });

    showPageLinkPicker({ onSelect: vi.fn() });
    await flush();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['Has A Slug (/p/has-a-slug)']);
  });

  it('picks the alphabetically-first slug when a page has more than one', async () => {
    mockGetAllPages.mockResolvedValue({ pageA: { title: 'Multi-Slug Page' } });
    mockGetAllSlugs.mockResolvedValue({ 'z-alias': 'pageA', 'a-alias': 'pageA' });

    showPageLinkPicker({ onSelect: vi.fn() });
    await flush();

    const button = document.querySelector('.lesson-popup-result-btn');
    expect(button.textContent).toBe('Multi-Slug Page (/p/a-alias)');
  });

  it('alerts and shows no popup when there are no linkable pages', async () => {
    mockGetAllPages.mockResolvedValue({ draft: { title: 'No Slug' } });
    mockGetAllSlugs.mockResolvedValue({});

    showPageLinkPicker({ onSelect: vi.fn() });
    await flush();

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('No linkable pages'));
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('filters results as the search input changes', async () => {
    mockGetAllPages.mockResolvedValue({
      pageA: { title: 'Syllabus' },
      pageB: { title: 'Resources' },
    });
    mockGetAllSlugs.mockResolvedValue({ syllabus: 'pageA', resources: 'pageB' });

    showPageLinkPicker({ onSelect: vi.fn() });
    await flush();

    const searchInput = document.querySelector('.lesson-popup-search');
    searchInput.value = 'syl';
    searchInput.oninput();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['Syllabus (/p/syllabus)']);
  });

  it('calls onSelect with the slug and title, and closes the popup', async () => {
    mockGetAllPages.mockResolvedValue({ pageA: { title: 'Syllabus' } });
    mockGetAllSlugs.mockResolvedValue({ syllabus: 'pageA' });
    const onSelect = vi.fn();

    showPageLinkPicker({ onSelect });
    await flush();

    document.querySelector('.lesson-popup-result-btn').click();

    expect(onSelect).toHaveBeenCalledWith({ slug: 'syllabus', title: 'Syllabus' });
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('closes the popup via the Close button without calling onSelect', async () => {
    mockGetAllPages.mockResolvedValue({ pageA: { title: 'Syllabus' } });
    mockGetAllSlugs.mockResolvedValue({ syllabus: 'pageA' });
    const onSelect = vi.fn();

    showPageLinkPicker({ onSelect });
    await flush();

    document.querySelector('.popup-close-btn').click();

    expect(onSelect).not.toHaveBeenCalled();
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('alerts on a database error without throwing', async () => {
    mockGetAllPages.mockRejectedValue(new Error('network down'));

    expect(() => showPageLinkPicker({ onSelect: vi.fn() })).not.toThrow();
    await flush();

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error loading pages'));
  });
});
