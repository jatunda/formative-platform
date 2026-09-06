/**
 * Shared navigation bar for the teacher-facing pages (Full Schedule, Lesson
 * Planning, Content Editor). Student-facing pages (index.html, view.html)
 * do not use this. See docs/adr/0001-lesson-planning-as-separate-page.md.
 *
 * Link ids match the ids these pages' own scripts already look up to append
 * `?class=`/`?fromClass=` query params (teacher.js reads "goToEditorLink",
 * editor.js reads "backToScheduleLink"), so that existing behavior keeps
 * working unchanged.
 */

const PAGES = [
  { key: "teacher", href: "teacher.html", label: "Full Schedule", linkId: "backToScheduleLink" },
  { key: "lesson-planning", href: "lesson-planning.html", label: "Lesson Planning", linkId: "goToLessonPlanningLink" },
  { key: "editor", href: "editor.html", label: "Content Editor", linkId: "goToEditorLink" }
];

/**
 * Render the teacher nav into the given mount point.
 * @param {"teacher"|"lesson-planning"|"editor"} activeKey - Which page is currently active
 * @param {string} [mountId="teacherNav"] - Id of the element to render into
 */
export function renderTeacherNav(activeKey, mountId = "teacherNav") {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const nav = document.createElement("nav");
  nav.className = "teacher-nav";

  PAGES.forEach(page => {
    const link = document.createElement("a");
    link.href = page.href;
    link.id = page.linkId;
    link.textContent = page.label;
    link.className = "teacher-nav-link";
    if (page.key === activeKey) {
      link.classList.add("teacher-nav-link-active");
      link.setAttribute("aria-current", "page");
    }
    nav.appendChild(link);
  });

  mount.innerHTML = "";
  mount.appendChild(nav);
}
