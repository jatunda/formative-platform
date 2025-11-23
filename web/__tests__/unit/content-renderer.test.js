import { describe, it, expect, beforeEach } from 'vitest';
import { renderContent, renderMultipleContent, processInlineCode } from '../../content-renderer.js';
import { CONTENT_NOT_FOUND } from '../../constants.js';

describe('processInlineCode', () => {
  it('should wrap inline code in backticks with code tags', () => {
    const result = processInlineCode('This is `code` here');
    expect(result).toContain('<code>code</code>');
  });

  it('should escape HTML to prevent XSS', () => {
    const result = processInlineCode('<script>alert("xss")</script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
  });

  it('should process markdown links', () => {
    const result = processInlineCode('Check [this link](https://example.com)');
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('this link');
  });

  it('should process bold text', () => {
    const result = processInlineCode('This is **bold** text');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('should process italic text', () => {
    const result = processInlineCode('This is *italic* text');
    expect(result).toContain('<em>italic</em>');
  });

  it('should process bold-italic text', () => {
    const result = processInlineCode('This is ***bold-italic*** text');
    expect(result).toContain('<strong><em>bold-italic</em></strong>');
  });

  it('should handle multiple inline code blocks', () => {
    const result = processInlineCode('Use `code1` and `code2` here');
    const matches = result.match(/<code>/g);
    expect(matches).toHaveLength(2);
  });

  it('should handle mixed formatting', () => {
    const result = processInlineCode('Check `code` and **bold** text');
    expect(result).toContain('<code>code</code>');
    expect(result).toContain('<strong>bold</strong>');
  });
});

describe('renderContent', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should render content not found for null data', () => {
    renderContent(null, container);
    expect(container.textContent).toBe(CONTENT_NOT_FOUND);
  });

  it('should render title', () => {
    const data = {
      title: 'My Lesson',
      blocks: []
    };
    renderContent(data, container);
    const title = container.querySelector('.lesson-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('My Lesson');
  });

  it('should render text content', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: 'Some text content' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const text = container.querySelector('.lesson-text');
    expect(text).toBeTruthy();
    expect(text.textContent).toBe('Some text content');
  });

  it('should render code blocks', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'code', value: 'console.log("test");', language: 'javascript' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const code = container.querySelector('.lesson-code code');
    expect(code).toBeTruthy();
    expect(code.textContent).toBe('console.log("test");');
    expect(code.className).toContain('language-javascript');
  });

  it('should render code blocks without language', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'code', value: 'plain code' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const code = container.querySelector('.lesson-code code');
    expect(code).toBeTruthy();
  });

  it('should render headings', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '### Heading 3' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const heading = container.querySelector('h3');
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('Heading 3');
  });

  it('should render unordered lists', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '- Item 1\n- Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const list = container.querySelector('ul');
    expect(list).toBeTruthy();
    const items = list.querySelectorAll('li');
    expect(items).toHaveLength(2);
  });

  it('should render ordered lists', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '1. First item\n2. Second item' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const list = container.querySelector('ol');
    expect(list).toBeTruthy();
    const items = list.querySelectorAll('li');
    expect(items).toHaveLength(2);
  });

  it('should add separators between questions', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [{ type: 'text', value: 'First question' }]
        },
        {
          type: 'question',
          content: [{ type: 'text', value: 'Second question' }]
        }
      ]
    };
    renderContent(data, container);
    const separators = container.querySelectorAll('.lesson-separator');
    expect(separators).toHaveLength(1);
  });

  it('should not add separator before first question', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [{ type: 'text', value: 'Only question' }]
        }
      ]
    };
    renderContent(data, container);
    const separators = container.querySelectorAll('.lesson-separator');
    expect(separators).toHaveLength(0);
  });

  it('should add lesson-content class to container', () => {
    const data = {
      title: 'My Lesson',
      blocks: []
    };
    renderContent(data, container);
    expect(container.classList.contains('lesson-content')).toBe(true);
  });

  it('should handle multiple content types in one block', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: 'Some text' },
            { type: 'code', value: 'const x = 5;', language: 'javascript' },
            { type: 'text', value: 'More text' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const texts = container.querySelectorAll('.lesson-text');
    const codes = container.querySelectorAll('.lesson-code');
    expect(texts.length).toBeGreaterThan(0);
    expect(codes.length).toBeGreaterThan(0);
  });
});

describe('renderMultipleContent', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should render multiple content items', () => {
    const dataArray = [
      {
        title: 'Lesson 1',
        blocks: [
          {
            type: 'question',
            content: [{ type: 'text', value: 'Content 1' }]
          }
        ]
      },
      {
        title: 'Lesson 2',
        blocks: [
          {
            type: 'question',
            content: [{ type: 'text', value: 'Content 2' }]
          }
        ]
      }
    ];
    renderMultipleContent(dataArray, container);
    const titles = container.querySelectorAll('.lesson-title');
    expect(titles).toHaveLength(2);
  });

  it('should add separators between content items', () => {
    const dataArray = [
      {
        title: 'Lesson 1',
        blocks: [{ type: 'question', content: [{ type: 'text', value: 'Content 1' }] }]
      },
      {
        title: 'Lesson 2',
        blocks: [{ type: 'question', content: [{ type: 'text', value: 'Content 2' }] }]
      }
    ];
    renderMultipleContent(dataArray, container);
    const separators = container.querySelectorAll('.lesson-separator');
    expect(separators).toHaveLength(1);
  });

  it('should not add separator before first item', () => {
    const dataArray = [
      {
        title: 'Lesson 1',
        blocks: [{ type: 'question', content: [{ type: 'text', value: 'Content 1' }] }]
      }
    ];
    renderMultipleContent(dataArray, container);
    const separators = container.querySelectorAll('.lesson-separator');
    expect(separators).toHaveLength(0);
  });

  it('should clear existing content', () => {
    container.innerHTML = '<p>Old content</p>';
    const dataArray = [
      {
        title: 'Lesson 1',
        blocks: [{ type: 'question', content: [{ type: 'text', value: 'New content' }] }]
      }
    ];
    renderMultipleContent(dataArray, container);
    expect(container.textContent).not.toContain('Old content');
    expect(container.textContent).toContain('New content');
  });
});

