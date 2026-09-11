import { describe, it, expect, beforeEach } from 'vitest';
import { renderTeacherNav } from '../../teacher-nav.js';

describe('teacher-nav', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="teacherNav"></div>';
  });

  it('renders a link for each page', () => {
    renderTeacherNav('teacher');
    const links = document.querySelectorAll('.teacher-nav-link');
    expect(links).toHaveLength(3);
    expect([...links].map((l) => l.textContent)).toEqual(['Full Schedule', 'Lesson Planning', 'Content Editor']);
  });

  it('uses the link ids the individual pages already look up', () => {
    renderTeacherNav('teacher');
    expect(document.getElementById('backToScheduleLink')).toBeTruthy();
    expect(document.getElementById('goToLessonPlanningLink')).toBeTruthy();
    expect(document.getElementById('goToEditorLink')).toBeTruthy();
  });

  it('marks the active page and no others', () => {
    renderTeacherNav('editor');
    const active = document.querySelectorAll('.teacher-nav-link-active');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('goToEditorLink');
    expect(active[0].getAttribute('aria-current')).toBe('page');

    const inactive = document.getElementById('backToScheduleLink');
    expect(inactive.classList.contains('teacher-nav-link-active')).toBe(false);
    expect(inactive.hasAttribute('aria-current')).toBe(false);
  });

  it('links to the right href for each page', () => {
    renderTeacherNav('lesson-planning');
    expect(document.getElementById('backToScheduleLink').getAttribute('href')).toBe('teacher.html');
    expect(document.getElementById('goToLessonPlanningLink').getAttribute('href')).toBe('lesson-planning.html');
    expect(document.getElementById('goToEditorLink').getAttribute('href')).toBe('editor.html');
  });

  it('replaces previous content on re-render rather than appending', () => {
    renderTeacherNav('teacher');
    renderTeacherNav('editor');
    expect(document.querySelectorAll('.teacher-nav-link')).toHaveLength(3);
  });

  it('does nothing when the mount point is missing', () => {
    document.body.innerHTML = '';
    expect(() => renderTeacherNav('teacher')).not.toThrow();
  });

  it('supports a custom mount id', () => {
    document.body.innerHTML = '<div id="customMount"></div>';
    renderTeacherNav('teacher', 'customMount');
    expect(document.querySelector('#customMount .teacher-nav-link')).toBeTruthy();
  });
});
