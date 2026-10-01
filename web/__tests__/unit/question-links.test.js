import { describe, it, expect } from 'vitest';
import {
  QUESTION_LINK_PATTERN,
  parseQuestionLinkMatch,
  extractQuestionLinkSlugs,
  rewriteQuestionSlugInContent
} from '../../question-links.js';

function matchAll(text) {
  return [...text.matchAll(QUESTION_LINK_PATTERN)];
}

describe('QUESTION_LINK_PATTERN + parseQuestionLinkMatch', () => {
  it('parses a plain Question Link', () => {
    const [match] = matchAll('[[q:loops-1]]');
    expect(parseQuestionLinkMatch(match[1], match[2])).toEqual({ slug: 'loops-1', display: null });
  });

  it('parses a Question Link with a display alias', () => {
    const [match] = matchAll('[[q:loops-1|Try this one]]');
    expect(parseQuestionLinkMatch(match[1], match[2])).toEqual({ slug: 'loops-1', display: 'Try this one' });
  });

  it('finds multiple links in one string', () => {
    const matches = matchAll('First [[q:loops-1]] then [[q:loops-2]].');
    expect(matches).toHaveLength(2);
  });

  it('does not match a plain Page Link', () => {
    expect(matchAll('[[syllabus]]')).toHaveLength(0);
  });

  it('does not match an uppercase or malformed slug', () => {
    expect(matchAll('[[q:Loops-1]]')).toHaveLength(0);
    expect(matchAll('[[q:]]')).toHaveLength(0);
  });
});

describe('extractQuestionLinkSlugs', () => {
  it('collects Question Link slugs from top-level text', () => {
    const content = {
      title: 'T',
      blocks: [{ type: 'question', content: [{ type: 'text', value: 'See [[q:loops-1]] and [[q:loops-2]].' }] }]
    };
    expect(extractQuestionLinkSlugs(content)).toEqual(['loops-1', 'loops-2']);
  });

  it('deduplicates repeated references to the same slug', () => {
    const content = {
      title: 'T',
      blocks: [{ type: 'question', content: [{ type: 'text', value: '[[q:loops-1]] ... [[q:loops-1|again]]' }] }]
    };
    expect(extractQuestionLinkSlugs(content)).toEqual(['loops-1']);
  });

  it('finds Question Links nested inside a collapsible', () => {
    const content = {
      title: 'T',
      blocks: [{
        type: 'question',
        content: [{
          type: 'collapsible',
          title: 'Practice',
          expanded: false,
          content: [{ type: 'text', value: 'Try [[q:loops-1]]' }]
        }]
      }]
    };
    expect(extractQuestionLinkSlugs(content)).toEqual(['loops-1']);
  });

  it('returns an empty array for content with no Question Links', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: 'plain text with [[a-page-link]]' }] }] };
    expect(extractQuestionLinkSlugs(content)).toEqual([]);
  });
});

describe('rewriteQuestionSlugInContent', () => {
  it('rewrites a plain Question Link', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: '[[q:old-slug]]' }] }] };
    const result = rewriteQuestionSlugInContent(content, 'old-slug', 'new-slug');
    expect(result.blocks[0].content[0].value).toBe('[[q:new-slug]]');
  });

  it('rewrites a Question Link with a display alias', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: '[[q:old-slug|Display]]' }] }] };
    const result = rewriteQuestionSlugInContent(content, 'old-slug', 'new-slug');
    expect(result.blocks[0].content[0].value).toBe('[[q:new-slug|Display]]');
  });

  it('does not touch an unrelated slug that shares a prefix', () => {
    const content = {
      title: 'T',
      blocks: [{ type: 'question', content: [{ type: 'text', value: '[[q:loops]] and [[q:loops-2]]' }] }]
    };
    const result = rewriteQuestionSlugInContent(content, 'loops', 'iteration');
    expect(result.blocks[0].content[0].value).toBe('[[q:iteration]] and [[q:loops-2]]');
  });

  it('rewrites inside a nested collapsible', () => {
    const content = {
      title: 'T',
      blocks: [{
        type: 'question',
        content: [{
          type: 'collapsible',
          title: 'Practice',
          expanded: false,
          content: [{ type: 'text', value: '[[q:old-slug]]' }]
        }]
      }]
    };
    const result = rewriteQuestionSlugInContent(content, 'old-slug', 'new-slug');
    expect(result.blocks[0].content[0].content[0].value).toBe('[[q:new-slug]]');
  });

  it('does not mutate the input content', () => {
    const content = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: '[[q:old-slug]]' }] }] };
    rewriteQuestionSlugInContent(content, 'old-slug', 'new-slug');
    expect(content.blocks[0].content[0].value).toBe('[[q:old-slug]]');
  });
});
