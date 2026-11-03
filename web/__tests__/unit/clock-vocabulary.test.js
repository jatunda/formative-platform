import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

// The School Clock glossary (web/clock/CONTEXT.md) marks some words _Avoid_.
// These checks keep code and on-screen text to the glossary's terms.
const clockDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../clock');
const sources = readdirSync(clockDir)
  .filter((name) => /\.(js|css|html)$/.test(name))
  .map((name) => ({ name, text: readFileSync(resolve(clockDir, name), 'utf8') }));

/** Each line of `text` that still matches `pattern`, as "file:line: text". */
function hits(name, text, pattern) {
  return text.split('\n').flatMap((line, i) => (pattern.test(line) ? [`${name}:${i + 1}: ${line.trim()}`] : []));
}

describe('School Clock vocabulary', () => {
  it('says Bell Schedule, never "schedule" alone', () => {
    // Timing sounds is the one other meaning of "schedule" in the clock: the
    // sound engine itself, and the page's calls into it.
    const soundVocabulary = /soundPlayer\.schedule|scheduleSounds|sound schedule/g;
    const bellSchedule = /bell[\s_-]*schedul/gi;
    const found = sources
      .filter(({ name }) => name !== 'sound.js')
      .flatMap(({ name, text }) =>
        hits(name, text.replace(soundVocabulary, '').replace(bellSchedule, ''), /schedul/i));
    expect(found).toEqual([]);
  });

  it('never shortens Nutrition to "Nut"', () => {
    const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const found = sources.flatMap(({ name, text }) => hits(name, withoutComments(text), /\bNut\b/));
    expect(found).toEqual([]);
  });
});
