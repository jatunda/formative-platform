import { describe, it, expect } from 'vitest';
import { getPromptProfile, buildPrompt } from '../../ai-generator.js';

describe('ai-generator', () => {
  describe('getPromptProfile', () => {
    const table = {
      csa: {
        subject: 'Computer Science A',
        gradeLevel: 11,
        promptInstructions: 'Use AP-style wording.',
        exampleQuestions: { review: '# Example\n\nWhat is a variable?' },
      },
    };

    it('returns the exact profile when the class id is in the table, marked not a fallback', () => {
      const profile = getPromptProfile('csa', 'AP Computer Science A', table);
      expect(profile).toEqual({
        subject: 'Computer Science A',
        gradeLevel: 11,
        promptInstructions: 'Use AP-style wording.',
        exampleQuestions: { review: '# Example\n\nWhat is a variable?' },
        isFallback: false,
      });
    });

    it('infers CSA from the class name when the id is not in the table', () => {
      const profile = getPromptProfile('unknown-id', 'CSA Period 3', table);
      expect(profile).toEqual({ subject: 'Computer Science A', gradeLevel: 11, isFallback: true });
    });

    it('infers CSP from the class name', () => {
      const profile = getPromptProfile('unknown-id', 'CSP Section B', table);
      expect(profile).toEqual({ subject: 'Computer Science Principles', gradeLevel: 10, isFallback: true });
    });

    it('infers Engineering and its grade level from the class name', () => {
      const profile = getPromptProfile('unknown-id', '8th Grade Engineering', table);
      expect(profile).toEqual({ subject: 'Engineering', gradeLevel: 8, isFallback: true });
    });

    it('defaults Engineering to grade 9 when no grade number is in the name', () => {
      const profile = getPromptProfile('unknown-id', 'Engineering Club', table);
      expect(profile).toEqual({ subject: 'Engineering', gradeLevel: 9, isFallback: true });
    });

    it('falls back to a generic profile when nothing matches, and marks it a fallback', () => {
      const profile = getPromptProfile('unknown-id', 'AI Literacy', table);
      expect(profile).toEqual({ subject: 'General', gradeLevel: 9, isFallback: true });
    });
  });

  describe('buildPrompt', () => {
    const table = {
      csa: {
        subject: 'Computer Science A',
        gradeLevel: 11,
        promptInstructions: 'Use AP-style wording.',
        exampleQuestions: {
          review: '# Review Example\n\nWhat is a for loop?',
          preview: '# Preview Example\n\nWhat might "inheritance" mean?',
        },
      },
    };
    const classMetadata = { subject: 'Computer Science A', gradeLevel: 11, name: 'AP CSA' };

    it('includes the class-specific instructions and example questions when the class has a Prompt Profile', () => {
      const prompt = buildPrompt('review', 'csa', classMetadata, 'Loops', table);
      expect(prompt).toContain('Use AP-style wording.');
      expect(prompt).toContain('What is a for loop?');
      expect(prompt).not.toContain('What might "inheritance" mean?'); // the preview example, not review
    });

    it('picks the example set matching the requested question type', () => {
      const prompt = buildPrompt('preview', 'csa', classMetadata, 'Loops', table);
      expect(prompt).toContain('What might "inheritance" mean?');
    });

    it('falls back to a generic example and omits class-specific instructions when the class has no Prompt Profile', () => {
      const prompt = buildPrompt('review', 'unknown-id', classMetadata, 'Loops', table);
      expect(prompt).not.toContain('Class-Specific Instructions:');
      expect(prompt).toContain('Example Title');
    });

    it('reflects the question type in the requirements text', () => {
      const reviewPrompt = buildPrompt('review', 'unknown-id', classMetadata, 'Loops', table);
      const previewPrompt = buildPrompt('preview', 'unknown-id', classMetadata, 'Loops', table);
      expect(reviewPrompt).toContain('REVIEW questions');
      expect(previewPrompt).toContain('PREVIEW questions');
    });

    it('includes the subject, grade level, and learning objectives verbatim', () => {
      const prompt = buildPrompt('review', 'csa', classMetadata, 'Recursion and base cases', table);
      expect(prompt).toContain('Computer Science A');
      expect(prompt).toContain('Grade 11');
      expect(prompt).toContain('Recursion and base cases');
    });
  });
});
