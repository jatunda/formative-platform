// Shared helper for displaying a Question in a list/picker. Questions have
// no title field of their own (see CONTEXT.md's Question entry), so every
// surface that lists them (Question Bank manager, the Question picker used
// by Lesson/Page editors and the Practice Set builder) derives the same
// short label from the stem's first text line, rather than each inventing
// its own truncation rule.
export function deriveQuestionLabel(questionData) {
  const firstTextItem = (questionData.stem || []).find((item) => item.type === 'text' && item.value.trim());
  if (!firstTextItem) return '(empty question)';
  const text = firstTextItem.value.trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}
