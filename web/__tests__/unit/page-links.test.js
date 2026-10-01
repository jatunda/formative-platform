import { describe, it, expect } from 'vitest';
import {
  PAGE_LINK_PATTERN,
  parsePageLinkMatch,
  extractPageLinkSlugs,
  rewriteSlugInContent
} from '../../page-links.js';

function matchAll(text) {
  return [...text.matchAll(PAGE_LINK_PATTERN)];
}

describe('PAGE_LINK_PATTERN + parsePageLinkMatch', () => {
  it('parses a plain Page Link', () => {
    const [match] = matchAll('[[syllabus]]');
    expect(parsePageLinkMatch(match[1], match[2], match[3])).toEqual({
      slug: 'syllabus', header: null, display: null
    });
  });

  it('parses a Page Link with a display alias', () => {
    const [match] = matchAll('[[syllabus|Course Syllabus]]');
    expect(parsePageLinkMatch(match[1], match[2], match[3])).toEqual({
      slug: 'syllabus', header: null, display: 'Course Syllabus'
    });
  });

  it('parses a plain Section Link', () => {
    const [match] = matchAll('[[#Grading Policy]]');
    expect(parsePageLinkMatch(match[1], match[2], match[3])).toEqual({
      slug: null, header: 'Grading Policy', display: null
    });
  });

  it('parses a Section Link with a display alias', () => {
    const [match] = matchAll('[[#Grading Policy|Jump to Grading]]');
    expect(parsePageLinkMatch(match[1], match[2], match[3])).toEqual({
      slug: null, header: 'Grading Policy', display: 'Jump to Grading'
    });
  });

  it('treats the unsupported slug#header combo as a Page Link to slug alone', () => {
    const [match] = matchAll('[[syllabus#Grading]]');
    expect(parsePageLinkMatch(match[1], match[2], match[3])).toEqual({
      slug: 'syllabus', header: null, display: null
    });
  });

  it('finds multiple links in one string', () => {
    const matches = matchAll('See [[syllabus]] and [[#Grading Policy]].');
    expect(matches).toHaveLength(2);
  });

  it('does not match ordinary single-bracket markdown links', () => {
    expect(matchAll('[this link](https://example.com)')).toHaveLength(0);
  });
});

describe('extractPageLinkSlugs', () => {
  it('collects Page Link slugs from top-level text', () => {
    const content = {
      title: 'T',
      blocks: [{ type: 'question', content: [{ type: 'text', value: 'See [[syllabus]] and [[resources]].' }] }]
    };
    expect(extractPageLinkSlugs(content)).toEqual(['syllabus', 'resources']);
  });

  it('deduplicates repeated references to the same slug', () => {
    const content = {
      title: 'T',
      blocks: [{ type: 'question', content: [{ type: 'text', value: '[[syllabus]] ... [[syllabus|again]]' }] }]
    };
    expect(extractPageLinkSlugs(content)).toEqual(['syllabus']);
  });

  it('ignores Section Links (no slug)', () => {
    const content = {
      title: 'T',
      blocks: [{ type: 'question', content: [{ type: 'text', value: '[[#Grading Policy]]' }] }]
    };
    expect(extractPageLinkSlugs(content)).toEqual([]);
  });

  it('finds Page Links nested inside a collapsible', () => {
    const content = {
      title: 'T',
      blocks: [{
        type: 'question',
        content: [{
          type: 'collapsible',
          title: 'Hint',
          expanded: false,
          content: [{ type: 'text', value: 'See [[syllabus]]' }]
        }]
      }]
    };
    expect(extractPageLinkSlugs(content)).toEqual(['syllabus']);
  });

  it('does not throw when a collapsible has no content field (Firebase drops empty arrays)', () => {
    const content = {
      title: 'T',
      blocks: [{
        type: 'question',
        content: [{ type: 'collapsible', title: 'Empty', expanded: false }]
      }]
    };
    expect(extractPageLinkSlugs(content)).toEqual([]);
  });

  it('returns an empty array for content with no links', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: 'plain text' }] }] };
    expect(extractPageLinkSlugs(content)).toEqual([]);
  });

  it('ignores [[q:slug]] Question Link syntax', () => {
    const content = {
      title: 'T',
      blocks: [{ type: 'question', content: [{ type: 'text', value: 'See [[q:loops-1]] and [[syllabus]].' }] }]
    };
    expect(extractPageLinkSlugs(content)).toEqual(['syllabus']);
  });
});

describe('rewriteSlugInContent', () => {
  it('rewrites a plain Page Link', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: '[[old-slug]]' }] }] };
    const result = rewriteSlugInContent(content, 'old-slug', 'new-slug');
    expect(result.blocks[0].content[0].value).toBe('[[new-slug]]');
  });

  it('rewrites a Page Link with a display alias', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: '[[old-slug|Display]]' }] }] };
    const result = rewriteSlugInContent(content, 'old-slug', 'new-slug');
    expect(result.blocks[0].content[0].value).toBe('[[new-slug|Display]]');
  });

  it('does not touch an unrelated slug that shares a prefix', () => {
    const content = {
      title: 'T',
      blocks: [{ type: 'question', content: [{ type: 'text', value: '[[syllabus]] and [[syllabus-2026]]' }] }]
    };
    const result = rewriteSlugInContent(content, 'syllabus', 'course-info');
    expect(result.blocks[0].content[0].value).toBe('[[course-info]] and [[syllabus-2026]]');
  });

  it('rewrites inside a nested collapsible', () => {
    const content = {
      title: 'T',
      blocks: [{
        type: 'question',
        content: [{
          type: 'collapsible',
          title: 'Hint',
          expanded: false,
          content: [{ type: 'text', value: '[[old-slug]]' }]
        }]
      }]
    };
    const result = rewriteSlugInContent(content, 'old-slug', 'new-slug');
    expect(result.blocks[0].content[0].content[0].value).toBe('[[new-slug]]');
  });

  it('does not mutate the input content', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: '[[old-slug]]' }] }] };
    rewriteSlugInContent(content, 'old-slug', 'new-slug');
    expect(content.blocks[0].content[0].value).toBe('[[old-slug]]');
  });

  it('does not throw when a collapsible has no content field', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'collapsible', title: 'Empty', expanded: false }] }] };
    expect(() => rewriteSlugInContent(content, 'old-slug', 'new-slug')).not.toThrow();
  });
});
