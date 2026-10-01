// Modal picker for adding a Question to a Practice Set - mirrors
// page-link-picker.js's popup shape and CSS classes, but filterable by Class
// and topic (not just a title substring), since the Question Bank is
// expected to be organized by those tags from the start (see CONTEXT.md's
// Question entry).
import { getAllQuestions } from './question-database-utils.js';
import { getClasses } from './database-utils.js';
import { deriveQuestionLabel } from './question-label.js';

/**
 * Show a popup listing every Question, filterable by Class and topic.
 * Selecting one calls onSelect with {questionId, label}.
 * @param {{onSelect: (result: {questionId: string, label: string}) => void}} options
 */
export function showQuestionPicker({ onSelect }) {
  (async () => {
    try {
      const [allQuestions, classes] = await Promise.all([getAllQuestions(), getClasses()]);

      const questions = Object.entries(allQuestions || {}).map(([questionId, data]) => ({
        questionId,
        label: deriveQuestionLabel(data),
        classId: data.classId || null,
        topic: data.topic || '',
      }));

      if (questions.length === 0) {
        alert('No questions found - add some in the Question Bank first.');
        return;
      }

      const popup = document.createElement('div');
      popup.className = 'lesson-popup';

      const box = document.createElement('div');
      box.className = 'lesson-popup-box';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.className = 'schedule-action-btn popup-close-btn';
      closeBtn.onclick = () => document.body.removeChild(popup);

      const classSelect = document.createElement('select');
      const allClassesOption = document.createElement('option');
      allClassesOption.value = '';
      allClassesOption.textContent = 'All classes';
      classSelect.appendChild(allClassesOption);
      Object.entries(classes || {})
        .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''))
        .forEach(([classId, classData]) => {
          const option = document.createElement('option');
          option.value = classId;
          option.textContent = classData.name;
          classSelect.appendChild(option);
        });

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search by topic or question text...';
      searchInput.className = 'lesson-popup-search';

      const resultsDiv = document.createElement('div');
      resultsDiv.className = 'lesson-popup-results';

      function renderResults() {
        resultsDiv.innerHTML = '';
        const classId = classSelect.value;
        const filterLower = searchInput.value.trim().toLowerCase();
        const matches = questions.filter((question) => {
          if (classId && question.classId !== classId) return false;
          if (filterLower && !question.label.toLowerCase().includes(filterLower) && !question.topic.toLowerCase().includes(filterLower)) return false;
          return true;
        });

        if (matches.length === 0) {
          const noRes = document.createElement('div');
          noRes.textContent = 'No matching questions.';
          resultsDiv.appendChild(noRes);
          return;
        }

        for (const question of matches) {
          const btn = document.createElement('button');
          btn.textContent = question.topic ? `${question.label} (${question.topic})` : question.label;
          btn.className = 'schedule-action-btn lesson-popup-result-btn';
          btn.onclick = () => {
            document.body.removeChild(popup);
            onSelect({ questionId: question.questionId, label: question.label });
          };
          resultsDiv.appendChild(btn);
        }
      }

      classSelect.onchange = renderResults;
      searchInput.oninput = renderResults;
      renderResults();

      box.appendChild(closeBtn);
      box.appendChild(classSelect);
      box.appendChild(searchInput);
      box.appendChild(resultsDiv);
      popup.appendChild(box);
      document.body.appendChild(popup);

      setTimeout(() => searchInput.focus(), 100);
    } catch (error) {
      console.error('Error loading questions:', error);
      alert('Error loading questions. Please try again.');
    }
  })();
}
