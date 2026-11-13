import { describe, it, expect } from 'vitest';
import { renderContent } from '../../content-renderer.js';
import { parseDSL, generateDSLFromContent } from '../../dsl.js';

/** Render DSL the way the editor preview does: parse, then render. */
function render(dsl) {
  const container = document.createElement('div');
  renderContent(parseDSL(dsl), container);
  return container;
}

describe('blockquotes', () => {
  it('turns consecutive > lines into one blockquote', () => {
    const container = render('> First line\n> Second line');
    const quotes = container.querySelectorAll('blockquote.lesson-blockquote');
    expect(quotes).toHaveLength(1);
    const paragraphs = [...quotes[0].querySelectorAll('p.lesson-text')].map((p) => p.textContent);
    expect(paragraphs).toEqual(['First line', 'Second line']);
  });
});

describe('callouts', () => {
  it('turns > [!tip] Title into a tip callout with that title', () => {
    const container = render('> [!tip] Try this\n> Start small.');
    const callout = container.querySelector('.lesson-callout');
    expect(callout.classList.contains('lesson-callout-tip')).toBe(true);
    expect(callout.querySelector('.lesson-callout-title').textContent).toContain('Try this');
    expect(callout.querySelector('.lesson-callout-content p.lesson-text').textContent).toBe('Start small.');
    expect(container.querySelector('blockquote')).toBeNull();
  });
});

describe('callout types and titles', () => {
  it.each(['note', 'tip', 'warning', 'danger', 'question', 'example'])('draws a %s callout with its own class and icon', (type) => {
    const callout = render(`> [!${type}]\n> Body`).querySelector('.lesson-callout');
    expect(callout.classList.contains(`lesson-callout-${type}`)).toBe(true);
    expect(callout.querySelector('.lesson-callout-icon').textContent).not.toBe('');
  });

  it('gives each type a different icon', () => {
    const icons = ['note', 'tip', 'warning', 'danger', 'question', 'example']
      .map((type) => render(`> [!${type}]`).querySelector('.lesson-callout-icon').textContent);
    expect(new Set(icons).size).toBe(6);
  });

  it('defaults the title to the type name', () => {
    const title = render('> [!warning]\n> Hot surface.').querySelector('.lesson-callout-title-text');
    expect(title.textContent).toBe('Warning');
  });

  it('reads the type case-insensitively', () => {
    const callout = render('> [!TIP] Hint').querySelector('.lesson-callout');
    expect(callout.classList.contains('lesson-callout-tip')).toBe(true);
  });

  it('draws an unknown type as a note, titled with the typed name', () => {
    const callout = render('> [!banana]\n> Body').querySelector('.lesson-callout');
    expect(callout.classList.contains('lesson-callout-note')).toBe(true);
    expect(callout.querySelector('.lesson-callout-title-text').textContent).toBe('Banana');
  });

  it('applies inline formatting in the title', () => {
    const title = render('> [!note] A **bold** idea').querySelector('.lesson-callout-title-text');
    expect(title.querySelector('strong').textContent).toBe('bold');
  });
});

describe('content inside quotes and callouts', () => {
  it('renders inline formatting and lists inside a blockquote', () => {
    const quote = render('> Some *emphasis* and `code`\n> - one\n> - two').querySelector('blockquote');
    expect(quote.querySelector('em').textContent).toBe('emphasis');
    expect(quote.querySelector('code').textContent).toBe('code');
    expect([...quote.querySelectorAll('ul li')].map((li) => li.textContent)).toEqual(['one', 'two']);
  });

  it('renders numbered lists inside a callout', () => {
    const content = render('> [!example] Steps\n> 1. First\n> 2. Second').querySelector('.lesson-callout-content');
    expect([...content.querySelectorAll('ol li')].map((li) => li.textContent)).toEqual(['First', 'Second']);
  });

  it('leaves code fences and collapsible markers inside a quote as literal text', () => {
    const quote = render('> ```\n> >>> Not a section\n> <<<\n> ```').querySelector('blockquote');
    expect(quote.querySelector('pre')).toBeNull();
    expect(quote.querySelector('details')).toBeNull();
    expect([...quote.querySelectorAll('p')].map((p) => p.textContent)).toEqual(['```', '>>> Not a section', '<<<', '```']);
  });

  it('nests a >> line as a quote inside the quote', () => {
    const outer = render('> Outer\n>> Inner').querySelector('blockquote');
    expect(outer.querySelector('blockquote').textContent).toBe('Inner');
  });
});

describe('where quotes start and end', () => {
  it('ends a quote at the first line without >', () => {
    const container = render('> Quoted\nNot quoted');
    expect(container.querySelector('blockquote').textContent).toBe('Quoted');
    expect(container.querySelector(':scope > p.lesson-text').textContent).toBe('Not quoted');
  });

  it('starts a new callout at each [!type] line', () => {
    const container = render('> Plain quote\n> [!tip] One\n> Body one\n> [!danger] Two');
    expect(container.querySelectorAll('blockquote')).toHaveLength(1);
    expect([...container.querySelectorAll('.lesson-callout')].map((c) => c.className))
      .toEqual(['lesson-callout lesson-callout-tip', 'lesson-callout lesson-callout-danger']);
  });

  it('ends an open list before a quote', () => {
    const container = render('- item\n> quote\n- after');
    expect(container.querySelectorAll(':scope > ul')).toHaveLength(2);
  });

  it('works inside a collapsible', () => {
    const container = render('>>> Section\n> [!tip] Inside\n<<<');
    expect(container.querySelector('details .lesson-callout-tip')).not.toBeNull();
  });

  it('still treats >>>, >>>! and <<< as collapsibles', () => {
    const container = render('>>> Closed\nA\n<<<\n>>>! Open\nB\n<<<');
    const details = container.querySelectorAll('details.lesson-collapsible');
    expect(details).toHaveLength(2);
    expect(details[0].hasAttribute('open')).toBe(false);
    expect(details[1].hasAttribute('open')).toBe(true);
    expect(container.querySelector('blockquote')).toBeNull();
  });

  it('keeps > lines inside a code block literal', () => {
    const container = render('```\n> not a quote\n```');
    expect(container.querySelector('blockquote')).toBeNull();
    expect(container.querySelector('pre code').textContent).toBe('> not a quote');
  });
});

describe('round-trip', () => {
  it('keeps blockquotes and callouts through parse then generate', () => {
    const dsl = '# Lesson\n\n> A quote\n> - with a list\n> [!warning] Careful\n> Hot.\nAfter\n\n---\n>>> More\n> [!tip]\n<<<';
    const generated = generateDSLFromContent(parseDSL(dsl));
    expect(generated).toContain('> A quote\n> - with a list\n> [!warning] Careful\n> Hot.\nAfter');
    expect(generated).toContain('>>> More\n> [!tip]\n<<<');
    expect(parseDSL(generated)).toEqual(parseDSL(dsl));
  });
});

describe('headings inside quotes', () => {
  it('gives a heading inside a quote an id that Section Links reach, without shifting later ids', () => {
    const container = render('> ## Inside\n## After\n[[#Inside]] [[#After]]');
    expect(container.querySelector('blockquote h2').id).toBe('inside');
    expect(container.querySelector(':scope > h2').id).toBe('after');
    expect(container.querySelector('a[href="#inside"]')).not.toBeNull();
  });
});
