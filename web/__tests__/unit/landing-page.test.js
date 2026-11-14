import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

// jsdom's URL isn't Node's, so derive the folder from the file path instead.
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const page = new DOMParser().parseFromString(
  readFileSync(resolve(webDir, 'index.html'), 'utf8'),
  'text/html',
);

describe('student landing page', () => {
  it('names the tab after the site', () => {
    expect(page.title).toBe('mrhsieh.app');
  });

  it('heads the page with Do Now, before the script adds their date', () => {
    expect(page.querySelector('h1#do-nows-heading')?.textContent).toBe('Do Now');
  });

  it('says what it is loading in the same words as the heading', () => {
    expect(page.querySelector('#loading-state .loading-text')?.textContent).toBe('Loading Do Now...');
  });
});
