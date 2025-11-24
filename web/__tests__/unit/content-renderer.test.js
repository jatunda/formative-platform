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

  it('should group consecutive list items into single list with empty lines', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '1. list\n\n2. list\n\n3. hasdf' }
          ]
        }
      ]
    };
    renderContent(data, container);
    // Should create only ONE ol element
    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(1);
    const items = lists[0].querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('list');
    expect(items[1].textContent).toBe('list');
    expect(items[2].textContent).toBe('hasdf');
  });

  it('should group consecutive list items when DSL parser creates separate text items', () => {
    // This simulates what the DSL parser does - creates separate text items for each line
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '1. list' },
            { type: 'text', value: '2. list' },
            { type: 'text', value: '3. hasdf' }
          ]
        }
      ]
    };
    renderContent(data, container);
    // Should create only ONE ol element, not three
    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(1);
    const items = lists[0].querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('list');
    expect(items[1].textContent).toBe('list');
    expect(items[2].textContent).toBe('hasdf');
  });

  it('should handle empty lines between list items in separate text items', () => {
    // Simulates DSL parser creating separate items, some with empty lines
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '1. list' },
            { type: 'text', value: '' }, // Empty line
            { type: 'text', value: '2. list' },
            { type: 'text', value: '' }, // Empty line
            { type: 'text', value: '3. hasdf' }
          ]
        }
      ]
    };
    renderContent(data, container);
    // Should create only ONE ol element
    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(1);
    const items = lists[0].querySelectorAll('li');
    expect(items).toHaveLength(3);
  });

  it('should create nested lists with 2-space indentation', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '-  hi\n  - hellow again' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const topList = container.querySelector('ul');
    expect(topList).toBeTruthy();
    const topItems = Array.from(topList.children).filter(child => child.tagName === 'LI');
    expect(topItems).toHaveLength(1);
    expect(topItems[0].textContent.trim()).toContain('hi');
    
    // Check for nested list
    const nestedList = topItems[0].querySelector('ul');
    expect(nestedList).toBeTruthy();
    const nestedItems = nestedList.querySelectorAll('li');
    expect(nestedItems).toHaveLength(1);
    expect(nestedItems[0].textContent.trim()).toBe('hellow again');
  });

  it('should create nested ordered lists with 2-space indentation', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '2. hello\n  3. whats up' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const topList = container.querySelector('ol');
    expect(topList).toBeTruthy();
    const topItems = Array.from(topList.children).filter(child => child.tagName === 'LI');
    expect(topItems).toHaveLength(1);
    expect(topItems[0].textContent.trim()).toContain('hello');
    
    // Check for nested list
    const nestedList = topItems[0].querySelector('ol');
    expect(nestedList).toBeTruthy();
    const nestedItems = nestedList.querySelectorAll('li');
    expect(nestedItems).toHaveLength(1);
    expect(nestedItems[0].textContent.trim()).toBe('whats up');
  });

  it('should create nested lists when items are in separate text items (DSL parser behavior)', () => {
    // This simulates the exact scenario: DSL parser creates separate text items
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '-  hi' },
            { type: 'text', value: '  - hellow again' },
            { type: 'text', value: '2. hello' },
            { type: 'text', value: '  3. whats up' }
          ]
        }
      ]
    };
    renderContent(data, container);
    
    // Check unordered list nesting
    const ul = container.querySelector('ul');
    expect(ul).toBeTruthy();
    const ulItems = Array.from(ul.children).filter(child => child.tagName === 'LI');
    expect(ulItems).toHaveLength(1);
    expect(ulItems[0].textContent.trim()).toContain('hi');
    
    const nestedUl = ulItems[0].querySelector('ul');
    expect(nestedUl).toBeTruthy();
    const nestedUlItems = nestedUl.querySelectorAll('li');
    expect(nestedUlItems).toHaveLength(1);
    expect(nestedUlItems[0].textContent.trim()).toBe('hellow again');
    
    // Check ordered list nesting
    const ol = container.querySelector('ol');
    expect(ol).toBeTruthy();
    const olItems = Array.from(ol.children).filter(child => child.tagName === 'LI');
    expect(olItems).toHaveLength(1);
    expect(olItems[0].textContent.trim()).toContain('hello');
    
    const nestedOl = olItems[0].querySelector('ol');
    expect(nestedOl).toBeTruthy();
    const nestedOlItems = nestedOl.querySelectorAll('li');
    expect(nestedOlItems).toHaveLength(1);
    expect(nestedOlItems[0].textContent.trim()).toBe('whats up');
  });

  it('should render nested unordered lists (2 levels)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '- Item 1\n  - Item 1.1\n  - Item 1.2\n- Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const topList = container.querySelector('ul');
    expect(topList).toBeTruthy();
    const topItems = Array.from(topList.children).filter(child => child.tagName === 'LI');
    expect(topItems).toHaveLength(2);
    
    // Check nested list in first item
    const nestedList = topItems[0].querySelector('ul');
    expect(nestedList).toBeTruthy();
    const nestedItems = nestedList.querySelectorAll('li');
    expect(nestedItems).toHaveLength(2);
    expect(nestedItems[0].textContent).toBe('Item 1.1');
    expect(nestedItems[1].textContent).toBe('Item 1.2');
  });

  it('should render nested unordered lists (3 levels)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '- Item 1\n  - Item 1.1\n    - Item 1.1.1\n- Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const topList = container.querySelector('ul');
    expect(topList).toBeTruthy();
    const topItems = Array.from(topList.children).filter(child => child.tagName === 'LI');
    expect(topItems).toHaveLength(2);
    
    // Check first level nesting
    const level1List = topItems[0].querySelector('ul');
    expect(level1List).toBeTruthy();
    
    // Check second level nesting
    const level1Items = Array.from(level1List.children).filter(child => child.tagName === 'LI');
    expect(level1Items).toHaveLength(1);
    const level2List = level1Items[0].querySelector('ul');
    expect(level2List).toBeTruthy();
    const level2Items = level2List.querySelectorAll('li');
    expect(level2Items).toHaveLength(1);
    expect(level2Items[0].textContent).toBe('Item 1.1.1');
  });

  it('should render nested ordered lists (2 levels)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '1. Item 1\n   1. Item 1.1\n   2. Item 1.2\n2. Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const topList = container.querySelector('ol');
    expect(topList).toBeTruthy();
    const topItems = Array.from(topList.children).filter(child => child.tagName === 'LI');
    expect(topItems).toHaveLength(2);
    
    // Check nested list in first item
    const nestedList = topItems[0].querySelector('ol');
    expect(nestedList).toBeTruthy();
    const nestedItems = nestedList.querySelectorAll('li');
    expect(nestedItems).toHaveLength(2);
    expect(nestedItems[0].textContent).toBe('Item 1.1');
    expect(nestedItems[1].textContent).toBe('Item 1.2');
  });

  it('should render nested ordered lists (3 levels)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '1. Item 1\n   1. Item 1.1\n      1. Item 1.1.1\n2. Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const topList = container.querySelector('ol');
    expect(topList).toBeTruthy();
    const topItems = Array.from(topList.children).filter(child => child.tagName === 'LI');
    expect(topItems).toHaveLength(2);
    
    // Check first level nesting
    const level1List = topItems[0].querySelector('ol');
    expect(level1List).toBeTruthy();
    
    // Check second level nesting
    const level1Items = Array.from(level1List.children).filter(child => child.tagName === 'LI');
    expect(level1Items).toHaveLength(1);
    const level2List = level1Items[0].querySelector('ol');
    expect(level2List).toBeTruthy();
    const level2Items = level2List.querySelectorAll('li');
    expect(level2Items).toHaveLength(1);
    expect(level2Items[0].textContent).toBe('Item 1.1.1');
  });

  it('should handle different indentation units (4 spaces)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '- Item 1\n    - Item 1.1\n- Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const topList = container.querySelector('ul');
    expect(topList).toBeTruthy();
    const topItems = Array.from(topList.children).filter(child => child.tagName === 'LI');
    expect(topItems).toHaveLength(2);
    
    const nestedList = topItems[0].querySelector('ul');
    expect(nestedList).toBeTruthy();
    const nestedItems = nestedList.querySelectorAll('li');
    expect(nestedItems).toHaveLength(1);
    expect(nestedItems[0].textContent).toBe('Item 1.1');
  });

  it('should handle tab indentation', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '- Item 1\n\t- Item 1.1\n- Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const topList = container.querySelector('ul');
    expect(topList).toBeTruthy();
    const topItems = Array.from(topList.children).filter(child => child.tagName === 'LI');
    expect(topItems).toHaveLength(2);
    
    const nestedList = topItems[0].querySelector('ul');
    expect(nestedList).toBeTruthy();
    const nestedItems = nestedList.querySelectorAll('li');
    expect(nestedItems).toHaveLength(1);
    expect(nestedItems[0].textContent).toBe('Item 1.1');
  });

  it('should reset list state when encountering non-list content', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '- Item 1\n  - Item 1.1\nSome text\n- Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    // Get top-level lists only (direct children of container)
    const topLevelLists = Array.from(container.children).filter(child => 
      child.tagName === 'UL' || child.tagName === 'OL'
    );
    expect(topLevelLists).toHaveLength(2); // Two separate top-level lists
    
    // First list should have nesting
    const firstList = topLevelLists[0];
    const firstItems = Array.from(firstList.children).filter(child => child.tagName === 'LI');
    expect(firstItems).toHaveLength(1);
    const nestedList = firstItems[0].querySelector('ul');
    expect(nestedList).toBeTruthy();
    
    // Second list should be flat (list state was reset)
    const secondList = topLevelLists[1];
    const secondItems = Array.from(secondList.children).filter(child => child.tagName === 'LI');
    expect(secondItems).toHaveLength(1);
    expect(secondList.querySelector('ul')).toBeFalsy();
  });

  it('should handle mixed list types at different levels', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: '- Item 1\n  1. Item 1.1\n- Item 2' }
          ]
        }
      ]
    };
    renderContent(data, container);
    const ul = container.querySelector('ul');
    expect(ul).toBeTruthy();
    const ulItems = Array.from(ul.children).filter(child => child.tagName === 'LI');
    expect(ulItems).toHaveLength(2);
    
    // First item should have nested ordered list
    const nestedOl = ulItems[0].querySelector('ol');
    expect(nestedOl).toBeTruthy();
    const olItems = nestedOl.querySelectorAll('li');
    expect(olItems).toHaveLength(1);
    expect(olItems[0].textContent).toBe('Item 1.1');
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

  it('should render collapsed section (details not open)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Hint Section',
              expanded: false,
              content: [
                { type: 'text', value: 'Hidden content' }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const details = container.querySelector('.lesson-collapsible');
    expect(details).toBeTruthy();
    expect(details.hasAttribute('open')).toBe(false);
    const summary = details.querySelector('.lesson-collapsible-summary');
    expect(summary).toBeTruthy();
    expect(summary.textContent).toContain('Hint Section');
  });

  it('should render expanded section (details has open attribute)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Expanded Section',
              expanded: true,
              content: [
                { type: 'text', value: 'Visible content' }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const details = container.querySelector('.lesson-collapsible');
    expect(details).toBeTruthy();
    expect(details.hasAttribute('open')).toBe(true);
  });

  it('should render section without title (empty summary)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: '',
              expanded: false,
              content: [
                { type: 'text', value: 'Content' }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const summary = container.querySelector('.lesson-collapsible-summary');
    expect(summary).toBeTruthy();
    expect(summary.classList.contains('lesson-collapsible-summary-empty')).toBe(true);
    expect(summary.textContent.trim()).toBe('');
  });

  it('should render nested sections', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Outer',
              expanded: false,
              content: [
                { type: 'text', value: 'Outer content' },
                {
                  type: 'collapsible',
                  title: 'Inner',
                  expanded: false,
                  content: [
                    { type: 'text', value: 'Inner content' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const outerDetails = container.querySelector('.lesson-collapsible');
    expect(outerDetails).toBeTruthy();
    const innerDetails = outerDetails.querySelector('.lesson-collapsible');
    expect(innerDetails).toBeTruthy();
    expect(innerDetails.querySelector('.lesson-collapsible-summary').textContent).toContain('Inner');
  });

  it('should render section with text content', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Section',
              expanded: true,
              content: [
                { type: 'text', value: 'Some text here' }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const contentDiv = container.querySelector('.collapsible-content');
    expect(contentDiv).toBeTruthy();
    const text = contentDiv.querySelector('.lesson-text');
    expect(text).toBeTruthy();
    expect(text.textContent).toContain('Some text here');
  });

  it('should render section with code blocks', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Code Section',
              expanded: true,
              content: [
                { type: 'code', value: 'console.log("test");', language: 'javascript' }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const contentDiv = container.querySelector('.collapsible-content');
    const code = contentDiv.querySelector('.lesson-code code');
    expect(code).toBeTruthy();
    expect(code.textContent).toBe('console.log("test");');
    expect(code.className).toContain('language-javascript');
  });

  it('should render section with lists', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'List Section',
              expanded: true,
              content: [
                { type: 'text', value: '- Item 1\n- Item 2' }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const contentDiv = container.querySelector('.collapsible-content');
    const list = contentDiv.querySelector('.lesson-list');
    expect(list).toBeTruthy();
    const items = list.querySelectorAll('.lesson-list-item');
    expect(items).toHaveLength(2);
  });

  it('should render section with headings', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Heading Section',
              expanded: true,
              content: [
                { type: 'text', value: '### Subheading' }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const contentDiv = container.querySelector('.collapsible-content');
    const heading = contentDiv.querySelector('h3');
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('Subheading');
  });

  it('should render section with mixed content', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Mixed Section',
              expanded: true,
              content: [
                { type: 'text', value: 'Some text' },
                { type: 'code', value: 'const x = 5;', language: 'javascript' },
                { type: 'text', value: '- List item' }
              ]
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const contentDiv = container.querySelector('.collapsible-content');
    expect(contentDiv.querySelector('.lesson-text')).toBeTruthy();
    expect(contentDiv.querySelector('.lesson-code')).toBeTruthy();
    expect(contentDiv.querySelector('.lesson-list')).toBeTruthy();
  });

  it('should verify backward compatibility (content without collapsible sections renders unchanged)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: 'Regular text' },
            { type: 'code', value: 'code here', language: 'javascript' }
          ]
        }
      ]
    };
    renderContent(data, container);
    expect(container.querySelector('.lesson-collapsible')).toBeFalsy();
    expect(container.querySelector('.lesson-text')).toBeTruthy();
    expect(container.querySelector('.lesson-code')).toBeTruthy();
  });

  it('should process summary title with processInlineCode (test with bold)', () => {
    const data = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: '**Bold** title',
              expanded: false,
              content: []
            }
          ]
        }
      ]
    };
    renderContent(data, container);
    const summary = container.querySelector('.lesson-collapsible-summary');
    expect(summary).toBeTruthy();
    expect(summary.innerHTML).toContain('<strong>Bold</strong>');
  });
});

