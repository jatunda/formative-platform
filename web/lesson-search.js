// Shared Lesson Search Module
// Features:
// - Fuzzy search that handles typos and partial matches
// - Searches both lesson titles and IDs
// - Supports abbreviations and acronyms
// - Visual match quality indicators (green=exact, yellow=good, gray=weak)
// - Results sorted by relevance score
import { ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Cache for page titles to avoid redundant queries
const pageTitles = {}; // id → title

let db; // Database reference

// Fuzzy search scoring function
function fuzzyScore(text, query) {
  if (!query) return 1; // Empty query matches everything with high score
  if (!text) return 0; // Empty text never matches
  
  // Exact match gets highest score
  if (text === query) return 1000;
  
  // Case-insensitive exact match
  if (text.toLowerCase() === query.toLowerCase()) return 900;
  
  // Substring match gets high score
  if (text.includes(query)) return 800;
  
  // Calculate fuzzy match score
  let score = 0;
  let textIndex = 0;
  let queryIndex = 0;
  let consecutiveMatches = 0;
  let matchStart = -1;
  
  while (queryIndex < query.length && textIndex < text.length) {
    if (text[textIndex] === query[queryIndex]) {
      if (matchStart === -1) matchStart = textIndex;
      consecutiveMatches++;
      queryIndex++;
      score += 10 + consecutiveMatches; // Bonus for consecutive matches
    } else {
      consecutiveMatches = 0;
    }
    textIndex++;
  }
  
  // All query characters must be found
  if (queryIndex < query.length) return 0;
  
  // Bonus for matches at the beginning
  if (matchStart === 0) score += 50;
  
  // Bonus for word boundary matches
  const words = text.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(query)) {
      score += 100;
      break;
    }
  }
  
  // Bonus for acronym matches (first letters of words)
  const acronym = words.map(word => word[0]).join('').toLowerCase();
  if (acronym.includes(query)) {
    score += 75;
  }
  
  // Penalty for length difference
  const lengthDiff = Math.abs(text.length - query.length);
  score -= lengthDiff * 2;
  
  return Math.max(0, score);
}

// Initialize the module with database reference
export function initializeLessonSearch(database) {
  db = database;
}

// Create and show the lesson search popup
export function showLessonSearchPopup({ onSelect }) {
  (async () => {
    if (!db) {
      console.error("Database not initialized in lesson search module");
      alert("Database error. Please try again.");
      return;
    }

    try {
      // OPTIMIZATION: First get shallow list of IDs to minimize data transfer
      const shallowSnap = await get(ref(db, "content"));
      if (!shallowSnap.exists()) {
        alert("No lessons found.");
        return;
      }
      
      const allIds = Object.keys(shallowSnap.val());
      
      // OPTIMIZATION: Batch fetch only titles for existing lessons
      const titlePromises = allIds.map(async (id) => {
        // Check cache first
        if (pageTitles[id]) {
          return { id, title: pageTitles[id] };
        }
        
        const titleSnap = await get(ref(db, `content/${id}/title`));
        const title = titleSnap.exists() ? titleSnap.val() : "(Untitled)";
        pageTitles[id] = title; // Cache it
        return { id, title };
      });
      
      const titleResults = await Promise.all(titlePromises);
      const contentMap = {};
      titleResults.forEach(({ id, title }) => {
        contentMap[id] = { title };
      });
      
      console.log(`Loaded ${Object.keys(contentMap).length} lesson titles`);
      
      // Create popup
      const popup = document.createElement("div");
      popup.className = "lesson-popup";

      const box = document.createElement("div");
      box.className = "lesson-popup-box";

      const closeBtn = createCloseButton(popup);
      closeBtn.className = "schedule-action-btn popup-close-btn";

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Fuzzy search lessons (try abbreviations, partial words, typos)...";
      searchInput.className = "lesson-popup-search";
      searchInput.style.width = "400px"; // Fixed width to prevent resizing
      searchInput.style.boxSizing = "border-box"; // Include padding/border in width

      const resultsDiv = document.createElement("div");
      resultsDiv.className = "lesson-popup-results";
      resultsDiv.style.height = "300px"; // Fixed height to prevent resizing
      resultsDiv.style.overflowY = "auto"; // Enable scrolling when needed

      function renderResults(filter) {
        resultsDiv.innerHTML = "";
        const filterLower = filter.trim().toLowerCase();
        const allItems = Object.entries(contentMap)
          .map(([id, data]) => ({
            id,
            title: (data.title || "(Untitled)").toString()
          }))
          .map(item => {
            const titleScore = fuzzyScore(item.title.toLowerCase(), filterLower);
            const idScore = fuzzyScore(item.id.toLowerCase(), filterLower);
            return {
              ...item,
              score: Math.max(titleScore, idScore)
            };
          })
          .filter(item => item.score > 0)
          .sort((a, b) => {
            // Sort by score descending, then by title ascending
            if (b.score !== a.score) return b.score - a.score;
            return a.title.localeCompare(b.title);
          });
          
        const items = allItems.slice(0, 50); // Limit to top 50 results for performance
          
        if (items.length === 0) {
          const noRes = document.createElement("div");
          noRes.textContent = filter.trim() ? "No fuzzy matches found. Try different keywords or abbreviations." : "No results.";
          noRes.style.padding = "10px";
          noRes.style.color = "#a0aec0";
          noRes.style.fontStyle = "italic";
          resultsDiv.appendChild(noRes);
          return;
        }
        
        // Show results count if there are many matches
        if (allItems.length > 50) {
          const countDiv = document.createElement("div");
          countDiv.textContent = `Showing top 50 of ${allItems.length} matches`;
          countDiv.style.padding = "8px";
          countDiv.style.fontSize = "0.9em";
          countDiv.style.color = "#90cdf4";
          countDiv.style.borderBottom = "1px solid #4a5568";
          countDiv.style.marginBottom = "4px";
          resultsDiv.appendChild(countDiv);
        }
        
        for (const item of items) {
          const btn = document.createElement("button");
          btn.textContent = item.title;
          btn.className = "schedule-action-btn lesson-popup-result-btn";
          
          // Add visual indicator for match quality
          if (item.score >= 800) {
            btn.style.borderLeft = "4px solid #10b981"; // Green for exact/substring matches
          } else if (item.score >= 100) {
            btn.style.borderLeft = "4px solid #f59e0b"; // Yellow for good fuzzy matches
          } else {
            btn.style.borderLeft = "4px solid #6b7280"; // Gray for weak matches
          }
          
          btn.onclick = async () => {
            document.body.removeChild(popup);
            onSelect(item.id);
          };
          resultsDiv.appendChild(btn);
        }
      }

      searchInput.oninput = () => renderResults(searchInput.value);
      renderResults("");

      box.appendChild(closeBtn);
      box.appendChild(searchInput);
      box.appendChild(resultsDiv);
      popup.appendChild(box);
      document.body.appendChild(popup);
      
      // Focus the search input
      setTimeout(() => searchInput.focus(), 100);
      
    } catch (error) {
      console.error("Error loading lessons:", error);
      alert("Error loading lessons. Please try again.");
      return;
    }
  })();
}

// Helper function to create close button
function createCloseButton(popup) {
  const btn = document.createElement("button");
  btn.textContent = "Close";
  btn.className = "schedule-action-btn";
  btn.onclick = () => document.body.removeChild(popup);
  return btn;
}

// Export the cache for use by other modules if needed
export function getCachedTitle(id) {
  return pageTitles[id];
}

// Clear cache if needed
export function clearTitleCache() {
  Object.keys(pageTitles).forEach(key => delete pageTitles[key]);
}
