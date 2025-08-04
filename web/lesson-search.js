// Shared Lesson Search Module
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Cache for page titles to avoid redundant queries
const pageTitles = {}; // id → title

let db; // Database reference

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
      closeBtn.className = "popup-close-btn";

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search lessons by name...";
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
        const items = Object.entries(contentMap)
          .map(([id, data]) => ({
            id,
            title: (data.title || "(Untitled)").toString()
          }))
          .filter(item => item.title.toLowerCase().includes(filterLower) || item.id.includes(filterLower))
          .sort((a, b) => a.title.localeCompare(b.title));
          
        if (items.length === 0) {
          const noRes = document.createElement("div");
          noRes.textContent = "No results.";
          resultsDiv.appendChild(noRes);
          return;
        }
        
        for (const item of items) {
          const btn = document.createElement("button");
          btn.textContent = `${item.title} (${item.id})`;
          btn.className = "lesson-popup-result-btn";
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
